import { promisePool } from './db.js';

// OrderItem factory function - returns an object with all order item methods
const createOrderItemModel = () => {
  // Create a new order item
  const create = async (orderItemData) => {
    const {
      order_id,
      product_id,
      quantity,
      unit_price,
      total_price
    } = orderItemData;
    
    const sql = `
      INSERT INTO order_items 
      (order_id, product_id, quantity, unit_price, total_price)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    try {
      const [result] = await promisePool.execute(sql, [
        order_id, product_id, quantity, unit_price, total_price
      ]);
      return { id: result.insertId, ...orderItemData };
    } catch (error) {
      throw new Error(`Error creating order item: ${error.message}`);
    }
  };

  // Find order item by ID
  const findById = async (id) => {
    const sql = `
      SELECT oi.*, p.name as product_name, p.sku, p.image_url
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.id = ?
    `;
    
    try {
      const [rows] = await promisePool.execute(sql, [id]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding order item by ID: ${error.message}`);
    }
  };

  // Update order item
  const update = async (id, orderItemData) => {
    const {
      quantity,
      unit_price,
      total_price
    } = orderItemData;
    
    const sql = `
      UPDATE order_items 
      SET quantity = ?, unit_price = ?, total_price = ?
      WHERE id = ?
    `;
    
    try {
      const [result] = await promisePool.execute(sql, [
        quantity, unit_price, total_price, id
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating order item: ${error.message}`);
    }
  };

  // Delete order item
  const deleteOrderItem = async (id) => {
    const sql = 'DELETE FROM order_items WHERE id = ?';
    
    try {
      const [result] = await promisePool.execute(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting order item: ${error.message}`);
    }
  };

  // Get all order items for an order
  const findByOrderId = async (orderId) => {
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
      throw new Error(`Error finding order items by order ID: ${error.message}`);
    }
  };

  // Get order item by order and product
  const findByOrderAndProduct = async (orderId, productId) => {
    const sql = 'SELECT * FROM order_items WHERE order_id = ? AND product_id = ?';
    
    try {
      const [rows] = await promisePool.execute(sql, [orderId, productId]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding order item by order and product: ${error.message}`);
    }
  };

  // Calculate item total
  const calculateTotal = (quantity, unitPrice) => {
    return quantity * unitPrice;
  };

  // Validate item stock
  const validateStock = async (productId, quantity) => {
    const sql = 'SELECT stock_quantity FROM products WHERE id = ? AND active = TRUE';
    
    try {
      const [rows] = await promisePool.execute(sql, [productId]);
      
      if (rows.length === 0) {
        return { valid: false, message: 'Product not found or inactive' };
      }
      
      const availableStock = rows[0].stock_quantity;
      
      if (availableStock < quantity) {
        return { 
          valid: false, 
          message: `Insufficient stock. Available: ${availableStock}, Requested: ${quantity}` 
        };
      }
      
      return { valid: true, availableStock };
    } catch (error) {
      throw new Error(`Error validating stock: ${error.message}`);
    }
  };

  // Get order item statistics
  const getStatistics = async (orderId = null) => {
    let sql = `
      SELECT 
        COUNT(*) as total_items,
        SUM(quantity) as total_quantity,
        SUM(total_price) as total_revenue,
        AVG(unit_price) as avg_unit_price
      FROM order_items
    `;
    
    const params = [];
    
    if (orderId) {
      sql += ' WHERE order_id = ?';
      params.push(orderId);
    }
    
    try {
      const [rows] = await promisePool.execute(sql, params);
      return rows[0];
    } catch (error) {
      throw new Error(`Error getting order item statistics: ${error.message}`);
    }
  };

  // Get top selling products
  const getTopSellingProducts = async (limit = 10, startDate = null, endDate = null) => {
    let sql = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.image_url,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_count
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN orders o ON oi.order_id = o.id
    `;
    
    const params = [];
    const whereConditions = [];
    
    if (startDate) {
      whereConditions.push('o.created_at >= ?');
      params.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push('o.created_at <= ?');
      params.push(endDate);
    }
    
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    sql += `
      GROUP BY p.id, p.name, p.sku, p.image_url
      ORDER BY total_quantity DESC
      LIMIT ?
    `;
    
    params.push(parseInt(limit) || 10);
    
    try {
      const [rows] = await promisePool.query(sql, params);
      return rows;
    } catch (error) {
      throw new Error(`Error getting top selling products: ${error.message}`);
    }
  };

  // Get product sales history
  const getProductSalesHistory = async (productId, startDate = null, endDate = null) => {
    let sql = `
      SELECT 
        DATE_FORMAT(o.created_at, '%Y-%m') as month,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_count
      FROM order_items oi
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = ?
    `;
    
    const params = [productId];
    
    if (startDate) {
      sql += ' AND o.created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      sql += ' AND o.created_at <= ?';
      params.push(endDate);
    }
    
    sql += `
      GROUP BY month
      ORDER BY month DESC
    `;
    
    try {
      const [rows] = await promisePool.query(sql, params);
      return rows;
    } catch (error) {
      throw new Error(`Error getting product sales history: ${error.message}`);
    }
  };

  // Get sales by category
  const getSalesByCategory = async (startDate = null, endDate = null) => {
    let sql = `
      SELECT 
        c.id,
        c.name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN orders o ON oi.order_id = o.id
    `;
    
    const params = [];
    const whereConditions = [];
    
    if (startDate) {
      whereConditions.push('o.created_at >= ?');
      params.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push('o.created_at <= ?');
      params.push(endDate);
    }
    
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    sql += `
      GROUP BY c.id, c.name
      ORDER BY total_revenue DESC
    `;
    
    try {
      const [rows] = await promisePool.query(sql, params);
      return rows;
    } catch (error) {
      throw new Error(`Error getting sales by category: ${error.message}`);
    }
  };

  // Return all methods as an object
  return {
    create,
    findById,
    update,
    delete: deleteOrderItem,
    findByOrderId,
    findByOrderAndProduct,
    calculateTotal,
    validateStock,
    getStatistics,
    getTopSellingProducts,
    getProductSalesHistory,
    getSalesByCategory
  };
};

// Create and export the order item model
const OrderItem = createOrderItemModel();
export default OrderItem;