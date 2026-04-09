import cron from 'node-cron';
import Order from '../models/Order.js';
import logger from './logger.js';

/**
 * Initialize all cron jobs for the application
 */
const initCronJobs = () => {
  // Job to cancel expired pending orders every 15 minutes
  // This helps release stock for abandoned checkouts
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running cron job: Cancel expired pending orders');
    try {
      const threshold = parseInt(process.env.ORDER_EXPIRATION_MINUTES) || 30;
      const results = await Order.cancelExpiredPendingOrders(threshold);
      if (results.processed > 0) {
        logger.info(`Expired orders cleanup (Threshold: ${threshold}m): Processed ${results.processed}, Success: ${results.success}, Failed: ${results.failed}`);
      }
    } catch (error) {
      logger.error('Error in cancelExpiredPendingOrders cron job:', error);
    }
  });

  logger.info('Cron jobs initialized');
};

export default initCronJobs;
