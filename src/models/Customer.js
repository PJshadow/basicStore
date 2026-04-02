const { promisePool } = require('./db');

class Customer {
  // Create a new customer
  static async create(customerData) {
    const {
      first_name,
      last_name,
      email,
      phone,
      address,
      city,
      state,
      zip_code,
      country = 'USA'
    } = customerData;
    
    const sql = `
      INSERT INTO customers 
      (first_name, last_name, email, phone, address, city, state, zip_code, country)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    try {
      const [result] = await promisePool.execute(sql, [
        first_name, last_name, email, phone, address, city, state, zip_code, country
      ]);
      return { id: result.insertId, ...customerData };
    } catch (error) {
      throw new Error(`Error creating customer: ${error.message}`);
    }
  }

  // Find customer by ID
  static async findById(id) {
    const sql = 'SELECT * FROM customers WHERE id = ?';
    
    try {
      const [rows] = await promisePool.execute(sql, [id]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding customer by ID: ${error.message}`);
    }
  }

  // Find customer by email
  static async findByEmail(email) {
    const sql = 'SELECT * FROM customers WHERE email = ?';
    
    try {
      const [rows] = await promisePool.execute(sql, [email]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding customer by email: ${error.message}`);
    }
  }

  // Update customer
  static async update(id, customerData) {
    const {
      first_name,
      last_name,
      email,
      phone,
      address,
      city,
      state,
      zip_code,
      country
    } = customerData;
    
    const sql = `
      UPDATE customers 
      SET first_name = ?, last_name = ?, email = ?, phone = ?, 
          address = ?, city = ?, state = ?, zip_code = ?, country = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    try {
      const [result] = await promisePool.execute(sql, [
        first_name, last_name, email, phone, address, city, state, zip_code, country, id
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating customer: ${error.message}`);
    }
  }

  // Delete customer
  static async delete(id) {
    const sql = 'DELETE FROM customers WHERE id = ?';
    
    try {
      const [result] = await promisePool.execute(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting customer: ${error.message}`);
    }
  }

  // Get all customers with pagination
  static async findAll(page = 1, limit = 10, search = '') {
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM customers';
    let params = [];
    
    if (search) {
      sql += ` WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?`;
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    try {
      const [rows] = await promisePool.execute(sql, params);
      return rows;
    } catch (error) {
      throw new Error(`Error finding all customers: ${error.message}`);
    }
  }

  // Count total customers
  static async count(search = '') {
    let sql = 'SELECT COUNT(*) as total FROM customers';
    let params = [];
    
    if (search) {
      sql += ` WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?`;
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }
    
    try {
      const [rows] = await promisePool.execute(sql, params);
      return rows[0].total;
    } catch (error) {
      throw new Error(`Error counting customers: ${error.message}`);
    }
  }

  // Get customer orders
  static async getOrders(customerId) {
    const sql = `
      SELECT o.* FROM orders o
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC
    `;
    
    try {
      const [rows] = await promisePool.execute(sql, [customerId]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting customer orders: ${error.message}`);
    }
  }

  // Get customer statistics
  static async getStatistics(customerId) {
    const sql = `
      SELECT 
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_spent,
        MAX(o.created_at) as last_order_date
      FROM orders o
      WHERE o.customer_id = ?
    `;
    
    try {
      const [rows] = await promisePool.execute(sql, [customerId]);
      return rows[0] || { total_orders: 0, total_spent: 0, last_order_date: null };
    } catch (error) {
      throw new Error(`Error getting customer statistics: ${error.message}`);
    }
  }
}

module.exports = Customer;