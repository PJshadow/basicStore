import { promisePool } from './db.js';

class Category {
  // Create a new category
  static async create(categoryData) {
    const { name, slug, description, parent_id = null } = categoryData;
    
    const sql = `
      INSERT INTO categories (name, slug, description, parent_id)
      VALUES (?, ?, ?, ?)
    `;
    
    try {
      const [result] = await promisePool.execute(sql, [name, slug, description, parent_id]);
      return { id: result.insertId, ...categoryData };
    } catch (error) {
      throw new Error(`Error creating category: ${error.message}`);
    }
  }

  // Find category by ID
  static async findById(id) {
    const sql = 'SELECT * FROM categories WHERE id = ?';
    
    try {
      const [rows] = await promisePool.execute(sql, [id]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding category by ID: ${error.message}`);
    }
  }

  // Find category by slug
  static async findBySlug(slug) {
    const sql = 'SELECT * FROM categories WHERE slug = ?';
    
    try {
      const [rows] = await promisePool.execute(sql, [slug]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding category by slug: ${error.message}`);
    }
  }

  // Update category
  static async update(id, categoryData) {
    const { name, slug, description, parent_id } = categoryData;
    
    const sql = `
      UPDATE categories 
      SET name = ?, slug = ?, description = ?, parent_id = ?
      WHERE id = ?
    `;
    
    try {
      const [result] = await promisePool.execute(sql, [name, slug, description, parent_id, id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating category: ${error.message}`);
    }
  }

  // Delete category
  static async delete(id) {
    const sql = 'DELETE FROM categories WHERE id = ?';
    
    try {
      const [result] = await promisePool.execute(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting category: ${error.message}`);
    }
  }

  // Get all categories
  static async findAll(includeProducts = false) {
    const sql = 'SELECT * FROM categories ORDER BY name';
    
    try {
      const [rows] = await promisePool.execute(sql);
      
      if (includeProducts) {
        // Get products for each category
        for (const category of rows) {
          const productsSql = 'SELECT id, name, price, image_url FROM products WHERE category_id = ? AND active = TRUE LIMIT 5';
          const [products] = await promisePool.execute(productsSql, [category.id]);
          category.products = products;
        }
      }
      
      return rows;
    } catch (error) {
      throw new Error(`Error finding all categories: ${error.message}`);
    }
  }

  // Get categories with hierarchy
  static async getHierarchy() {
    const sql = 'SELECT * FROM categories ORDER BY parent_id, name';
    
    try {
      const [rows] = await promisePool.execute(sql);
      
      // Build hierarchy
      const categoryMap = {};
      const rootCategories = [];
      
      // First pass: create map
      rows.forEach(category => {
        category.children = [];
        categoryMap[category.id] = category;
      });
      
      // Second pass: build tree
      rows.forEach(category => {
        if (category.parent_id && categoryMap[category.parent_id]) {
          categoryMap[category.parent_id].children.push(category);
        } else {
          rootCategories.push(category);
        }
      });
      
      return rootCategories;
    } catch (error) {
      throw new Error(`Error getting category hierarchy: ${error.message}`);
    }
  }

  // Get subcategories
  static async getSubcategories(parentId) {
    const sql = 'SELECT * FROM categories WHERE parent_id = ? ORDER BY name';
    
    try {
      const [rows] = await promisePool.execute(sql, [parentId]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting subcategories: ${error.message}`);
    }
  }

  // Count products in category
  static async countProducts(categoryId) {
    const sql = 'SELECT COUNT(*) as total FROM products WHERE category_id = ? AND active = TRUE';
    
    try {
      const [rows] = await promisePool.execute(sql, [categoryId]);
      return rows[0].total;
    } catch (error) {
      throw new Error(`Error counting products in category: ${error.message}`);
    }
  }

  // Get category with products (paginated)
  static async getWithProducts(categoryId, page = 1, limit = 12) {
    const offset = (page - 1) * limit;
    
    // Get category info
    const category = await this.findById(categoryId);
    if (!category) return null;
    
    // Get products
    const productsSql = `
      SELECT * FROM products 
      WHERE category_id = ? AND active = TRUE 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    try {
      const [products] = await promisePool.execute(productsSql, [categoryId, limit, offset]);
      
      // Count total products
      const countSql = 'SELECT COUNT(*) as total FROM products WHERE category_id = ? AND active = TRUE';
      const [countRows] = await promisePool.execute(countSql, [categoryId]);
      
      return {
        ...category,
        products,
        totalProducts: countRows[0].total,
        currentPage: page,
        totalPages: Math.ceil(countRows[0].total / limit)
      };
    } catch (error) {
      throw new Error(`Error getting category with products: ${error.message}`);
    }
  }
}

export default Category;