// Validators Utility
// Additional validation functions beyond express-validator

/**
 * Validate credit card number using Luhn algorithm
 */
export const isValidCreditCard = (cardNumber) => {
  // Remove non-digit characters
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  // Check length
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return false;
  }
  
  // Luhn algorithm
  let sum = 0;
  let isEven = false;
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

/**
 * Validate credit card expiration date
 */
export const isValidExpirationDate = (month, year) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // January is 1
  
  // Convert year to full year (e.g., 25 -> 2025)
  const fullYear = year < 100 ? 2000 + year : year;
  
  // Check if year is in the past
  if (fullYear < currentYear) {
    return false;
  }
  
  // If current year, check if month is in the past
  if (fullYear === currentYear && month < currentMonth) {
    return false;
  }
  
  // Check if month is valid
  if (month < 1 || month > 12) {
    return false;
  }
  
  return true;
};

/**
 * Validate CVV code
 */
export const isValidCVV = (cvv, cardType = 'generic') => {
  const cvvLength = {
    'amex': 4,
    'generic': 3
  };
  
  const expectedLength = cvvLength[cardType] || 3;
  
  return /^\d+$/.test(cvv) && cvv.length === expectedLength;
};

/**
 * Validate URL
 */
export const isValidURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate IP address
 */
export const isValidIP = (ip) => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

/**
 * Validate postal/zip code
 */
export const isValidPostalCode = (postalCode, country = 'US') => {
  const patterns = {
    'US': /^\d{5}(-\d{4})?$/,
    'CA': /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
    'UK': /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/,
    'AU': /^\d{4}$/,
    'DE': /^\d{5}$/,
    'FR': /^\d{5}$/,
    'JP': /^\d{3}-\d{4}$/,
    'BR': /^\d{5}-\d{3}$/
  };
  
  const pattern = patterns[country.toUpperCase()] || patterns['US'];
  return pattern.test(postalCode);
};

/**
 * Validate phone number with country code
 */
export const isValidPhoneWithCountry = (phone, country = 'US') => {
  const patterns = {
    'US': /^\+1\d{10}$/,
    'CA': /^\+1\d{10}$/,
    'UK': /^\+44\d{10}$/,
    'AU': /^\+61\d{9}$/,
    'DE': /^\+49\d{10,11}$/,
    'FR': /^\+33\d{9}$/,
    'JP': /^\+81\d{9,10}$/,
    'BR': /^\+55\d{10,11}$/
  };
  
  const pattern = patterns[country.toUpperCase()];
  if (!pattern) {
    // Generic international format
    return /^\+\d{1,3}\d{6,14}$/.test(phone);
  }
  
  return pattern.test(phone);
};

/**
 * Validate date is in the future
 */
export const isFutureDate = (date) => {
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return inputDate > today;
};

/**
 * Validate date is in the past
 */
export const isPastDate = (date) => {
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return inputDate < today;
};

/**
 * Validate age is at least minimum age
 */
export const isValidAge = (birthDate, minAge = 18) => {
  const birth = new Date(birthDate);
  const today = new Date();
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age >= minAge;
};

/**
 * Validate file type by extension
 */
export const isValidFileType = (filename, allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf']) => {
  const extension = filename.split('.').pop().toLowerCase();
  return allowedExtensions.includes(extension);
};

/**
 * Validate file size
 */
export const isValidFileSize = (fileSize, maxSizeMB = 5) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return fileSize <= maxSizeBytes;
};

/**
 * Validate strong password
 */
export const isStrongPassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return password.length >= minLength && 
         hasUpperCase && 
         hasLowerCase && 
         hasNumbers && 
         hasSpecialChar;
};

/**
 * Validate username
 */
export const isValidUsername = (username) => {
  // Username rules:
  // 3-20 characters
  // Only letters, numbers, underscores, and hyphens
  // Cannot start or end with hyphen or underscore
  // Cannot have consecutive hyphens or underscores
  
  const usernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9_-]{1,18}[a-zA-Z0-9])?$/;
  
  if (username.length < 3 || username.length > 20) {
    return false;
  }
  
  if (!usernameRegex.test(username)) {
    return false;
  }
  
  // Check for consecutive special characters
  if (/(--|__|_-|_-)/.test(username)) {
    return false;
  }
  
  return true;
};

