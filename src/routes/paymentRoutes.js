import express from 'express';
const router = express.Router();
import paymentController from '../controllers/paymentController.js';
import { isAuthenticated } from '../middleware/auth.js';

// Checkout creation
router.post('/checkout', isAuthenticated, paymentController.createCheckout);

// Return URLs for Checkout Pro
router.get('/success', paymentController.paymentSuccess);
router.get('/failure', paymentController.paymentFailure);
router.get('/pending', paymentController.paymentPending);

// Webhook (No auth required, the provider calls this)
router.post('/webhook/:provider', paymentController.handleWebhook);

export default router;
