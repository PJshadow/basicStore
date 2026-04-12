import createMercadoPagoProvider from './MercadoPagoProvider.js';

/**
 * Payment Service (Manager)
 * Orchestrates different payment providers
 */
const createPaymentService = () => {
    const providers = {
        mercadopago: createMercadoPagoProvider(),
        // stripe: createStripeProvider(),
    };

    const activeProviderName = process.env.PAYMENT_PROVIDER || 'mercadopago';
    const activeProvider = providers[activeProviderName];

    if (!activeProvider) {
        throw new Error(`Payment provider "${activeProviderName}" not found`);
    }

    return {
        /**
         * Get the current active provider
         */
        getProvider: () => activeProvider,

        /**
         * Generic method to create checkout
         */
        createCheckout: (orderData, items, customer) => 
            activeProvider.createCheckout(orderData, items, customer),

        /**
         * Handle webhooks for a specific provider
         */
        handleWebhook: (providerName, payload) => {
            const provider = providers[providerName];
            if (!provider) throw new Error(`Provider ${providerName} not found`);
            return provider.handleWebhook(payload);
        }
    };
};

const paymentService = createPaymentService();
export default paymentService;