/**
 * Validate product SKU
 */
export const isValidSKU = (sku) => {
  // SKU rules:
  // 3-50 characters
  // Only letters, numbers, and hyphens
  // Cannot start or end with hyphen
  // Cannot have consecutive hyphens
  
  const skuRegex = /^[A-Z0-9]([A-Z0-9-]{1,48}[A-Z0-9])?$/;
  
  if (sku.length < 3 || sku.length > 50) {
    return false;
  }
  
  if (!skuRegex.test(sku.toUpperCase())) {
    return false;
  }
  
  if (sku.includes('--')) {
    return false;
  }
  
  return true;
};

/**
 * Validate discount percentage
 */
export const isValidDiscountPercentage = (percentage) => {
  const num = parseFloat(percentage);
  return !isNaN(num) && num >= 0 && num <= 100;
};

/**
 * Validate discount amount (fixed)
 */
export const isValidDiscountAmount = (amount, maxAmount = 1000) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num >= 0 && num <= maxAmount;
};

/**
 * Validate stock quantity
 */
export const isValidStockQuantity = (quantity) => {
  const num = parseInt(quantity, 10);
  return !isNaN(num) && num >= 0;
};

/**
 * Validate price
 */
export const isValidPrice = (price) => {
  const num = parseFloat(price);
  return !isNaN(num) && num >= 0;
};

/**
 * Validate coupon code format
 */
export const isValidCouponCode = (code) => {
  // Coupon code rules:
  // 3-20 characters
  // Only uppercase letters, numbers, and hyphens
  // Cannot start or end with hyphen
  // Cannot have consecutive hyphens
  
  const couponRegex = /^[A-Z0-9]([A-Z0-9-]{1,18}[A-Z0-9])?$/;
  
  if (code.length < 3 || code.length > 20) {
    return false;
  }
  
  if (!couponRegex.test(code)) {
    return false;
  }
  
  if (code.includes('--')) {
    return false;
  }
  
  return true;
};

/**
 * Validate hex color code
 */
export const isValidHexColor = (color) => {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
};

/**
 * Validate RGB color
 */
export const isValidRGBColor = (color) => {
  const rgbRegex = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/;
  const match = color.match(rgbRegex);
  
  if (!match) return false;
  
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  
  return r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255;
};

/**
 * Validate social security number (US)
 */
export const isValidSSN = (ssn) => {
  const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
  return ssnRegex.test(ssn);
};

/**
 * Validate VAT number (EU)
 */
export const isValidVAT = (vat, country = 'DE') => {
  // This is a simplified validation
  // Real VAT validation would require API calls to EU VIES service
  
  const patterns = {
    'DE': /^DE\d{9}$/,
    'FR': /^FR[A-Z0-9]{2}\d{9}$/,
    'GB': /^GB\d{9}$/,
    'IT': /^IT\d{11}$/,
    'ES': /^ES[A-Z0-9]\d{7}[A-Z0-9]$/
  };
  
  const pattern = patterns[country.toUpperCase()];
  if (!pattern) return true; // Don't validate unknown countries
  
  return pattern.test(vat.toUpperCase());
};

/**
 * Validate IBAN (International Bank Account Number)
 */
export const isValidIBAN = (iban) => {
  // Basic format validation
  const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/;
  return ibanRegex.test(iban.replace(/\s/g, ''));
};

/**
 * Validate SWIFT/BIC code
 */
export const isValidSWIFT = (swift) => {
  const swiftRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  return swiftRegex.test(swift.toUpperCase());
};

export default {
  isValidCreditCard,
  isValidExpirationDate,
  isValidCVV,
  isValidURL,
  isValidIP,
  isValidPostalCode,
  isValidPhoneWithCountry,
  isFutureDate,
  isPastDate,
  isValidAge,
  isValidFileType,
  isValidFileSize,
  isStrongPassword,
  isValidUsername,
  isValidSKU,
  isValidDiscountPercentage,
  isValidDiscountAmount,
  isValidStockQuantity,
  isValidPrice,
  isValidCouponCode,
  isValidHexColor,
  isValidRGBColor,
  isValidSSN,
  isValidVAT,
  isValidIBAN,
  isValidSWIFT
};