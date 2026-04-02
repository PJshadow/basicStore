// Logger Utility
// Handles application logging with different levels and transports

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  HTTP: 3,
  DEBUG: 4
};

// Current log level (can be set via environment variable)
const currentLogLevel = process.env.LOG_LEVEL 
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO
  : LOG_LEVELS.INFO;

/**
 * Format log message with timestamp and level
 */
const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta
  };
  
  return JSON.stringify(logEntry);
};

/**
 * Write log to file
 */
const writeToFile = (level, message, meta = {}) => {
  try {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logFile = path.join(logsDir, `${timestamp}.log`);
    
    const logEntry = formatMessage(level, message, meta);
    
    fs.appendFileSync(logFile, logEntry + '\n', 'utf8');
  } catch (error) {
    console.error('Failed to write log to file:', error);
  }
};

/**
 * Log to console (colored output for development)
 */
const logToConsole = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const colors = {
    ERROR: '\x1b[31m', // Red
    WARN: '\x1b[33m',  // Yellow
    INFO: '\x1b[36m',  // Cyan
    HTTP: '\x1b[35m',  // Magenta
    DEBUG: '\x1b[90m'  // Gray
  };
  
  const reset = '\x1b[0m';
  const color = colors[level] || reset;
  
  console.log(`${color}[${timestamp}] ${level}: ${message}${reset}`);
  
  if (Object.keys(meta).length > 0) {
    console.log(`${color}Meta:`, meta, `${reset}`);
  }
};

/**
 * Main logging function
 */
const log = (level, message, meta = {}) => {
  const levelNum = LOG_LEVELS[level];
  
  // Check if we should log this level
  if (levelNum > currentLogLevel) {
    return;
  }
  
  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    logToConsole(level, message, meta);
  }
  
  // Always write to file
  writeToFile(level, message, meta);
  
  // In production, could also send to external logging service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to external logging service
    // sendToLoggingService(level, message, meta);
  }
};

/**
 * Public logging methods
 */
export const logger = {
  error: (message, meta = {}) => log('ERROR', message, meta),
  warn: (message, meta = {}) => log('WARN', message, meta),
  info: (message, meta = {}) => log('INFO', message, meta),
  http: (message, meta = {}) => log('HTTP', message, meta),
  debug: (message, meta = {}) => log('DEBUG', message, meta),
  
  // Specialized loggers
  request: (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logMeta = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.session?.userId || 'anonymous'
      };
      
      if (res.statusCode >= 500) {
        log('ERROR', 'Server error', logMeta);
      } else if (res.statusCode >= 400) {
        log('WARN', 'Client error', logMeta);
      } else {
        log('HTTP', 'Request completed', logMeta);
      }
    });
    
    next();
  },
  
  database: {
    query: (sql, params, duration) => {
      log('DEBUG', 'Database query executed', {
        sql: sql.substring(0, 200), // Truncate for readability
        params: params || [],
        duration: `${duration}ms`
      });
    },
    
    error: (error, sql = '', params = []) => {
      log('ERROR', 'Database error', {
        error: error.message,
        sql: sql.substring(0, 200),
        params: params || []
      });
    },
    
    connection: (message) => {
      log('INFO', `Database ${message}`);
    }
  },
  
  auth: {
    login: (userId, success = true, ip = '') => {
      log(success ? 'INFO' : 'WARN', 'User login attempt', {
        userId,
        success,
        ip
      });
    },
    
    logout: (userId) => {
      log('INFO', 'User logout', { userId });
    },
    
    unauthorized: (attempt, resource = '') => {
      log('WARN', 'Unauthorized access attempt', {
        attempt,
        resource
      });
    }
  },
  
  business: {
    orderCreated: (orderId, customerId, amount) => {
      log('INFO', 'Order created', {
        orderId,
        customerId,
        amount
      });
    },
    
    paymentProcessed: (orderId, paymentId, amount, method) => {
      log('INFO', 'Payment processed', {
        orderId,
        paymentId,
        amount,
        method
      });
    },
    
    lowStock: (productId, productName, currentStock, threshold) => {
      log('WARN', 'Low stock alert', {
        productId,
        productName,
        currentStock,
        threshold
      });
    }
  },
  
  // Utility methods
  getLogFiles: () => {
    try {
      return fs.readdirSync(logsDir)
        .filter(file => file.endsWith('.log'))
        .sort()
        .reverse();
    } catch (error) {
      log('ERROR', 'Failed to read log files', { error: error.message });
      return [];
    }
  },
  
  readLogFile: (filename) => {
    try {
      const filePath = path.join(logsDir, filename);
      if (!fs.existsSync(filePath)) {
        throw new Error('Log file not found');
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch (error) {
      log('ERROR', 'Failed to read log file', { filename, error: error.message });
      return [];
    }
  },
  
  clearOldLogs: (daysToKeep = 30) => {
    try {
      const files = fs.readdirSync(logsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      files.forEach(file => {
        if (file.endsWith('.log')) {
          const fileDate = new Date(file.replace('.log', ''));
          if (fileDate < cutoffDate) {
            const filePath = path.join(logsDir, file);
            fs.unlinkSync(filePath);
            log('INFO', 'Deleted old log file', { file });
          }
        }
      });
    } catch (error) {
      log('ERROR', 'Failed to clear old logs', { error: error.message });
    }
  }
};

/**
 * Middleware for request logging
 */
export const requestLogger = logger.request;

/**
 * Initialize logger
 */
export const initLogger = () => {
  logger.info('Logger initialized', {
    logLevel: Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === currentLogLevel),
    environment: process.env.NODE_ENV || 'development',
    logsDirectory: logsDir
  });
  
  // Clear old logs on startup
  logger.clearOldLogs();
  
  return logger;
};

export default logger;