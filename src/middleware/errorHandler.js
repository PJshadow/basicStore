// Error Handler Middleware
// Handles application errors and sends appropriate responses

/**
 * Custom error factory functions
 */

// AppError factory function
const createAppError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
  error.isOperational = true;
  
  Error.captureStackTrace(error, createAppError);
  return error;
};

// ValidationError factory function
const createValidationError = (message, errors = []) => {
  const error = createAppError(message, 400);
  error.errors = errors;
  error.name = 'ValidationError';
  return error;
};

// NotFoundError factory function
const createNotFoundError = (resource = 'Resource') => {
  const error = createAppError(`${resource} not found`, 404);
  error.name = 'NotFoundError';
  return error;
};

// UnauthorizedError factory function
const createUnauthorizedError = (message = 'Unauthorized access') => {
  const error = createAppError(message, 401);
  error.name = 'UnauthorizedError';
  return error;
};

// ForbiddenError factory function
const createForbiddenError = (message = 'Access forbidden') => {
  const error = createAppError(message, 403);
  error.name = 'ForbiddenError';
  return error;
};

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Default error values
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params
    });
  } else {
    // Production logging (would integrate with a logging service)
    console.error('❌ Error:', {
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method
    });
  }
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }
  
  if (err.name === 'CastError') {
    // Mongoose cast error (invalid ID format)
    return res.status(400).json({
      status: 'fail',
      message: `Invalid ${err.path}: ${err.value}`
    });
  }
  
  if (err.code === 11000) {
    // MongoDB duplicate key error
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      status: 'fail',
      message: `Duplicate field value: ${field}. Please use another value.`
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token. Please log in again.'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Your token has expired. Please log in again.'
    });
  }
  
  // Handle custom AppError instances
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(err.errors && { errors: err.errors })
    });
  }
  
  // Handle unknown errors (don't leak details in production)
  if (process.env.NODE_ENV === 'development') {
    return res.status(500).json({
      status: 'error',
      message: err.message,
      stack: err.stack,
      error: err
    });
  } else {
    // Generic error message in production
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Export the error factory functions
export {
  createAppError as AppError,
  createValidationError as ValidationError,
  createNotFoundError as NotFoundError,
  createUnauthorizedError as UnauthorizedError,
  createForbiddenError as ForbiddenError
};