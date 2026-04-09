import { promisePool } from './db.js';

// Order factory function - returns an object with all order methods
const createOrderModel = () => {
  // Generate unique order number
  const generateOrderNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random}`;
  };

  // Create a new order
  const create = async (orderData) => {
    const {
      customer_id,
      status = 'pending',
      subtotal,
      tax_amount = 0,
      shipping_amount = 0,
      total_amount,
      payment_method = null,
      shipping_address,
      billing_address,
      notes = null,
      items = []
    } = orderData;
    
    const order_number = generateOrderNumber();
    
    const connection = await promisePool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Insert order
      const orderSql = `
        INSERT INTO orders 
        (order_number, customer_id, status, subtotal, discount_amount, tax_amount, shipping_amount, 
         total_amount, payment_method, shipping_address, billing_address, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const [orderResult] = await connection.execute(orderSql, [
        order_number, customer_id, status, subtotal, orderData.discount_amount || 0, tax_amount, shipping_amount,
        total_amount, payment_method, shipping_address, billing_address, notes
      ]);
      
      const orderId = orderResult.insertId;
      
      // Insert order items
      if (items.length > 0) {
        for (const item of items) {
          const itemSql = `
            INSERT INTO order_items 
            (order_id, product_id, quantity, unit_price, total_price)
            VALUES (?, ?, ?, ?, ?)
          `;
          
          await connection.execute(itemSql, [
            orderId, item.product_id, item.quantity, item.unit_price, item.total_price
          ]);
          
          // Update product stock
          const updateStockSql = 'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?';
          await connection.execute(updateStockSql, [item.quantity, item.product_id]);
        }
      }
      
      await connection.commit();
      
      return {
        id: orderId,
        order_number,
        customer_id,
        status,
        subtotal,
        tax_amount,
        shipping_amount,
        total_amount,
        items
      };
    } catch (error) {
      await connection.rollback();
      throw new Error(`Error creating order: ${error.message}`);
    } finally {
      connection.release();
    }
  };

  // Find order by ID
  const findById = async (id) => {
    const sql = `
      SELECT o.*, 
             c.first_name, c.last_name, c.email, c.phone,
             COUNT(oi.id) as item_count,
             SUM(oi.total_price) as items_total,
             cp.code as coupon_code
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN order_coupons oc ON o.id = oc.order_id
      LEFT JOIN coupons cp ON oc.coupon_id = cp.id
      WHERE o.id = ?
      GROUP BY o.id
    `;
    
    try {
      const [rows] = await promisePool.execute(sql, [id]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding order by ID: ${error.message}`);
    }
  };

  // Find order by order number
  const findByOrderNumber = async (orderNumber) => {
    const sql = `
      SELECT o.*, 
             c.first_name, c.last_name, c.email, c.phone,
             cp.code as coupon_code
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN order_coupons oc ON o.id = oc.order_id
      LEFT JOIN coupons cp ON oc.coupon_id = cp.id
      WHERE o.order_number = ?
    `;
    
    try {
      const [rows] = await promisePool.execute(sql, [orderNumber]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding order by order number: ${error.message}`);
    }
  };

  // Helper to adjust stock based on status changes
  const adjustStockForStatusChange = async (connection, orderId, oldStatus, newStatus) => {
    const stockReducedStatuses = ['pending', 'processing', 'shipped', 'delivered'];
    const wasReduced = stockReducedStatuses.includes(oldStatus);
    const isReduced = stockReducedStatuses.includes(newStatus);

    if (wasReduced && !isReduced) {
      // Return stock (e.g., pending -> cancelled)
      const [items] = await connection.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
      for (const item of items) {
        await connection.execute('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
    } else if (!wasReduced && isReduced) {
      // Reduce stock again (e.g., cancelled -> pending)
      const [items] = await connection.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
      for (const item of items) {
        await connection.execute('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity, item.product_id]);
      }
    }
  };

  // Update order status
  const updateStatus = async (id, status) => {
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    
    const connection = await promisePool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get current status
      const [currentOrder] = await connection.execute('SELECT status FROM orders WHERE id = ?', [id]);
      if (!currentOrder[0]) {
        throw new Error('Order not found');
      }

      const oldStatus = currentOrder[0].status;

      if (oldStatus !== status) {
        // Update the status
        const updateSql = 'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        await connection.execute(updateSql, [status, id]);

        // Adjust stock based on status change
        await adjustStockForStatusChange(connection, id, oldStatus, status);
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw new Error(`Error updating order status: ${error.message}`);
    } finally {
      connection.release();
    }
  };

  // Cancel expired pending orders (e.g., older than 30 minutes)
  const cancelExpiredPendingOrders = async (minutesThreshold = 30) => {
    const sql = `
      SELECT id FROM orders 
      WHERE status = 'pending' 
      AND created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)
    `;
    
    try {
      const [expiredOrders] = await promisePool.execute(sql, [minutesThreshold]);
      
      const results = {
        processed: 0,
        success: 0,
        failed: 0
      };

      for (const order of expiredOrders) {
        results.processed++;
        try {
          await updateStatus(order.id, 'cancelled');
          results.success++;
        } catch (error) {
          console.error(`Failed to auto-cancel order ${order.id}:`, error.message);
          results.failed++;
        }
      }
      
      return results;
    } catch (error) {
      throw new Error(`Error cancelling expired orders: ${error.message}`);
    }
  };

  // Update order
  const update = async (id, orderData) => {
    const {
      customer_id,
      status,
      subtotal,
      tax_amount,
      shipping_amount,
      total_amount,
      payment_method,
      shipping_address,
      billing_address,
      notes
    } = orderData;
    
    const connection = await promisePool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get current status to check for changes
      const [currentOrder] = await connection.execute('SELECT status FROM orders WHERE id = ?', [id]);
      if (!currentOrder[0]) {
        throw new Error('Order not found');
      }
      const oldStatus = currentOrder[0].status;

      const sql = `
        UPDATE orders 
        SET customer_id = ?, status = ?, subtotal = ?, discount_amount = ?, tax_amount = ?, shipping_amount = ?,
            total_amount = ?, payment_method = ?, shipping_address = ?, billing_address = ?,
            notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const [result] = await connection.execute(sql, [
        customer_id, status, subtotal, orderData.discount_amount || 0, tax_amount, shipping_amount,
        total_amount, payment_method, shipping_address, billing_address, notes, id
      ]);

      // If status changed, adjust stock
      if (status && status !== oldStatus) {
        await adjustStockForStatusChange(connection, id, oldStatus, status);
      }

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw new Error(`Error updating order: ${error.message}`);
    } finally {
      connection.release();
    }
  };

  // Delete order
  const deleteOrder = async (id) => {
    const sql = 'DELETE FROM orders WHERE id = ?';
    
    try {
      const [result] = await promisePool.execute(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting order: ${error.message}`);
    }
  };

  // Get all orders with pagination and filters
  const findAll = async ({
    page = 1,
    limit = 10,
    status = null,
    customerId = null,
    startDate = null,
    endDate = null,
    search = ''
  } = {}) => {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT o.*, 
             c.first_name, c.last_name, c.email,
             COUNT(oi.id) as item_count,
             SUM(oi.total_price) as items_total,
             cp.code as coupon_code
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN order_coupons oc ON o.id = oc.order_id
      LEFT JOIN coupons cp ON oc.coupon_id = cp.id
    `;
    
    const params = [];
    const whereConditions = [];
    
    if (status) {
      whereConditions.push('o.status = ?');
      params.push(status);
    }
    
    if (customerId) {
      whereConditions.push('o.customer_id = ?');
      params.push(customerId);
    }
    
    if (startDate) {
      whereConditions.push('o.created_at >= ?');
      params.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push('o.created_at <= ?');
      params.push(endDate);
    }
    
    if (search) {
      whereConditions.push('(o.order_number LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    sql += ' GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    try {
      const [rows] = await promisePool.query(sql, params);
      return rows;
    } catch (error) {
      throw new Error(`Error finding all orders: ${error.message}`);
    }
  };

  // Count orders with filters
  const count = async ({
    status = null,
    customerId = null,
    startDate = null,
    endDate = null
  } = {}) => {
    let sql = 'SELECT COUNT(*) as total FROM orders';
    const params = [];
    const whereConditions = [];
    
    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
    }
    
    if (customerId) {
      whereConditions.push('customer_id = ?');
      params.push(customerId);
    }
    
    if (startDate) {
      whereConditions.push('created_at >= ?');
      params.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push('created_at <= ?');
      params.push(endDate);
    }
    
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    try {
      const [rows] = await promisePool.execute(sql, params);
      return rows[0].total;
    } catch (error) {
      throw new Error(`Error counting orders: ${error.message}`);
    }
  };

  // Get order items
  const getItems = async (orderId) => {
    const sql = `
      SELECT oi.*, p.name as product_name, p.image_url as product_image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `;
    
    try {
      const [rows] = await promisePool.execute(sql, [orderId]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting order items: ${error.message}`);
    }
  };

  // Get order with all items
  const getWithItems = async (id) => {
    try {
      const order = await findById(id);
      if (!order) return null;
      const items = await getItems(id);
      return { ...order, items };
    } catch (error) {
      throw new Error(`Error getting order with items: ${error.message}`);
    }
  };

  // Get order statistics
  const getStatistics = async (period = 'month', startDate = null, endDate = null) => {
    let dateFormat, interval;
    
    switch (period) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        interval = '1 DAY';
        break;
      case 'week':
        dateFormat = '%Y-%u';
        interval = '1 WEEK';
        break;
      case 'month':
      default:
        dateFormat = '%Y-%m';
        interval = '1 MONTH';
        break;
      case 'year':
        dateFormat = '%Y';
        interval = '1 YEAR';
        break;
    }
    
    let sql = `
      SELECT 
        COUNT(*) as total_orders,
        IFNULL(SUM(total_amount), 0) as total_revenue,
        IFNULL(AVG(total_amount), 0) as avg_order_value,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_orders,
        SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped_orders
      FROM orders
    `;
    
    const params = [];
    const whereConditions = [];

    if (startDate && endDate) {
      whereConditions.push('created_at BETWEEN ? AND ?');
      params.push(startDate, endDate);
    } else if (startDate) {
      whereConditions.push('created_at >= ?');
      params.push(startDate);
    } else if (endDate) {
      whereConditions.push('created_at <= ?');
      params.push(endDate);
    } else if (period) {
      whereConditions.push(`created_at >= DATE_SUB(NOW(), INTERVAL ${interval})`);
    }

    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    try {
      const [rows] = await promisePool.query(sql, params);
      return rows[0];
    } catch (error) {
      throw new Error(`Error getting order statistics: ${error.message}`);
    }
  };

  // Get revenue by period
  const getRevenueByPeriod = async (period = 'month', limit = 12) => {
    let dateFormat;
    
    switch (period) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%u';
        break;
      case 'month':
      default:
        dateFormat = '%Y-%m';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
    }
    
    const sql = `
      SELECT 
        DATE_FORMAT(created_at, ?) as period,
        COUNT(*) as order_count,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value
      FROM orders
      WHERE status IN ('delivered', 'shipped', 'processing')
      GROUP BY period
      ORDER BY period DESC
      LIMIT ?
    `;
    
    try {
      const [rows] = await promisePool.query(sql, [dateFormat, limit]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting revenue by period: ${error.message}`);
    }
  };

  // Return all methods as an object
  return {
    generateOrderNumber,
    create,
    findById,
    findByOrderNumber,
    updateStatus,
    update,
    delete: deleteOrder,
    findAll,
    count,
    getItems,
    getWithItems,
    getStatistics,
    getRevenueByPeriod,
    cancelExpiredPendingOrders
  };
};

// Create and export the order model
const Order = createOrderModel();
export default Order;