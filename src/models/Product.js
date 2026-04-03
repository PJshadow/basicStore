import { promisePool } from './db.js';

// Product factory function - returns an object with all product methods
const createProductModel = () => {
  // Create a new product
  const create = async (productData) => {
    const {
      name,
      slug,
      description,
      short_description,
      sku,
      price,
      sale_price = null,
      cost = null,
      stock_quantity = 0,
      low_stock_threshold = 5,
      category_id = null,
      featured = false,
      active = true,
      image_url = null
    } = productData;
    
    const sql = `
      INSERT INTO products 
      (name, slug, description, short_description, sku, price, sale_price, cost, 
       stock_quantity, low_stock_threshold, category_id, featured, active, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    try {
      const [result] = await promisePool.execute(sql, [
        name, slug, description, short_description, sku, price, sale_price, cost,
        stock_quantity, low_stock_threshold, category_id, featured, active, image_url
      ]);
      return { id: result.insertId, ...productData };
    } catch (error) {
      throw new Error(`Error creating product: ${error.message}`);
    }
  };

  // Find product by ID
  const findById = async (id) => {
    const sql = `
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `;
    
    try {
      const [rows] = await promisePool.execute(sql, [id]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding product by ID: ${error.message}`);
    }
  };

  // Find product by slug
  const findBySlug = async (slug) => {
    const sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.active = 1
    `;
    
    try {
      const [rows] = await promisePool.execute(sql, [slug]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding product by slug: ${error.message}`);
    }
  };

  // Find product by SKU
  const findBySku = async (sku) => {
    const sql = 'SELECT * FROM products WHERE sku = ?';
    
    try {
      const [rows] = await promisePool.execute(sql, [sku]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding product by SKU: ${error.message}`);
    }
  };

  // Update product
  const update = async (id, productData) => {
    const {
      name,
      slug,
      description,
      short_description,
      sku,
      price,
      sale_price,
      cost,
      stock_quantity,
      low_stock_threshold,
      category_id,
      featured,
      active,
      image_url
    } = productData;
    
    const sql = `
      UPDATE products 
      SET name = ?, slug = ?, description = ?, short_description = ?, sku = ?, 
          price = ?, sale_price = ?, cost = ?, stock_quantity = ?, low_stock_threshold = ?,
          category_id = ?, featured = ?, active = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    try {
      const [result] = await promisePool.execute(sql, [
        name, slug, description, short_description, sku, price, sale_price, cost,
        stock_quantity, low_stock_threshold, category_id, featured, active, image_url, id
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating product: ${error.message}`);
    }
  };

  // Delete product
  const deleteProduct = async (id) => {
    const sql = 'DELETE FROM products WHERE id = ?';
    
    try {
      const [result] = await promisePool.execute(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting product: ${error.message}`);
    }
  };

  // Get all products with pagination and filters
  const findAll = async ({
    page = 1,
    limit = 12,
    categoryId = null,
    featured = null,
    search = '',
    minPrice = null,
    maxPrice = null,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = {}) => {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1
    `;
    
    const params = [];
    
    if (categoryId) {
      sql += ' AND p.category_id = ?';
      params.push(categoryId);
    }
    
    if (featured != null) { // Check for both null and undefined
      sql += ' AND p.featured = ?';
      // Convert boolean to integer for MySQL
      params.push(featured ? 1 : 0);
    }
    
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (minPrice !== null) {
      sql += ' AND p.price >= ?';
      params.push(minPrice);
    }
    
    if (maxPrice !== null) {
      sql += ' AND p.price <= ?';
      params.push(maxPrice);
    }
    
    // Validate sort column
    const validSortColumns = ['name', 'price', 'created_at', 'stock_quantity'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    sql += ` ORDER BY p.${sortColumn} ${order} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    
    try {
      const [rows] = await promisePool.execute(sql, params);
      return rows;
    } catch (error) {
      throw new Error(`Error finding all products: ${error.message}`);
    }
  };

  // Count products with filters
  const count = async ({
    categoryId = null,
    featured = null,
    search = '',
    minPrice = null,
    maxPrice = null
  } = {}) => {
    let sql = 'SELECT COUNT(*) as total FROM products WHERE active = 1';
    const params = [];
    
    if (categoryId) {
      sql += ' AND category_id = ?';
      params.push(categoryId);
    }
    
    if (featured != null) { // Check for both null and undefined
      sql += ' AND featured = ?';
      // Convert boolean to integer for MySQL
      params.push(featured ? 1 : 0);
    }
    
    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ? OR sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (minPrice !== null) {
      sql += ' AND price >= ?';
      params.push(minPrice);
    }
    
    if (maxPrice !== null) {
      sql += ' AND price <= ?';
      params.push(maxPrice);
    }
    
    try {
      const [rows] = await promisePool.execute(sql, params);
      return rows[0].total;
    } catch (error) {
      throw new Error(`Error counting products: ${error.message}`);
    }
  };

  // Update stock quantity
  const updateStock = async (id, quantityChange) => {
    const sql = 'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?';
    
    try {
      const [result] = await promisePool.execute(sql, [quantityChange, id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating stock: ${error.message}`);
    }
  };

  // Get low stock products
  const getLowStock = async (threshold = 5) => {
    const sql = `
      SELECT * FROM products 
      WHERE stock_quantity <= ? AND active = TRUE
      ORDER BY stock_quantity ASC
    `;
    
    try {
      const [rows] = await promisePool.execute(sql, [threshold]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting low stock products: ${error.message}`);
    }
  };

  // Get featured products
  const getFeatured = async (limit = 8) => {
    const sql = `
      SELECT * FROM products 
      WHERE featured = TRUE AND active = TRUE
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)}
    `;
    
    try {
      const [rows] = await promisePool.query(sql);
      return rows;
    } catch (error) {
      throw new Error(`Error getting featured products: ${error.message}`);
    }
  };

  // Get related products
  const getRelated = async (productId, categoryId, limit = 4) => {
    const sql = `
      SELECT * FROM products 
      WHERE category_id = ? AND id != ? AND active = TRUE
      ORDER BY RAND()
      LIMIT ${parseInt(limit)}
    `;
    
    try {
      const [rows] = await promisePool.query(sql, [categoryId, productId]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting related products: ${error.message}`);
    }
  };

  // Get product statistics
  const getStatistics = async () => {
    const sql = `
      SELECT 
        COUNT(*) as total_products,
        SUM(stock_quantity) as total_stock,
        AVG(price) as avg_price,
        SUM(CASE WHEN stock_quantity <= low_stock_threshold THEN 1 ELSE 0 END) as low_stock_count
      FROM products
      WHERE active = TRUE
    `;
    
    try {
      const [rows] = await promisePool.execute(sql);
      return rows[0];
    } catch (error) {
      throw new Error(`Error getting product statistics: ${error.message}`);
    }
  };

  // Return all methods as an object
  return {
    create,
    findById,
    findBySlug,
    findBySku,
    update,
    delete: deleteProduct,
    findAll,
    count,
    updateStock,
    getLowStock,
    getFeatured,
    getRelated,
    getStatistics
  };
};

// Create and export the product model
const Product = createProductModel();
export default Product;