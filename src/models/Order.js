const { promisePool } = require('./db');

class Order {
  // Generate unique order number
  static generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random}`;
  }

  // Create a new order
  static async create(orderData) {
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
    
    const order_number = this.generateOrderNumber();
    
    const connection = await promisePool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Insert order
      const orderSql = `
        INSERT INTO orders 
        (order_number, customer_id, status, subtotal, tax_amount, shipping_amount, 
         total_amount, payment_method, shipping_address, billing_address, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const [orderResult] = await connection.execute(orderSql, [
        order_number, customer_id, status, subtotal, tax_amount, shipping_amount,
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
  }

  // Find order by ID
  static async findById(id) {
    const sql = `
      SELECT o.*, 
             c.first_name, c.last_name, c.email, c.phone,
             COUNT(oi.id) as item_count,
             SUM(oi.total_price) as items_total
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ?
      GROUP BY o.id
    `;
    
    try {
      const [rows] = await promisePool.execute(sql, [id]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding order by ID: ${error.message}`);
    }
  }

  // Find order by order number
  static async findByOrderNumber(orderNumber) {
    const sql = `
      SELECT o.*, 
             c.first_name, c.last_name, c.email, c.phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.order_number = ?
    `;
    
    try {
      const [rows] = await promisePool.execute(sql, [orderNumber]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding order by order number: ${error.message}`);
    }
  }

  // Update order status
  static async updateStatus(id, status) {
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    
    const sql = 'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    try {
      const [result] = await promisePool.execute(sql, [status, id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating order status: ${error.message}`);
    }
  }

  // Update order
  static async update(id, orderData) {
    const {
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
    
    const sql = `
      UPDATE orders 
      SET status = ?, subtotal = ?, tax_amount = ?, shipping_amount = ?, 
          total_amount = ?, payment_method = ?, shipping_address = ?, 
          billing_address = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    try {
      const [result] = await promisePool.execute(sql, [
        status, subtotal, tax_amount, shipping_amount, total_amount,
        payment_method, shipping_address, billing_address, notes, id
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating order: ${error.message}`);
    }
  }

  // Delete order
  static async delete(id) {
    const connection = await promisePool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get order items to restore stock
      const itemsSql = 'SELECT product_id, quantity FROM order_items WHERE order_id = ?';
      const [items] = await connection.execute(itemsSql, [id]);
      
      // Restore stock for each product
      for (const item of items) {
        const restoreStockSql = 'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?';
        await connection.execute(restoreStockSql, [item.quantity, item.product_id]);
      }
      
      // Delete order items
      const deleteItemsSql = 'DELETE FROM order_items WHERE order_id = ?';
      await connection.execute(deleteItemsSql, [id]);
      
      // Delete order
      const deleteOrderSql = 'DELETE FROM orders WHERE id = ?';
      const [result] = await connection.execute(deleteOrderSql, [id]);
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw new Error(`Error deleting order: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  // Get all orders with pagination and filters
  static async findAll({
    page = 1,
    limit = 10,
    customerId = null,
    status = null,
    startDate = null,
    endDate = null,
    search = ''
  } = {}) {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT o.*, 
             c.first_name, c.last_name, c.email,
             COUNT(oi.id) as item_count,
             SUM(oi.total_price) as items_total
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (customerId) {
      sql += ' AND o.customer_id = ?';
      params.push(customerId);
    }
    
    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    
    if (startDate) {
      sql += ' AND o.created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      sql += ' AND o.created_at <= ?';
      params.push(endDate);
    }
    
    if (search) {
      sql += ' AND (o.order_number LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    sql += ' GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    try {
      const [rows] = await promisePool.execute(sql, params);
      return rows;
    } catch (error) {
      throw new Error(`Error finding all orders: ${error.message}`);
    }
  }

  // Count orders with filters
  static async count({
    customerId = null,
    status = null,
    startDate = null,
    endDate = null,
    search = ''
  } = {}) {
    let sql = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (customerId) {
      sql += ' AND o.customer_id = ?';
      params.push(customerId);
    }
    
    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    
    if (startDate) {
      sql += ' AND o.created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      sql += ' AND o.created_at <= ?';
      params.push(endDate);
    }
    
    if (search) {
      sql += ' AND (o.order_number LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    try {
      const [rows] = await promisePool.execute(sql, params);
      return rows[0].total;
    } catch (error) {
      throw new Error(`Error counting orders: ${error.message}`);
    }
  }

  // Get order items
  static async getItems(orderId) {
    const sql = `
      SELECT oi.*, p.name as product_name, p.sku, p.image_url
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.id
    `;
    
    try {
      const [rows] = await promisePool.execute(sql, [orderId]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting order items: ${error.message}`);
    }
  }

  // Get order with items
  static async getWithItems(id) {
    const order = await this.findById(id);
    if (!order) return null;
    
    const items = await this.getItems(id);
    order.items = items;
    
    return order;
  }

  // Get order statistics
  static async getStatistics(startDate = null, endDate = null) {
    let sql = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value,
        COUNT(DISTINCT customer_id) as unique_customers,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_orders,
        SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped_orders,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
      FROM orders
      WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(endDate);
    }
    
    try {
      const [rows] = await promisePool.execute(sql, params);
      return rows[0];
    } catch (error) {
      throw new Error(`Error getting order statistics: ${error.message}`);
    }
  }

  // Get revenue by period
  static async getRevenueByPeriod(period = 'day', limit = 30) {
    let dateFormat;
    
    switch (period) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%u';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }
    
    const sql = `
      SELECT 
        DATE_FORMAT(created_at, ?) as period,
        COUNT(*) as order_count,
        SUM(total_amount) as revenue
      FROM orders
      WHERE status IN ('delivered', 'shipped', 'processing')
      GROUP BY period
      ORDER BY period DESC
      LIMIT ?
    `;
    
    try {
      const [rows] = await promisePool.execute(sql, [dateFormat, limit]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting revenue by period: ${error.message}`);
    }
  }
}

module.exports = Order;