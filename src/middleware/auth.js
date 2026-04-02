// Authentication Middleware
// Handles user authentication and authorization

/**
 * Middleware to check if user is authenticated
 */
export const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  
  return res.status(401).json({ 
    error: 'Authentication required',
    message: 'Please login to access this resource'
  });
};

/**
 * Middleware to check if user is admin
 */
export const isAdmin = (req, res, next) => {
  if (req.session && req.session.userRole === 'admin') {
    return next();
  }
  
  return res.status(403).json({ 
    error: 'Admin access required',
    message: 'You do not have permission to access this resource'
  });
};

/**
 * Middleware to check if user is staff or admin
 */
export const isStaff = (req, res, next) => {
  if (req.session && (req.session.userRole === 'admin' || req.session.userRole === 'staff')) {
    return next();
  }
  
  return res.status(403).json({ 
    error: 'Staff access required',
    message: 'You do not have permission to access this resource'
  });
};

/**
 * Middleware to check if user is customer
 */
export const isCustomer = (req, res, next) => {
  if (req.session && req.session.customerId) {
    return next();
  }
  
  return res.status(401).json({ 
    error: 'Customer authentication required',
    message: 'Please login as a customer to access this resource'
  });
};

/**
 * Middleware to set customer session from JWT or other auth methods
 * (Placeholder for future implementation)
 */
export const setCustomerFromToken = (req, res, next) => {
  // In a real application, this would:
  // 1. Check for JWT token in headers
  // 2. Verify token
  // 3. Set customer ID in session
  
  // For now, we'll use session-based authentication
  next();
};

/**
 * Middleware to require either admin or customer ownership
 */
export const isAdminOrOwner = (req, res, next) => {
  if (req.session && req.session.userRole === 'admin') {
    return next();
  }
  
  // Check if customer owns the resource
  const resourceId = req.params.id || req.params.customerId;
  if (req.session && req.session.customerId && parseInt(resourceId) === req.session.customerId) {
    return next();
  }
  
  return res.status(403).json({ 
    error: 'Access denied',
    message: 'You do not have permission to access this resource'
  });
};

/**
 * Middleware to check API key (for external API access)
 */
export const checkApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  // In a real application, you would validate against a database
  // For now, we'll use a simple check
  const validApiKey = process.env.API_KEY;
  
  if (!validApiKey) {
    // API key authentication not configured
    return next();
  }
  
  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ 
      error: 'Invalid API key',
      message: 'Please provide a valid API key'
    });
  }
  
  next();
};

/**
 * Middleware to set user in response locals for views
 */
export const setUserLocals = (req, res, next) => {
  if (req.session) {
    res.locals.user = {
      id: req.session.userId,
      role: req.session.userRole,
      email: req.session.userEmail,
      customerId: req.session.customerId
    };
  } else {
    res.locals.user = null;
  }
  next();
};

/**
 * Middleware to require HTTPS in production
 */
export const requireHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
};

export default {
  isAuthenticated,
  isAdmin,
  isStaff,
  isCustomer,
  setCustomerFromToken,
  isAdminOrOwner,
  checkApiKey,
  setUserLocals,
  requireHTTPS
};