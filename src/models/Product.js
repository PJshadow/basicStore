import { promisePool } from './db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Product factory function - returns an object with all product methods
const createProductModel = () => {
  // Create a new product
  const create = async (productData) => {
    const {
      name,
      slug,
      description = null,
      short_description = null,
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
      description = null,
      short_description = null,
      sku,
      price,
      sale_price = null,
      cost = null,
      stock_quantity,
      low_stock_threshold = 5,
      category_id,
      featured,
      active,
      image_url,
      extra_images = []
    } = productData;
    
    const connection = await promisePool.getConnection();
    await connection.beginTransaction();

    try {
      const sql = `
        UPDATE products 
        SET name = ?, slug = ?, description = ?, short_description = ?, sku = ?, 
            price = ?, sale_price = ?, cost = ?, stock_quantity = ?, low_stock_threshold = ?,
            category_id = ?, featured = ?, active = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      await connection.execute(sql, [
        name, slug, description, short_description, sku, price, sale_price, cost,
        stock_quantity, low_stock_threshold, category_id, featured, active, image_url, id
      ]);

      // Update extra images
      if (Array.isArray(extra_images)) {
        // Clear non-main images
        await connection.execute('DELETE FROM product_images WHERE product_id = ? AND is_main = FALSE', [id]);
        
        // Add new extra images (limit to 9, since 1 is main, total 10)
        const imagesToSave = extra_images.slice(0, 9);
        for (const img of imagesToSave) {
          if (img && img.trim()) {
            await connection.execute('INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, FALSE)', [id, img.trim()]);
          }
        }
      }

      // Ensure main image is synced with product table
      if (image_url) {
        // Check if main image already in table
        const [existing] = await connection.execute('SELECT id FROM product_images WHERE product_id = ? AND is_main = TRUE', [id]);
        if (existing.length > 0) {
          await connection.execute('UPDATE product_images SET image_url = ? WHERE product_id = ? AND is_main = TRUE', [image_url, id]);
        } else {
          await connection.execute('INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, TRUE)', [id, image_url]);
        }
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw new Error(`Error updating product: ${error.message}`);
    } finally {
      connection.release();
    }
  };

  // Get product images
  const getImages = async (productId) => {
    const sql = 'SELECT * FROM product_images WHERE product_id = ? ORDER BY is_main DESC, created_at ASC';
    try {
      const [rows] = await promisePool.execute(sql, [productId]);
      return rows;
    } catch (error) {
      throw new Error(`Error fetching product images: ${error.message}`);
    }
  };

  // Set main image
  const setMainImage = async (productId, imageId) => {
    const connection = await promisePool.getConnection();
    await connection.beginTransaction();
    try {
      // Unset all main images
      await connection.execute('UPDATE product_images SET is_main = FALSE WHERE product_id = ?', [productId]);
      // Set new main image
      await connection.execute('UPDATE product_images SET is_main = TRUE WHERE id = ?', [imageId]);
      
      // Sync with product table
      const [img] = await connection.execute('SELECT image_url FROM product_images WHERE id = ?', [imageId]);
      if (img[0]) {
        await connection.execute('UPDATE products SET image_url = ? WHERE id = ?', [img[0].image_url, productId]);
      }
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw new Error(`Error setting main image: ${error.message}`);
    } finally {
      connection.release();
    }
  };

  // Delete product image
  const deleteImage = async (productId, imageId) => {
    const connection = await promisePool.getConnection();
    await connection.beginTransaction();
    try {
      // Get image info first
      const [img] = await connection.execute('SELECT image_url, is_main FROM product_images WHERE id = ? AND product_id = ?', [imageId, productId]);
      
      if (!img[0]) {
        throw new Error('Image not found');
      }

      if (img[0].is_main) {
        throw new Error('Cannot delete the main image. Please set another image as main first.');
      }

      const imageUrl = img[0].image_url;

      // Delete from database
      await connection.execute('DELETE FROM product_images WHERE id = ?', [imageId]);
      
      // Attempt to delete physical file if it's local
      if (imageUrl.startsWith('/images/')) {
        const fileName = imageUrl.replace('/images/', '');
        const filePath = path.join(__dirname, '../public/images', fileName);
        try {
          await fs.unlink(filePath);
        } catch (err) {
          console.warn(`Could not delete physical file: ${filePath}`, err.message);
          // Don't throw error here, database record is already gone
        }
      }
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw new Error(`Error deleting image: ${error.message}`);
    } finally {
      connection.release();
    }
  };

  // Delete product
  const deleteProduct = async (id) => {
    const connection = await promisePool.getConnection();
    await connection.beginTransaction();
    try {
      // Get all images first to delete files
      const images = await getImages(id);
      
      // Delete physical files
      for (const img of images) {
        if (img.image_url.startsWith('/images/')) {
          const fileName = img.image_url.replace('/images/', '');
          const filePath = path.join(__dirname, '../public/images', fileName);
          try {
            await fs.unlink(filePath);
          } catch (err) {
            console.warn(`Could not delete physical file during product deletion: ${filePath}`, err.message);
          }
        }
      }

      // Delete from products table (cascades to product_images in DB)
      const [result] = await connection.execute('DELETE FROM products WHERE id = ?', [id]);
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw new Error(`Error deleting product and its images: ${error.message}`);
    } finally {
      connection.release();
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
    sortOrder = 'DESC',
    active = 1,
    inStockOnly = false,
    includeImages = false
  } = {}) => {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    
    const params = [];

    if (active !== null) {
      sql += ' AND p.active = ?';
      params.push(active ? 1 : 0);
    }

    if (inStockOnly) {
      sql += ' AND p.stock_quantity > 0';
    }
    
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
      
      if (includeImages) {
        for (const product of rows) {
          product.images = await getImages(product.id);
        }
      }
      
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
    maxPrice = null,
    active = 1,
    inStockOnly = false
  } = {}) => {
    let sql = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const params = [];

    if (active !== null) {
      sql += ' AND active = ?';
      params.push(active ? 1 : 0);
    }

    if (inStockOnly) {
      sql += ' AND stock_quantity > 0';
    }
    
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
      WHERE featured = TRUE AND active = TRUE AND stock_quantity > 0
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
      WHERE category_id = ? AND id != ? AND active = TRUE AND stock_quantity > 0
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
    getStatistics,
    getImages,
    setMainImage,
    deleteImage
  };
};

// Create and export the product model
const Product = createProductModel();
export default Product;