// Customer Controller
// Handles customer CRUD operations, profile management, etc.

import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import { validationResult } from 'express-validator';

export default {
  // Create new customer
  createCustomer: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const customerData = req.body;

      // Check if email already exists
      const existingCustomer = await Customer.findByEmail(customerData.email);
      if (existingCustomer) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const newCustomer = await Customer.create(customerData);

      res.status(201).json({
        message: 'Customer created successfully',
        customer: newCustomer
      });
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all customers (admin only)
  getAllCustomers: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const {
        page = 1,
        limit = 10,
        search = ''
      } = req.query;

      const customers = await Customer.findAll(
        parseInt(page),
        parseInt(limit),
        search
      );

      const totalCustomers = await Customer.count(search);
      const totalPages = Math.ceil(totalCustomers / parseInt(limit));

      res.render('admin/customers/list', {
        title: 'Customer Management',
        currentUser: req.session.user,
        sidebar: true,
        activePage: 'customers',
        customers,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCustomers,
          limit: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      });
    } catch (error) {
      console.error('Get all customers error:', error);
      req.flash('error_msg', 'Internal server error');
      res.redirect('/admin');
    }
  },

  // Get customer by ID
  getCustomerById: async (req, res) => {
    try {
      const { id } = req.params;

      // Check permissions
      if (req.session.userRole !== 'admin' && 
          req.session.customerId !== parseInt(id)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const customer = await Customer.findById(id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.status(200).json({
        customer
      });
    } catch (error) {
      console.error('Get customer by ID error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update customer
  updateCustomer: async (req, res) => {
    try {
      const { id } = req.params;

      // Check permissions
      if (req.session.userRole !== 'admin' && 
          req.session.customerId !== parseInt(id)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const customerData = req.body;

      // Check if customer exists
      const existingCustomer = await Customer.findById(id);
      if (!existingCustomer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Check if email is being changed and already exists
      if (customerData.email && customerData.email !== existingCustomer.email) {
        const customerWithEmail = await Customer.findByEmail(customerData.email);
        if (customerWithEmail) {
          return res.status(400).json({ error: 'Email already registered' });
        }
      }

      const updated = await Customer.update(id, customerData);
      if (!updated) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const updatedCustomer = await Customer.findById(id);

      res.status(200).json({
        message: 'Customer updated successfully',
        customer: updatedCustomer
      });
    } catch (error) {
      console.error('Update customer error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete customer (admin only)
  deleteCustomer: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.params;

      // Check if customer exists
      const existingCustomer = await Customer.findById(id);
      if (!existingCustomer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const deleted = await Customer.delete(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.status(200).json({
        message: 'Customer deleted successfully'
      });
    } catch (error) {
      console.error('Delete customer error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get customer orders
  getCustomerOrders: async (req, res) => {
    try {
      const { id } = req.params;

      // Check permissions
      if (req.session.userRole !== 'admin' && 
          req.session.customerId !== parseInt(id)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const orders = await Customer.getOrders(id);

      res.status(200).json({
        orders
      });
    } catch (error) {
      console.error('Get customer orders error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get customer statistics
  getCustomerStatistics: async (req, res) => {
    try {
      const { id } = req.params;

      // Check permissions
      if (req.session.userRole !== 'admin' && 
          req.session.customerId !== parseInt(id)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const statistics = await Customer.getStatistics(id);

      res.status(200).json({
        statistics
      });
    } catch (error) {
      console.error('Get customer statistics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Search customers
  searchCustomers: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { query } = req.query;

      if (!query || query.length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters' });
      }

      const customers = await Customer.findAll(1, 20, query);

      res.status(200).json({
        customers
      });
    } catch (error) {
      console.error('Search customers error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Render customer profile
  getProfile: async (req, res) => {
    try {
      const email = req.session.user.email;
      let customer = await Customer.findByEmail(email);

      if (!customer) {
        // Create customer if it doesn't exist but user does
        customer = await Customer.create({
          first_name: req.session.user.username,
          last_name: '',
          email: email
        });
      }

      res.render('customer/profile', {
        title: 'My Profile',
        customer,
        activePage: 'profile'
      });
    } catch (error) {
      console.error('Get profile error:', error);
      req.flash('error_msg', 'Could not load profile');
      res.redirect('/');
    }
  },

  // Update customer profile
  updateProfile: async (req, res) => {
    try {
      const email = req.session.user.email;
      const customer = await Customer.findByEmail(email);
      
      if (!customer) {
        req.flash('error_msg', 'Customer not found');
        return res.redirect('/profile');
      }

      const { first_name, last_name, phone, address, city, country } = req.body;
      
      await Customer.update(customer.id, {
        first_name,
        last_name,
        email: customer.email, // email is fixed
        phone,
        address,
        city,
        country,
        state: customer.state,
        zip_code: customer.zip_code
      });

      req.flash('success_msg', 'Profile updated successfully');
      res.redirect('/profile');
    } catch (error) {
      console.error('Update profile error:', error);
      req.flash('error_msg', 'Could not update profile');
      res.redirect('/profile');
    }
  },

  // Render customer orders
  getOrders: async (req, res) => {
    try {
      const email = req.session.user.email;
      const customer = await Customer.findByEmail(email);

      let orders = [];
      if (customer) {
        orders = await Customer.getOrders(customer.id);
      }

      res.render('customer/orders', {
        title: 'My Orders',
        orders,
        activePage: 'orders'
      });
    } catch (error) {
      console.error('Get orders error:', error);
      req.flash('error_msg', 'Could not load orders');
      res.redirect('/');
    }
  },

  // Render order details
  getOrderDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const email = req.session.user.email;
      const customer = await Customer.findByEmail(email);

      if (!customer) {
        req.flash('error_msg', 'Customer record not found');
        return res.redirect('/orders');
      }

      const order = await Order.getWithItems(id);

      if (!order) {
        req.flash('error_msg', 'Order not found');
        return res.redirect('/orders');
      }

      // Ensure this order belongs to the current customer
      if (order.customer_id !== customer.id) {
        req.flash('error_msg', 'Unauthorized to view this order');
        return res.redirect('/orders');
      }

      res.render('customer/order-detail', {
        title: `Order #${order.order_number}`,
        order,
        activePage: 'orders'
      });
    } catch (error) {
      console.error('Get order detail error:', error);
      req.flash('error_msg', 'Could not load order details');
      res.redirect('/orders');
    }
  }
};