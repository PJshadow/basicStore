// Coupon Controller
// Handles coupon CRUD operations, validation, etc.

import Coupon from '../models/Coupon.js';
import { validationResult } from 'express-validator';

export default {
  // Create new coupon (admin only)
  createCoupon: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.userRole || req.session.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const couponData = req.body;

      // Check if coupon code already exists
      const existingCoupon = await Coupon.findByCode(couponData.code);
      if (existingCoupon) {
        return res.status(400).json({ error: 'Coupon code already exists' });
      }

      const newCoupon = await Coupon.create(couponData);

      res.status(201).json({
        message: 'Coupon created successfully',
        coupon: newCoupon
      });
    } catch (error) {
      console.error('Create coupon error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all coupons
  getAllCoupons: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        activeOnly = false
      } = req.query;

      const coupons = await Coupon.findAll(
        parseInt(page),
        parseInt(limit),
        activeOnly === 'true'
      );

      const totalCoupons = await Coupon.count(activeOnly === 'true');
      const totalPages = Math.ceil(totalCoupons / parseInt(limit));

      res.status(200).json({
        coupons,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCoupons,
          limit: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      });
    } catch (error) {
      console.error('Get all coupons error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get coupon by ID
  getCouponById: async (req, res) => {
    try {
      const { id } = req.params;
      const coupon = await Coupon.findById(id);

      if (!coupon) {
        return res.status(404).json({ error: 'Coupon not found' });
      }

      res.status(200).json({
        coupon
      });
    } catch (error) {
      console.error('Get coupon by ID error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get coupon by code
  getCouponByCode: async (req, res) => {
    try {
      const { code } = req.params;
      const coupon = await Coupon.findByCode(code);

      if (!coupon) {
        return res.status(404).json({ error: 'Coupon not found' });
      }

      res.status(200).json({
        coupon
      });
    } catch (error) {
      console.error('Get coupon by code error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update coupon (admin only)
  updateCoupon: async (req, res) => {
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
      const couponData = req.body;

      // Check if coupon exists
      const existingCoupon = await Coupon.findById(id);
      if (!existingCoupon) {
        return res.status(404).json({ error: 'Coupon not found' });
      }

      // Check if code is being changed and already exists
      if (couponData.code && couponData.code !== existingCoupon.code) {
        const couponWithCode = await Coupon.findByCode(couponData.code);
        if (couponWithCode) {
          return res.status(400).json({ error: 'Coupon code already exists' });
        }
      }

      const updated = await Coupon.update(id, couponData);
      if (!updated) {
        return res.status(404).json({ error: 'Coupon not found' });
      }

      const updatedCoupon = await Coupon.findById(id);

      res.status(200).json({
        message: 'Coupon updated successfully',
        coupon: updatedCoupon
      });
    } catch (error) {
      console.error('Update coupon error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete coupon (admin only)
  deleteCoupon: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.userRole || req.session.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.params;

      // Check if coupon exists
      const existingCoupon = await Coupon.findById(id);
      if (!existingCoupon) {
        return res.status(404).json({ error: 'Coupon not found' });
      }

      const deleted = await Coupon.delete(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Coupon not found' });
      }

      res.status(200).json({
        message: 'Coupon deleted successfully'
      });
    } catch (error) {
      console.error('Delete coupon error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Validate coupon
  validateCoupon: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { code, orderAmount } = req.body;
      const userId = req.session.customerId || null;

      const validation = await Coupon.validate(code, userId, parseFloat(orderAmount));

      res.status(200).json(validation);
    } catch (error) {
      console.error('Validate coupon error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get coupon statistics (admin only)
  getCouponStatistics: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.userRole || req.session.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const statistics = await Coupon.getStatistics();

      res.status(200).json({
        statistics
      });
    } catch (error) {
      console.error('Get coupon statistics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get active coupons
  getActiveCoupons: async (req, res) => {
    try {
      const coupons = await Coupon.getActive();

      res.status(200).json({
        coupons
      });
    } catch (error) {
      console.error('Get active coupons error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get expired coupons (admin only)
  getExpiredCoupons: async (req, res) => {
    try {
      // Check admin authentication
      if (!req.session.userRole || req.session.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const coupons = await Coupon.getExpired();

      res.status(200).json({
        coupons
      });
    } catch (error) {
      console.error('Get expired coupons error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};