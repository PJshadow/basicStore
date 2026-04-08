// Order Controller
// Handles order CRUD operations, status updates, etc.

import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import { validationResult } from 'express-validator';

export default {
  // GET Admin Orders (for EJS view)
  getAdminOrders: async (req, res) => {
    try {
      const orders = await Order.findAll({ limit: 100 });
      
      // Map names for the view
      const mappedOrders = orders.map(order => ({
        ...order,
        customer_name: `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Guest',
        customer_email: order.email
      }));

      res.render('admin/orders/list', {
        title: 'Order Management',
        orders: mappedOrders,
        currentUser: req.session.user,
        sidebar: true,
        activePage: 'orders'
      });
    } catch (error) {
      console.error('Error loading admin orders:', error);
      req.flash('error_msg', 'Error loading orders');
      res.render('admin/orders/list', {
        title: 'Order Management',
        orders: [],
        currentUser: req.session.user,
        sidebar: true,
        activePage: 'orders'
      });
    }
  },

  // Create new order
  createOrder: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        customer_id,
        items,
        coupon_code,
        shipping_address,
        billing_address,
        payment_method,
        notes
      } = req.body;

      // Validate customer exists
      const customer = await Customer.findById(customer_id);
      if (!customer) {
        return res.status(400).json({ error: 'Customer not found' });
      }

      // Validate items
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Order must contain at least one item' });
      }

      let subtotal = 0;
      const validatedItems = [];

      // Validate each item
      for (const item of items) {
        const { product_id, quantity } = item;

        // Validate product exists and is active
        const product = await Product.findById(product_id);
        if (!product || !product.active) {
          return res.status(400).json({ error: `Product ${product_id} not found or inactive` });
        }

        // Validate stock
        const stockValidation = await OrderItem.validateStock(product_id, quantity);
        if (!stockValidation.valid) {
          return res.status(400).json({ error: stockValidation.message });
        }

        // Calculate prices
        const unit_price = product.sale_price || product.price;
        const total_price = OrderItem.calculateTotal(quantity, unit_price);

        validatedItems.push({
          product_id,
          quantity,
          unit_price,
          total_price
        });

        subtotal += total_price;
      }

      // Apply coupon if provided
      let tax_amount = 0; // Simplified - in real app, calculate based on location
      let shipping_amount = 0; // Simplified - in real app, calculate based on shipping method
      let discountAmount = 0;

      if (coupon_code) {
        const couponValidation = await Coupon.validate(coupon_code, customer_id, subtotal);
        if (!couponValidation.valid) {
          return res.status(400).json({ error: couponValidation.message });
        }
        discountAmount = couponValidation.discountAmount;
      }

      const total_amount = subtotal + tax_amount + shipping_amount - discountAmount;

      // Create order data
      const orderData = {
        customer_id,
        status: 'pending',
        subtotal,
        tax_amount,
        shipping_amount,
        total_amount,
        payment_method,
        shipping_address,
        billing_address,
        notes,
        items: validatedItems
      };

      // Create order
      const newOrder = await Order.create(orderData);

      // Apply coupon if valid
      if (coupon_code && discountAmount > 0) {
        const coupon = await Coupon.findByCode(coupon_code);
        await Coupon.recordUsage(coupon.id, newOrder.id, customer_id);
      }

      // Get full order details with items
      const orderWithItems = await Order.getWithItems(newOrder.id);

      res.status(201).json({
        message: 'Order created successfully',
        order: orderWithItems
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all orders (admin only or customer's own orders)
  getAllOrders: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        startDate,
        endDate,
        search
      } = req.query;

      let customerId = null;

      // If not admin, only show customer's own orders
      if (req.session.userRole !== 'admin' && req.session.customerId) {
        customerId = req.session.customerId;
      }

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        customerId,
        status,
        startDate,
        endDate,
        search
      };

      const orders = await Order.findAll(filters);
      const totalOrders = await Order.count(filters);
      const totalPages = Math.ceil(totalOrders / filters.limit);

      res.status(200).json({
        orders,
        pagination: {
          currentPage: filters.page,
          totalPages,
          totalOrders,
          limit: filters.limit,
          hasNextPage: filters.page < totalPages,
          hasPrevPage: filters.page > 1
        }
      });
    } catch (error) {
      console.error('Get all orders error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get order by ID
  getOrderById: async (req, res) => {
    try {
      const { id } = req.params;
      const order = await Order.getWithItems(id);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check permissions
      if (req.session.userRole !== 'admin' && 
          req.session.customerId !== order.customer_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.status(200).json({
        order
      });
    } catch (error) {
      console.error('Get order by ID error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get order by order number
  getOrderByNumber: async (req, res) => {
    try {
      const { orderNumber } = req.params;
      const order = await Order.findByOrderNumber(orderNumber);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check permissions
      if (req.session.userRole !== 'admin' && 
          req.session.customerId !== order.customer_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const items = await Order.getItems(order.id);
      order.items = items;

      res.status(200).json({
        order
      });
    } catch (error) {
      console.error('Get order by number error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update order status (admin only)
  updateOrderStatus: async (req, res) => {
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
      const { status } = req.body;

      // Check if order exists
      const existingOrder = await Order.findById(id);
      if (!existingOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const updated = await Order.updateStatus(id, status);
      if (!updated) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const updatedOrder = await Order.getWithItems(id);

      res.status(200).json({
        message: 'Order status updated successfully',
        order: updatedOrder
      });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update order (admin only)
  updateOrder: async (req, res) => {
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
      const orderData = req.body;

      // Check if order exists
      const existingOrder = await Order.findById(id);
      if (!existingOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const updated = await Order.update(id, orderData);
      if (!updated) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const updatedOrder = await Order.getWithItems(id);

      res.status(200).json({
        message: 'Order updated successfully',
        order: updatedOrder
      });
    } catch (error) {
      console.error('Update order error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete order (admin only)
  deleteOrder: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.userRole || req.session.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.params;

      // Check if order exists
      const existingOrder = await Order.findById(id);
      if (!existingOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const deleted = await Order.delete(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.status(200).json({
        message: 'Order deleted successfully'
      });
    } catch (error) {
      console.error('Delete order error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get customer orders
  getCustomerOrders: async (req, res) => {
    try {
      const { customerId } = req.params;
      const {
        page = 1,
        limit = 10,
        status
      } = req.query;

      // Check permissions
      if (req.session.userRole !== 'admin' && 
          req.session.customerId !== parseInt(customerId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        customerId: parseInt(customerId),
        status
      };

      const orders = await Order.findAll(filters);
      const totalOrders = await Order.count(filters);
      const totalPages = Math.ceil(totalOrders / filters.limit);

      res.status(200).json({
        orders,
        pagination: {
          currentPage: filters.page,
          totalPages,
          totalOrders,
          limit: filters.limit,
          hasNextPage: filters.page < totalPages,
          hasPrevPage: filters.page > 1
        }
      });
    } catch (error) {
      console.error('Get customer orders error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get order statistics (admin only)
  getOrderStatistics: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.userRole || req.session.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { startDate, endDate } = req.query;
      const statistics = await Order.getStatistics(startDate, endDate);

      res.status(200).json({
        statistics
      });
    } catch (error) {
      console.error('Get order statistics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get revenue by period (admin only)
  getRevenueByPeriod: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.userRole || req.session.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { period = 'day', limit = 30 } = req.query;
      const revenueData = await Order.getRevenueByPeriod(period, parseInt(limit));

      res.status(200).json({
        revenueData
      });
    } catch (error) {
      console.error('Get revenue by period error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get top selling products (admin only)
  getTopSellingProducts: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.userRole || req.session.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { limit = 10, startDate, endDate } = req.query;
      const topProducts = await OrderItem.getTopSelling(parseInt(limit), startDate, endDate);

      res.status(200).json({
        topProducts
      });
    } catch (error) {
      console.error('Get top selling products error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};