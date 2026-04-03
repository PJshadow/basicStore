// Admin Controller
// Handles admin-specific operations, dashboard statistics, etc.

import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';
import Coupon from '../models/Coupon.js';
import OrderItem from '../models/OrderItem.js';

export default {
  // Get dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { startDate, endDate } = req.query;

      // Get statistics from all models
      const [
        orderStats,
        productStats,
        customerCount,
        userCount,
        couponStats,
        revenueData,
        topProducts
      ] = await Promise.all([
        Order.getStatistics(startDate, endDate),
        Product.getStatistics(),
        Customer.count(),
        User.count(),
        Coupon.getStatistics(),
        Order.getRevenueByPeriod('day', 7),
        OrderItem.getTopSelling(5, startDate, endDate)
      ]);

      res.status(200).json({
        statistics: {
          orders: orderStats,
          products: productStats,
          customers: customerCount,
          users: userCount,
          coupons: couponStats
        },
        recentRevenue: revenueData,
        topProducts
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all users (admin only)
  getAllUsers: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const {
        page = 1,
        limit = 10
      } = req.query;

      const users = await User.findAll(parseInt(page), parseInt(limit));
      const totalUsers = await User.count();
      const totalPages = Math.ceil(totalUsers / parseInt(limit));

      res.status(200).json({
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          limit: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create admin user (admin only)
  createAdminUser: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { username, email, password, role = 'staff' } = req.body;

      // Check if user already exists
      const existingUserByEmail = await User.findByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const existingUserByUsername = await User.findByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      // Create new user
      const newUser = await User.create({ username, email, password, role });

      res.status(201).json({
        message: 'User created successfully',
        user: newUser
      });
    } catch (error) {
      console.error('Create admin user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update user role (admin only)
  updateUserRole: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.params;
      const { role } = req.body;

      // Validate role
      const validRoles = ['admin', 'manager', 'staff'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Check if user exists
      const existingUser = await User.findById(id);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Cannot change own role (security measure)
      if (parseInt(id) === req.session.userId) {
        return res.status(400).json({ error: 'Cannot change your own role' });
      }

      const updated = await User.update(id, { role });
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updatedUser = await User.findById(id);

      res.status(200).json({
        message: 'User role updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete user (admin only)
  deleteUser: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.params;

      // Check if user exists
      const existingUser = await User.findById(id);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Cannot delete yourself
      if (parseInt(id) === req.session.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      const deleted = await User.delete(id);
      if (!deleted) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Products management
  getProducts: async (req, res) => {
    try {
      const products = await Product.findAll({ active: null, includeImages: true }); // Get all products with all their images
      res.render('admin/products/list', {
        title: 'Product Management',
        currentUser: req.session.user,
        sidebar: true,
        activePage: 'products',
        products
      });
    } catch (error) {
      console.error('Get products error:', error);
      req.flash('error_msg', 'Error fetching products');
      res.redirect('/admin');
    }
  },

  getCreateProduct: async (req, res) => {
    try {
      const categories = await Category.findAll();
      res.render('admin/products/create', {
        title: 'Add New Product',
        currentUser: req.session.user,
        sidebar: true,
        activePage: 'products',
        categories
      });
    } catch (error) {
      console.error('Get create product error:', error);
      req.flash('error_msg', 'Error loading category list');
      res.redirect('/admin/products');
    }
  },

  createProduct: async (req, res) => {
    try {
      const {
        name,
        slug,
        description,
        price,
        stock_quantity,
        category_id,
        extra_images
      } = req.body;

      // Basic validation
      if (!name || !price || !stock_quantity || !category_id) {
        req.flash('error_msg', 'Please fill in all required fields');
        return res.redirect('/admin/products/new');
      }

      // Generate slug if not provided
      const productSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Check if slug already exists
      const existingProduct = await Product.findBySlug(productSlug);
      if (existingProduct) {
        req.flash('error_msg', 'Product slug already exists. Please choose another or leave blank for auto-generation.');
        return res.redirect('/admin/products/new');
      }

      // uploaded files
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          imageUrls.push('/images/' + file.filename);
        });
      }

      const mainImage = imageUrls.length > 0 ? imageUrls[0] : '/images/placeholder.webp';

      const productData = {
        name,
        slug: productSlug,
        description,
        short_description: description ? description.substring(0, 150) : '',
        sku: 'SKU-' + Date.now(), // Basic SKU generation
        price: parseFloat(price),
        stock_quantity: parseInt(stock_quantity),
        category_id: parseInt(category_id),
        featured: req.body.featured === 'on',
        active: true,
        image_url: mainImage,
        extra_images: imageUrls.slice(1, 10)
      };

      const newProduct = await Product.create(productData);
      
      // Sync images to product_images table
      await Product.update(newProduct.id, { ...productData, image_url: mainImage });

      req.flash('success_msg', 'Product created successfully');
      res.redirect('/admin/products');
    } catch (error) {
      console.error('Create product error:', error);
      req.flash('error_msg', 'Error creating product: ' + error.message);
      res.redirect('/admin/products/new');
    }
  },

  getEditProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);
      
      if (!product) {
        req.flash('error_msg', 'Product not found');
        return res.redirect('/admin/products');
      }

      const [categories, images] = await Promise.all([
        Category.findAll(),
        Product.getImages(id)
      ]);

      res.render('admin/products/edit', {
        title: 'Edit Product',
        currentUser: req.session.user,
        sidebar: true,
        activePage: 'products',
        product,
        categories,
        images
      });
    } catch (error) {
      console.error('Get edit product error:', error);
      req.flash('error_msg', 'Error loading product data');
      res.redirect('/admin/products');
    }
  },

  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        slug,
        description,
        price,
        stock_quantity,
        category_id,
        delete_images
      } = req.body;

      const existingProduct = await Product.findById(id);
      if (!existingProduct) {
        req.flash('error_msg', 'Product not found');
        return res.redirect('/admin/products');
      }

      // Handle marked deletions
      if (delete_images && Array.isArray(delete_images)) {
        for (const imageId of delete_images) {
          await Product.deleteImage(id, imageId);
        }
      }

      // Collect image URLs
      const existingImages = await Product.getImages(id);
      const imageUrls = existingImages.map(img => img.image_url);
      
      // Process uploaded files
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          imageUrls.push('/images/' + file.filename);
        });
      }

      const mainImageObj = existingImages.find(img => img.is_main) || { image_url: imageUrls[0] || '/images/placeholder.webp' };

      const productData = {
        ...existingProduct,
        name,
        slug,
        description,
        short_description: description ? description.substring(0, 150) : '',
        price: parseFloat(price),
        stock_quantity: parseInt(stock_quantity),
        category_id: parseInt(category_id),
        featured: req.body.featured === 'on',
        active: req.body.active === 'on',
        image_url: mainImageObj.image_url,
        extra_images: imageUrls.filter(url => url !== mainImageObj.image_url).slice(0, 9)
      };

      await Product.update(id, productData);

      req.flash('success_msg', 'Product updated successfully');
      res.redirect('/admin/products');
    } catch (error) {
      console.error('Update product error:', error);
      req.flash('error_msg', 'Error updating product: ' + error.message);
      res.redirect(`/admin/products/${req.params.id}/edit`);
    }
  },

  setMainImage: async (req, res) => {
    try {
      const { productId, imageId } = req.params;
      await Product.setMainImage(productId, imageId);
      req.flash('success_msg', 'Main image updated successfully');
      res.redirect(`/admin/products/${productId}/edit`);
    } catch (error) {
      console.error('Set main image error:', error);
      req.flash('error_msg', 'Error setting main image');
      res.redirect(`/admin/products/${req.params.productId}/edit`);
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await Product.delete(id);
      
      if (deleted) {
        req.flash('success_msg', 'Product deleted successfully');
      } else {
        req.flash('error_msg', 'Product not found or could not be deleted');
      }
      
      res.redirect('/admin/products');
    } catch (error) {
      console.error('Delete product error:', error);
      req.flash('error_msg', 'Error deleting product');
      res.redirect('/admin/products');
    }
  },

  // Get system logs (placeholder - would integrate with logger)
  getSystemLogs: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { limit = 100 } = req.query;

      // In a real application, this would query from a logs database or file
      // For now, return placeholder data
      const logs = [
        {
          id: 1,
          level: 'info',
          message: 'System started successfully',
          timestamp: new Date().toISOString()
        },
        {
          id: 2,
          level: 'info',
          message: 'Database connection established',
          timestamp: new Date().toISOString()
        }
      ];

      res.status(200).json({
        logs
      });
    } catch (error) {
      console.error('Get system logs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get low stock alerts
  getLowStockAlerts: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { threshold = 5 } = req.query;
      const lowStockProducts = await Product.getLowStock(parseInt(threshold));

      res.status(200).json({
        alerts: lowStockProducts.map(product => ({
          type: 'low_stock',
          product_id: product.id,
          product_name: product.name,
          current_stock: product.stock_quantity,
          threshold: product.low_stock_threshold,
          urgency: product.stock_quantity <= 0 ? 'critical' : 'warning'
        }))
      });
    } catch (error) {
      console.error('Get low stock alerts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get pending orders count
  getPendingOrdersCount: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const pendingCount = await Order.count({ status: 'pending' });

      res.status(200).json({
        pendingOrders: pendingCount
      });
    } catch (error) {
      console.error('Get pending orders count error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};