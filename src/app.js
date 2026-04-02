import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import session from 'express-session';
import flash from 'connect-flash';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import methodOverride from 'method-override';
import expressLayouts from 'express-ejs-layouts';

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import configurations
import database from './config/database.js';
import sessionConfig from './config/session.js';

// Import routes
import indexRoutes from './routes/index.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Initialize Express app
const app = express();

// Database connection test
database.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Database connected successfully');
});

// Security middleware - disable CSP to allow external resources
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Method override for PUT/DELETE
app.use(methodOverride('_method'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session(sessionConfig));

// Flash messages middleware
app.use(flash());

// Make flash messages available to all templates
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.session.user || null;
  next();
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Global template variables
app.use((req, res, next) => {
  res.locals.appName = process.env.APP_NAME || 'BasicStore';
  res.locals.currentYear = new Date().getFullYear();
  next();
});

// Routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/admin', adminRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('errors/404', { 
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong!' 
    : err.message;
  
  res.status(statusCode).render('errors/500', {
    title: 'Server Error',
    message: message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

export default app;