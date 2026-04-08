import express from 'express';
import customerController from '../controllers/customerController.js';

const router = express.Router();

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Please login to access this page');
  res.redirect('/auth/login');
};

// Customer profile routes
router.get('/profile', isLoggedIn, customerController.getProfile);
router.post('/profile', isLoggedIn, customerController.updateProfile);
router.put('/profile', isLoggedIn, customerController.updateProfile);

// Customer orders routes
router.get('/orders', isLoggedIn, customerController.getOrders);
router.get('/orders/:id', isLoggedIn, customerController.getOrderDetail);

export default router;
