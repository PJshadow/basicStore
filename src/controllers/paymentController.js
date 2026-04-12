import paymentService from '../services/payment/PaymentService.js';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import logger from '../utils/logger.js';

const paymentController = {
    /**
     * Creates a checkout session and redirects the user
     */
    createCheckout: async (req, res) => {
        try {
            const { orderId } = req.body;
            
            // 1. Get order details
            const order = await Order.getById(orderId);
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            // 2. Get customer details
            const customer = await Customer.getById(order.customer_id);
            
            // 3. Get items
            const items = await Order.getItems(orderId);

            // 4. Create checkout through service
            const checkoutData = await paymentService.createCheckout(order, items, customer);

            // 5. Return the redirect URL (init_point)
            res.json({
                url: checkoutData.init_point,
                id: checkoutData.id
            });
        } catch (error) {
            logger.error('Checkout creation error:', error);
            res.status(500).json({ error: 'Internal server error during checkout' });
        }
    },

    /**
     * Handles webhook notifications
     */
    handleWebhook: async (req, res) => {
        const { provider } = req.params;
        const payload = req.body;

        try {
            logger.info(`Received webhook from ${provider}`);
            
            const result = await paymentService.handleWebhook(provider, payload);

            if (result) {
                // Update order status based on normalized result
                await Order.updateStatus(result.order_id, result.status);
                logger.info(`Order ${result.order_id} updated to ${result.status} via ${provider}`);
            }

            // Always respond with 200/201 to the gateway
            res.status(200).send('OK');
        } catch (error) {
            logger.error(`Webhook error (${provider}):`, error);
            res.status(200).send('Error but received');
        }
    },

    /**
     * Success return page
     */
    paymentSuccess: (req, res) => {
        res.render('home/payment-status', {
            title: 'Payment Successful',
            status: 'success',
            message: 'Your payment was processed successfully!'
        });
    },

    /**
     * Failure return page
     */
    paymentFailure: (req, res) => {
        res.render('home/payment-status', {
            title: 'Payment Failed',
            status: 'failure',
            message: 'There was an error processing your payment. Please try again.'
        });
    },

    /**
     * Pending return page
     */
    paymentPending: (req, res) => {
        res.render('home/payment-status', {
            title: 'Payment Pending',
            status: 'pending',
            message: 'Your payment is being processed.'
        });
    }
};

export default paymentController;
