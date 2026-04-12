import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import logger from '../../utils/logger.js';

/**
 * Mercado Pago Provider Factory
 * Documentation: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro
 */
const createMercadoPagoProvider = () => {
    const client = new MercadoPagoConfig({
        accessToken: process.env.MP_ACCESS_TOKEN,
        options: { timeout: 5000 }
    });

    const preference = new Preference(client);
    const payment = new Payment(client);

    /**
     * Creates a Checkout Pro preference
     */
    const createCheckout = async (orderData, items, customer) => {
        try {
            const body = {
                items: items.map(item => ({
                    id: String(item.product_id || item.id),
                    title: item.product_name || item.name || 'Product',
                    unit_price: Number(item.price || item.unit_price),
                    quantity: Number(item.quantity),
                    currency_id: 'BRL',
                    category_id: 'others'
                })),
                back_urls: {
                    success: `${process.env.APP_URL}/payment/success`,
                    failure: `${process.env.APP_URL}/payment/failure`,
                    pending: `${process.env.APP_URL}/payment/pending`
                },
                external_reference: String(orderData.id),
                notification_url: `${process.env.WEBHOOK_URL}/payment/webhook/mercadopago`,
                binary_mode: true,
            };

            logger.info('Creating Mercado Pago preference with body:', JSON.stringify(body, null, 2));

            const response = await preference.create({ body });

            return {
                id: response.id,
                init_point: response.init_point,
                sandbox_init_point: response.sandbox_init_point,
                provider: 'mercadopago'
            };
        } catch (error) {
            logger.error('MercadoPago Preference creation failed:', error);
            throw error;
        }
    };

    /**
     * Gets payment details
     */
    const getPaymentStatus = async (paymentId) => {
        try {
            const paymentData = await payment.get({ id: paymentId });

            // Normalize status
            let status = 'pending';
            if (paymentData.status === 'approved') status = 'completed';
            if (paymentData.status === 'rejected') status = 'failed';
            if (paymentData.status === 'cancelled') status = 'cancelled';
            if (paymentData.status === 'in_process') status = 'processing';

            return {
                payment_id: String(paymentData.id),
                order_id: paymentData.external_reference,
                status: status,
                raw_status: paymentData.status,
                payment_method: paymentData.payment_method_id,
                amount: paymentData.transaction_amount,
                provider: 'mercadopago'
            };
        } catch (error) {
            logger.error('MercadoPago getPaymentStatus failed:', error);
            throw error;
        }
    };

    /**
     * Handles Webhooks
     */
    const handleWebhook = async (payload) => {
        try {
            const { type, data } = payload;

            if (type === 'payment') {
                return await getPaymentStatus(data.id);
            }

            return null;
        } catch (error) {
            logger.error('MercadoPago Webhook handling failed:', error);
            throw error;
        }
    };

    return {
        createCheckout,
        handleWebhook,
        getPaymentStatus
    };
};

export default createMercadoPagoProvider;
