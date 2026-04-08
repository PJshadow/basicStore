// Product Controller
// Handles product CRUD operations, inventory management, etc.

import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { validationResult } from 'express-validator';

export default {
  // Get all products
  getAllProducts: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 12,
        categoryId,
        featured,
        search,
        minPrice,
        maxPrice,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        categoryId: categoryId ? parseInt(categoryId) : null,
        featured: featured !== undefined ? featured === 'true' : null,
        search: search || '',
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        sortBy,
        sortOrder,
        inStockOnly: true
      };

      const products = await Product.findAll(filters);
      const totalProducts = await Product.count(filters);
      const totalPages = Math.ceil(totalProducts / filters.limit);

      res.status(200).json({
        products,
        pagination: {
          currentPage: filters.page,
          totalPages,
          totalProducts,
          limit: filters.limit,
          hasNextPage: filters.page < totalPages,
          hasPrevPage: filters.page > 1
        }
      });
    } catch (error) {
      console.error('Get all products error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get single product by ID
  getProductById: async (req, res) => {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Get related products if category exists
      let relatedProducts = [];
      if (product.category_id) {
        relatedProducts = await Product.getRelated(product.id, product.category_id, 4);
      }

      res.status(200).json({
        product,
        relatedProducts
      });
    } catch (error) {
      console.error('Get product by ID error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get product by slug
  getProductBySlug: async (req, res) => {
    try {
      const { slug } = req.params;
      const product = await Product.findBySlug(slug);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Get related products if category exists
      let relatedProducts = [];
      if (product.category_id) {
        relatedProducts = await Product.getRelated(product.id, product.category_id, 4);
      }

      res.status(200).json({
        product,
        relatedProducts
      });
    } catch (error) {
      console.error('Get product by slug error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create new product (admin only)
  createProduct: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.userRole || req.session.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const productData = req.body;

      // Validate category if provided
      if (productData.category_id) {
        const category = await Category.findById(productData.category_id);
        if (!category) {
          return res.status(400).json({ error: 'Invalid category ID' });
        }
      }

      // Check if SKU already exists
      if (productData.sku) {
        const existingProduct = await Product.findBySku(productData.sku);
        if (existingProduct) {
          return res.status(400).json({ error: 'SKU already exists' });
        }
      }

      const newProduct = await Product.create(productData);

      res.status(201).json({
        message: 'Product created successfully',
        product: newProduct
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update product (admin only)
  updateProduct: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.userRole || req.session.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const productData = req.body;

      // Check if product exists
      const existingProduct = await Product.findById(id);
      if (!existingProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Validate category if provided
      if (productData.category_id) {
        const category = await Category.findById(productData.category_id);
        if (!category) {
          return res.status(400).json({ error: 'Invalid category ID' });
        }
      }

      // Check if SKU already exists (if changing SKU)
      if (productData.sku && productData.sku !== existingProduct.sku) {
        const productWithSku = await Product.findBySku(productData.sku);
        if (productWithSku) {
          return res.status(400).json({ error: 'SKU already exists' });
        }
      }

      const updated = await Product.update(id, productData);
      if (!updated) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const updatedProduct = await Product.findById(id);

      res.status(200).json({
        message: 'Product updated successfully',
        product: updatedProduct
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete product (admin only)
  deleteProduct: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.userRole || req.session.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.params;

      // Check if product exists
      const existingProduct = await Product.findById(id);
      if (!existingProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const deleted = await Product.delete(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.status(200).json({
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get featured products
  getFeaturedProducts: async (req, res) => {
    try {
      const { limit = 8 } = req.query;
      const products = await Product.getFeatured(parseInt(limit));

      res.status(200).json({
        products
      });
    } catch (error) {
      console.error('Get featured products error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get products by category
  getProductsByCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const {
        page = 1,
        limit = 12,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      // Check if category exists
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        categoryId: parseInt(categoryId),
        sortBy,
        sortOrder,
        inStockOnly: true
      };

      const products = await Product.findAll(filters);
      const totalProducts = await Product.count(filters);
      const totalPages = Math.ceil(totalProducts / filters.limit);

      res.status(200).json({
        category,
        products,
        pagination: {
          currentPage: filters.page,
          totalPages,
          totalProducts,
          limit: filters.limit,
          hasNextPage: filters.page < totalPages,
          hasPrevPage: filters.page > 1
        }
      });
    } catch (error) {
      console.error('Get products by category error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update product stock (admin only)
  updateProductStock: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.userRole || req.session.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { quantityChange } = req.body;

      // Check if product exists
      const existingProduct = await Product.findById(id);
      if (!existingProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const updated = await Product.updateStock(id, parseInt(quantityChange));
      if (!updated) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const updatedProduct = await Product.findById(id);

      res.status(200).json({
        message: 'Product stock updated successfully',
        product: updatedProduct
      });
    } catch (error) {
      console.error('Update product stock error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get low stock products (admin only)
  getLowStockProducts: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.userRole || req.session.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { threshold = 5 } = req.query;
      const products = await Product.getLowStock(parseInt(threshold));

      res.status(200).json({
        products
      });
    } catch (error) {
      console.error('Get low stock products error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get product statistics (admin only)
  getProductStatistics: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.userRole || req.session.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const statistics = await Product.getStatistics();

      res.status(200).json({
        statistics
      });
    } catch (error) {
      console.error('Get product statistics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};