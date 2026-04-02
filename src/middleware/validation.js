// Validation Middleware
// Uses express-validator for request validation

import { body, param, query, validationResult } from 'express-validator';

/**
 * Common validation rules
 */
export const validationRules = {
  // User validation
  userRegister: [
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
    body('role')
      .optional()
      .isIn(['admin', 'manager', 'staff']).withMessage('Invalid role')
  ],
  
  userLogin: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format'),
    
    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  
  userUpdate: [
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    
    body('role')
      .optional()
      .isIn(['admin', 'manager', 'staff']).withMessage('Invalid role')
  ],
  
  // Customer validation
  customerCreate: [
    body('first_name')
      .trim()
      .notEmpty().withMessage('First name is required')
      .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
    
    body('last_name')
      .trim()
      .notEmpty().withMessage('Last name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
    
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    
    body('phone')
      .optional()
      .trim()
      .matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone number format'),
    
    body('address').optional().trim(),
    body('city').optional().trim(),
    body('state').optional().trim(),
    body('zip_code').optional().trim(),
    body('country').optional().trim()
  ],
  
  // Product validation
  productCreate: [
    body('name')
      .trim()
      .notEmpty().withMessage('Product name is required')
      .isLength({ min: 3, max: 200 }).withMessage('Product name must be between 3 and 200 characters'),
    
    body('slug')
      .trim()
      .notEmpty().withMessage('Slug is required')
      .matches(/^[a-z0-9\-]+$/).withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
    
    body('description').optional().trim(),
    body('short_description').optional().trim(),
    
    body('sku')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('SKU cannot exceed 50 characters'),
    
    body('price')
      .notEmpty().withMessage('Price is required')
      .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    
    body('sale_price')
      .optional()
      .isFloat({ min: 0 }).withMessage('Sale price must be a positive number'),
    
    body('cost')
      .optional()
      .isFloat({ min: 0 }).withMessage('Cost must be a positive number'),
    
    body('stock_quantity')
      .optional()
      .isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
    
    body('low_stock_threshold')
      .optional()
      .isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),
    
    body('category_id')
      .optional()
      .isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
    
    body('featured')
      .optional()
      .isBoolean().withMessage('Featured must be a boolean value'),
    
    body('active')
      .optional()
      .isBoolean().withMessage('Active must be a boolean value'),
    
    body('image_url')
      .optional()
      .isURL().withMessage('Image URL must be a valid URL')
  ],
  
  // Order validation
  orderCreate: [
    body('customer_id')
      .notEmpty().withMessage('Customer ID is required')
      .isInt({ min: 1 }).withMessage('Customer ID must be a positive integer'),
    
    body('items')
      .isArray({ min: 1 }).withMessage('Order must contain at least one item'),
    
    body('items.*.product_id')
      .isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
    
    body('items.*.quantity')
      .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    
    body('coupon_code').optional().trim(),
    body('shipping_address').optional().trim(),
    body('billing_address').optional().trim(),
    body('payment_method').optional().trim(),
    body('notes').optional().trim()
  ],
  
  // Coupon validation
  couponCreate: [
    body('code')
      .trim()
      .notEmpty().withMessage('Coupon code is required')
      .isLength({ min: 3, max: 50 }).withMessage('Coupon code must be between 3 and 50 characters')
      .matches(/^[A-Z0-9\-_]+$/).withMessage('Coupon code can only contain uppercase letters, numbers, hyphens, and underscores'),
    
    body('discount_type')
      .notEmpty().withMessage('Discount type is required')
      .isIn(['percentage', 'fixed']).withMessage('Discount type must be either "percentage" or "fixed"'),
    
    body('discount_value')
      .notEmpty().withMessage('Discount value is required')
      .isFloat({ min: 0 }).withMessage('Discount value must be a positive number'),
    
    body('minimum_order_amount')
      .optional()
      .isFloat({ min: 0 }).withMessage('Minimum order amount must be a positive number'),
    
    body('maximum_discount_amount')
      .optional()
      .isFloat({ min: 0 }).withMessage('Maximum discount amount must be a positive number'),
    
    body('usage_limit')
      .optional()
      .isInt({ min: 1 }).withMessage('Usage limit must be a positive integer'),
    
    body('usage_limit_per_user')
      .optional()
      .isInt({ min: 1 }).withMessage('Usage limit per user must be a positive integer'),
    
    body('valid_from')
      .optional()
      .isISO8601().withMessage('Valid from must be a valid date'),
    
    body('valid_until')
      .optional()
      .isISO8601().withMessage('Valid until must be a valid date'),
    
    body('active')
      .optional()
      .isBoolean().withMessage('Active must be a boolean value')
  ],
  
  // ID validation (for route parameters)
  idParam: [
    param('id')
      .isInt({ min: 1 }).withMessage('ID must be a positive integer')
  ],
  
  // Pagination validation
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ]
};

/**
 * Middleware to handle validation errors
 */
export const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    for (const validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    // Format errors
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));
    
    return res.status(400).json({
      error: 'Validation failed',
      errors: formattedErrors
    });
  };
};

/**
 * Sanitize input data
 */
export const sanitizeInput = (req, res, next) => {
  // Trim string fields
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }
  
  next();
};

/**
 * Validate file uploads
 */
export const validateFileUpload = (allowedTypes = ['image/jpeg', 'image/png', 'image/gif'], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }
    
    // Check file type
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: `Allowed file types: ${allowedTypes.join(', ')}`
      });
    }
    
    // Check file size
    if (req.file.size > maxSize) {
      return res.status(400).json({
        error: 'File too large',
        message: `Maximum file size is ${maxSize / (1024 * 1024)}MB`
      });
    }
    
    next();
  };
};

export default {
  validationRules,
  validate,
  sanitizeInput,
  validateFileUpload
};