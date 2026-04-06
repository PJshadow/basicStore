import express from 'express';
import adminController from '../controllers/adminController.js';
import upload from '../middleware/upload.js';
const router = express.Router();

// Admin middleware - check if user is authenticated and is admin
const isAdmin = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error_msg', 'Please login to access admin panel');
    return res.redirect('/auth/login');
  }
  
  if (req.session.user.role !== 'admin') {
    req.flash('error_msg', 'Access denied. Admin privileges required.');
    return res.redirect('/');
  }
  
  next();
};

// Apply admin middleware to all admin routes
router.use(isAdmin);

// Admin dashboard
router.get('/', (req, res) => {
  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    currentUser: req.session.user,
    sidebar: true,
    activePage: 'dashboard'
  });
});

// Products management
router.get('/products', adminController.getProducts);

router.get('/products/new', adminController.getCreateProduct);

router.post('/products', upload.array('product_images', 10), adminController.createProduct);

router.get('/products/:id/edit', adminController.getEditProduct);

router.put('/products/:id', upload.array('product_images', 10), adminController.updateProduct);

router.post('/products/:productId/images/:imageId/main', adminController.setMainImage);

router.delete('/products/:id', adminController.deleteProduct);

// Categories management
router.get('/categories', adminController.getCategories);
router.get('/categories/new', adminController.getCreateCategory);
router.post('/categories', adminController.createCategory);
router.get('/categories/:id/edit', adminController.getEditCategory);
router.post('/categories/:id/update', adminController.updateCategory);
router.post('/categories/:id/delete', adminController.deleteCategory);

// Orders management
router.get('/orders', (req, res) => {
  res.render('admin/orders/list', {
    title: 'Order Management',
    currentUser: req.session.user,
    sidebar: true,
    activePage: 'orders'
  });
});

router.get('/orders/:id', (req, res) => {
  res.render('admin/orders/detail', {
    title: 'Order Details',
    currentUser: req.session.user,
    sidebar: true,
    activePage: 'orders',
    orderId: req.params.id
  });
});

// Customers management
router.get('/customers', (req, res) => {
  res.render('admin/customers/list', {
    title: 'Customer Management',
    currentUser: req.session.user,
    sidebar: true,
    activePage: 'customers'
  });
});

router.get('/customers/:id', (req, res) => {
  res.render('admin/customers/detail', {
    title: 'Customer Details',
    currentUser: req.session.user,
    sidebar: true,
    activePage: 'customers',
    customerId: req.params.id
  });
});

// Coupons management
router.get('/coupons', (req, res) => {
  res.render('admin/coupons/list', {
    title: 'Coupon Management',
    currentUser: req.session.user,
    sidebar: true,
    activePage: 'coupons'
  });
});

router.get('/coupons/new', (req, res) => {
  res.render('admin/coupons/create', {
    title: 'Create New Coupon',
    currentUser: req.session.user,
    sidebar: true,
    activePage: 'coupons'
  });
});

// Reports
router.get('/reports/sales', (req, res) => {
  res.render('admin/reports/sales', {
    title: 'Sales Reports',
    currentUser: req.session.user,
    sidebar: true,
    activePage: 'reports'
  });
});

router.get('/reports/inventory', (req, res) => {
  res.render('admin/reports/inventory', {
    title: 'Inventory Reports',
    currentUser: req.session.user,
    sidebar: true,
    activePage: 'reports'
  });
});

// Settings
router.get('/settings', (req, res) => {
  res.render('admin/settings', {
    title: 'Store Settings',
    currentUser: req.session.user,
    sidebar: true,
    activePage: 'settings'
  });
});

export default router;