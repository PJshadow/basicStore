import { promisePool } from './db.js';

// Coupon factory function - returns an object with all coupon methods
const createCouponModel = () => {
  // Create a new coupon
  const create = async (couponData) => {
    const {
      code,
      discount_type,
      discount_value,
      minimum_order = 0,
      maximum_discount = null,
      usage_limit = null,
      valid_from = null,
      valid_until = null,
      active = true,
      description = null
    } = couponData;
    
    const sql = `
      INSERT INTO coupons 
      (code, discount_type, discount_value, minimum_order, maximum_discount,
       usage_limit, valid_from, valid_until, active, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    try {
      const [result] = await promisePool.execute(sql, [
        code, discount_type, discount_value, minimum_order, maximum_discount,
        usage_limit, valid_from, valid_until, active, description
      ]);
      return { id: result.insertId, ...couponData };
    } catch (error) {
      throw new Error(`Error creating coupon: ${error.message}`);
    }
  };

  // Find coupon by ID
  const findById = async (id) => {
    const sql = 'SELECT * FROM coupons WHERE id = ?';
    
    try {
      const [rows] = await promisePool.execute(sql, [id]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding coupon by ID: ${error.message}`);
    }
  };

  // Find coupon by code
  const findByCode = async (code) => {
    const sql = 'SELECT * FROM coupons WHERE code = ?';
    
    try {
      const [rows] = await promisePool.execute(sql, [code]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding coupon by code: ${error.message}`);
    }
  };

  // Update coupon
  const update = async (id, couponData) => {
    const {
      code,
      discount_type,
      discount_value,
      minimum_order,
      maximum_discount,
      usage_limit,
      valid_from,
      valid_until,
      active,
      description
    } = couponData;
    
    const sql = `
      UPDATE coupons 
      SET code = ?, discount_type = ?, discount_value = ?, minimum_order = ?,
          maximum_discount = ?, usage_limit = ?,
          valid_from = ?, valid_until = ?, active = ?, description = ?
      WHERE id = ?
    `;
    
    try {
      const [result] = await promisePool.execute(sql, [
        code, discount_type, discount_value, minimum_order, maximum_discount,
        usage_limit, valid_from, valid_until, active, description, id
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating coupon: ${error.message}`);
    }
  };

  // Delete coupon
  const deleteCoupon = async (id) => {
    const sql = 'DELETE FROM coupons WHERE id = ?';
    
    try {
      const [result] = await promisePool.execute(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting coupon: ${error.message}`);
    }
  };

  // Get all coupons with pagination
  const findAll = async (page = 1, limit = 10, activeOnly = false) => {
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM coupons';
    
    if (activeOnly) {
      sql += ' WHERE active = TRUE AND (valid_until IS NULL OR valid_until >= CURDATE())';
    }
    
    sql += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    
    try {
      const [rows] = await promisePool.query(sql);
      return rows;
    } catch (error) {
      throw new Error(`Error finding all coupons: ${error.message}`);
    }
  };

  // Count total coupons
  const count = async (activeOnly = false) => {
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
  };

  // Validate coupon
  const validate = async (code, userId = null, orderAmount = 0) => {
    const coupon = await findByCode(code);
    
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
    if (orderAmount < coupon.minimum_order) {
      return { 
        valid: false, 
        message: `Minimum order amount of $${coupon.minimum_order} required` 
      };
    }
    
    // Check usage limit
    const usageCount = await getUsageCount(coupon.id);
    if (coupon.usage_limit && usageCount >= coupon.usage_limit) {
      return { valid: false, message: 'Coupon usage limit reached' };
    }
    
    // Check per-user usage limit (not in schema, so we skip or use a default)
    // If we wanted per-user, we'd need to check order_coupons joined with orders
    
    // Calculate discount
    let discountAmount = 0;
    
    if (coupon.discount_type === 'percentage') {
      discountAmount = (orderAmount * coupon.discount_value) / 100;
      
      // Apply maximum discount amount if set
      if (coupon.maximum_discount && discountAmount > coupon.maximum_discount) {
        discountAmount = coupon.maximum_discount;
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
  };

  // Get coupon usage count
  const getUsageCount = async (couponId) => {
    const sql = 'SELECT COUNT(*) as count FROM order_coupons WHERE coupon_id = ?';
    
    try {
      const [rows] = await promisePool.execute(sql, [couponId]);
      return rows[0].count;
    } catch (error) {
      throw new Error(`Error getting coupon usage count: ${error.message}`);
    }
  };

  // Get user usage count for a coupon
  const getUserUsageCount = async (couponId, userId) => {
    const sql = `
      SELECT COUNT(*) as count 
      FROM order_coupons oc
      JOIN orders o ON oc.order_id = o.id
      WHERE oc.coupon_id = ? AND o.customer_id = ?
    `;
    
    try {
      const [rows] = await promisePool.execute(sql, [couponId, userId]);
      return rows[0].count;
    } catch (error) {
      throw new Error(`Error getting user coupon usage count: ${error.message}`);
    }
  };

  // Get coupon statistics
  const getStatistics = async () => {
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
  };

  // Get expired coupons
  const getExpired = async () => {
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
  };

  // Get active coupons
  const getActive = async () => {
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
  };

  // Return all methods as an object
  return {
    create,
    findById,
    findByCode,
    update,
    delete: deleteCoupon,
    findAll,
    count,
    validate,
    getUsageCount,
    getUserUsageCount,
    getStatistics,
    getExpired,
    getActive
  };
};

// Create and export the coupon model
const Coupon = createCouponModel();
export default Coupon;
