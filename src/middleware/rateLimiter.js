import rateLimit from 'express-rate-limit';

/**
 * Standard handler for rate limit exceeded.
 * Redirects back with a flash message for HTML requests,
 * or returns a JSON error for API requests.
 */
const rateLimitHandler = (req, res, next, options) => {
  if (req.accepts('html')) {
    req.flash('error_msg', options.message.error_msg || 'Too many requests, please try again later.');
    res.redirect('back');
  } else {
    res.status(options.statusCode).send(options.message);
  }
};

/**
 * Rate limiter for checkout and payment routes to prevent brute-force
 * or "carding" bots.
 */
export const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error_msg: 'Too many checkout attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * More strict limiter for applying coupons.
 */
export const couponLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Limit each IP to 5 coupon attempts per 10 minutes
  message: {
    error_msg: 'Too many coupon attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * General auth limiter for login/register
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 failed attempts per hour
  message: {
    error_msg: 'Too many login attempts, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * Limiter for contact form to prevent spam
 */
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 contact messages per hour
  message: {
    error_msg: 'Too many messages sent. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});
