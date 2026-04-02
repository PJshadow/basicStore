// Helper Functions
// General utility functions used throughout the application

import crypto from 'crypto';

/**
 * Generate a random string of specified length
 */
export const generateRandomString = (length = 32) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

/**
 * Generate a unique slug from a string
 */
export const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/--+/g, '-')     // Replace multiple hyphens with single hyphen
    .trim();
};

/**
 * Format currency
 */
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
};

/**
 * Format date
 */
export const formatDate = (date, format = 'medium') => {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  const options = {
    short: {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    },
    medium: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    },
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }
  };
  
  return dateObj.toLocaleDateString('en-US', options[format] || options.medium);
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format (basic)
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

/**
 * Calculate pagination metadata
 */
export const calculatePagination = (totalItems, currentPage = 1, pageSize = 10) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  
  return {
    totalItems,
    totalPages,
    currentPage,
    pageSize,
    startItem,
    endItem,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages
  };
};

/**
 * Sanitize HTML to prevent XSS attacks
 */
export const sanitizeHTML = (html) => {
  if (typeof html !== 'string') return html;
  
  // Basic sanitization - in a real app, use a library like DOMPurify
  return html
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Generate order number
 */
export const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
};

/**
 * Calculate tax amount (simplified)
 */
export const calculateTax = (subtotal, taxRate = 0.08) => {
  return subtotal * taxRate;
};

/**
 * Calculate shipping cost (simplified)
 */
export const calculateShipping = (subtotal, method = 'standard') => {
  const rates = {
    standard: subtotal > 50 ? 0 : 5.99,
    express: 12.99,
    overnight: 24.99
  };
  
  return rates[method] || rates.standard;
};

/**
 * Deep clone an object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Parse query string to object
 */
export const parseQueryString = (queryString) => {
  const params = new URLSearchParams(queryString);
  const result = {};
  
  for (const [key, value] of params) {
    result[key] = value;
  }
  
  return result;
};

/**
 * Convert object to query string
 */
export const toQueryString = (obj) => {
  const params = new URLSearchParams();
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  }
  
  return params.toString();
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Get file size in human readable format
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Generate password hash (wrapper for bcrypt)
 */
export const generatePasswordHash = async (password) => {
  // This would use bcrypt in a real implementation
  // For now, return a placeholder
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
  // In real implementation: return bcrypt.hash(password, saltRounds);
  return `hashed_${password}_${saltRounds}`; // Placeholder
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Generate CSV from array of objects
 */
export const generateCSV = (data, headers = null) => {
  if (!data || data.length === 0) return '';
  
  const actualHeaders = headers || Object.keys(data[0]);
  
  const csvRows = [
    actualHeaders.join(','),
    ...data.map(row => 
      actualHeaders.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma or quote
        const escaped = ('' + value).replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') 
          ? `"${escaped}"` 
          : escaped;
      }).join(',')
    )
  ];
  
  return csvRows.join('\n');
};

/**
 * Delay execution
 */
export const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
};

/**
 * Get current timestamp in ISO format
 */
export const getTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Generate a unique ID
 */
export const generateId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}${timestamp}${random}`;
};

export default {
  generateRandomString,
  generateSlug,
  formatCurrency,
  formatDate,
  truncateText,
  isValidEmail,
  isValidPhone,
  calculatePagination,
  sanitizeHTML,
  generateOrderNumber,
  calculateTax,
  calculateShipping,
  deepClone,
  debounce,
  throttle,
  parseQueryString,
  toQueryString,
  getFileExtension,
  formatFileSize,
  generatePasswordHash,
  validatePasswordStrength,
  generateCSV,
  delay,
  isEmpty,
  getTimestamp,
  generateId
};