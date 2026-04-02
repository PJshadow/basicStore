const { promisePool } = require('./db');

class Coupon {
  // Create a new coupon
  static async create(couponData) {
    const {
      code,
      discount_type,
      discount_value,
      minimum_order_amount = 0,
      maximum_discount_amount = null,
      usage_limit = null,
      usage_limit_per_user = null,
      valid_from = null,
      valid_until = null,
      active = true
    } = couponData;
    
    const sql = `
      INSERT INTO coupons 
      (code, discount_type, discount_value, minimum_order_amount, maximum_discount_amount,
       usage_limit, usage_limit_per_user, valid_from, valid_until, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    try {
      const [result] = await promisePool.execute(sql, [
        code, discount_type, discount_value, minimum_order_amount, maximum_discount_amount,
        usage_limit, usage_limit_per_user, valid_from, valid_until, active
      ]);
      return { id: result.insertId, ...couponData };
    } catch (error) {
      throw new Error(`Error creating coupon: ${error.message}`);
    }
  }

  // Find coupon by ID
  static async findById(id) {
    const sql = 'SELECT * FROM coupons WHERE id = ?';
    
    try {
      const [rows] = await promisePool.execute(sql, [id]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding coupon by ID: ${error.message}`);
    }
  }

  // Find coupon by code
  static async findByCode(code) {
    const sql = 'SELECT * FROM coupons WHERE code = ?';
    
    try {
      const [rows] = await promisePool.execute(sql, [code]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding coupon by code: ${error.message}`);
    }
  }

  // Update coupon
  static async update(id, couponData) {
    const {
      code,
      discount_type,
      discount_value,
      minimum_order_amount,
      maximum_discount_amount,
      usage_limit,
      usage_limit_per_user,
      valid_from,
      valid_until,
      active
    } = couponData;
    
    const sql = `
      UPDATE coupons 
      SET code = ?, discount_type = ?, discount_value = ?, minimum_order_amount = ?,
          maximum_discount_amount = ?, usage_limit = ?, usage_limit_per_user = ?,
          valid_from = ?, valid_until = ?, active = ?
      WHERE id = ?
    `;
    
    try {
      const [result] = await promisePool.execute(sql, [
        code, discount_type, discount_value, minimum_order_amount, maximum_discount_amount,
        usage_limit, usage_limit_per_user, valid_from, valid_until, active, id
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating coupon: ${error.message}`);
    }
  }

  // Delete coupon
  static async delete(id) {
    const sql = 'DELETE FROM coupons WHERE id = ?';
    
    try {
      const [result] = await promisePool.execute(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting coupon: ${error.message}`);
    }
  }

  // Get all coupons with pagination
  static async findAll(page = 1, limit = 10, activeOnly = false) {
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM coupons';
    const params = [];
    
    if (activeOnly) {
      sql += ' WHERE active = TRUE AND (valid_until IS NULL OR valid_until >= CURDATE())';
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    try {
      const [rows] = await promisePool.execute(sql, params);
      return rows;
    } catch (error) {
      throw new Error(`Error finding all coupons: ${error.message}`);
    }
  }

  // Count total coupons
  static async count(activeOnly = false) {
    let sql = 'SELECT COUNT(*) as total FROM coupons';
    
    if (activeOnly) {
      sql += ' WHERE active = TRUE AND (valid_until IS NULL OR valid_until >= CURDATE())';
    }
    
    try {
      const [rows] = await promisePool.execute(sql);
      return rows[0].total;
    } catch (error) {
      throw new Error(`Error counting coupons: ${error.message}`);
    }
  }

  // Validate coupon
  static async validate(code, userId = null, orderAmount = 0) {
    const coupon = await this.findByCode(code);
    
    if (!coupon) {
      return { valid: false, message: 'Coupon not found' };
    }
    
    if (!coupon.active) {
      return { valid: false, message: 'Coupon is inactive' };
    }
    
    // Check validity dates
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return { valid: false, message: 'Coupon is not yet valid' };
    }
    
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return { valid: false, message: 'Coupon has expired' };
    }
    
    // Check minimum order amount
    if (orderAmount < coupon.minimum_order_amount) {
      return { 
        valid: false, 
        message: `Minimum order amount of $${coupon.minimum_order_amount} required` 
      };
    }
    
    // Check usage limit
    if (coupon.usage_limit) {
      const usageCount = await this.getUsageCount(coupon.id);
      if (usageCount >= coupon.usage_limit) {
        return { valid: false, message: 'Coupon usage limit reached' };
      }
    }
    
    // Check per-user usage limit
    if (coupon.usage_limit_per_user && userId) {
      const userUsageCount = await this.getUserUsageCount(coupon.id, userId);
      if (userUsageCount >= coupon.usage_limit_per_user) {
        return { valid: false, message: 'You have already used this coupon' };
      }
    }
    
    // Calculate discount
    let discountAmount = 0;
    
    if (coupon.discount_type === 'percentage') {
      discountAmount = (orderAmount * coupon.discount_value) / 100;
      
      // Apply maximum discount amount if set
      if (coupon.maximum_discount_amount && discountAmount > coupon.maximum_discount_amount) {
        discountAmount = coupon.maximum_discount_amount;
      }
    } else if (coupon.discount_type === 'fixed') {
      discountAmount = coupon.discount_value;
    }
    
    return {
      valid: true,
      coupon,
      discountAmount,
      message: `Coupon applied: $${discountAmount.toFixed(2)} discount`
    };
  }

  // Get coupon usage count
  static async getUsageCount(couponId) {
    const sql = 'SELECT COUNT(*) as count FROM orders WHERE coupon_id = ?';
    
    try {
      const [rows] = await promisePool.execute(sql, [couponId]);
      return rows[0].count;
    } catch (error) {
      throw new Error(`Error getting coupon usage count: ${error.message}`);
    }
  }

  // Get user usage count for a coupon
  static async getUserUsageCount(couponId, userId) {
    const sql = `
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE coupon_id = ? AND customer_id = ?
    `;
    
    try {
      const [rows] = await promisePool.execute(sql, [couponId, userId]);
      return rows[0].count;
    } catch (error) {
      throw new Error(`Error getting user coupon usage count: ${error.message}`);
    }
  }

  // Record coupon usage
  static async recordUsage(couponId, orderId, customerId) {
    const sql = 'UPDATE orders SET coupon_id = ? WHERE id = ?';
    
    try {
      const [result] = await promisePool.execute(sql, [couponId, orderId]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error recording coupon usage: ${error.message}`);
    }
  }

  // Get coupon statistics
  static async getStatistics() {
    const sql = `
      SELECT 
        COUNT(*) as total_coupons,
        SUM(CASE WHEN active = TRUE THEN 1 ELSE 0 END) as active_coupons,
        SUM(CASE WHEN discount_type = 'percentage' THEN 1 ELSE 0 END) as percentage_coupons,
        SUM(CASE WHEN discount_type = 'fixed' THEN 1 ELSE 0 END) as fixed_coupons,
        AVG(discount_value) as avg_discount_value
      FROM coupons
    `;
    
    try {
      const [rows] = await promisePool.execute(sql);
      return rows[0];
    } catch (error) {
      throw new Error(`Error getting coupon statistics: ${error.message}`);
    }
  }

  // Get expired coupons
  static async getExpired() {
    const sql = `
      SELECT * FROM coupons 
      WHERE valid_until < CURDATE() AND active = TRUE
      ORDER BY valid_until DESC
    `;
    
    try {
      const [rows] = await promisePool.execute(sql);
      return rows;
    } catch (error) {
      throw new Error(`Error getting expired coupons: ${error.message}`);
    }
  }

  // Get active coupons
  static async getActive() {
    const sql = `
      SELECT * FROM coupons 
      WHERE active = TRUE AND (valid_until IS NULL OR valid_until >= CURDATE())
      ORDER BY created_at DESC
    `;
    
    try {
      const [rows] = await promisePool.execute(sql);
      return rows;
    } catch (error) {
      throw new Error(`Error getting active coupons: ${error.message}`);
    }
  }
}

module.exports = Coupon;