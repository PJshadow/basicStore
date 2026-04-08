import express from 'express';
import adminController from '../controllers/adminController.js';
import orderController from '../controllers/orderController.js';
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
router.get('/orders', orderController.getAdminOrders);

router.get('/orders/:id', orderController.getAdminOrderDetail);

// Customers management
router.get('/customers', (req, res) => {
  // Use the controller's logic
  import('../controllers/customerController.js').then(controller => {
    controller.default.getAllCustomers(req, res);
  });
});

router.get('/customers/:id/edit', async (req, res) => {
  const { id } = req.params;
  const Customer = (await import('../models/Customer.js')).default;
  const customer = await Customer.findById(id);
  res.render('admin/customers/edit', {
    title: 'Edit Customer',
    currentUser: req.session.user,
    sidebar: true,
    activePage: 'customers',
    customer
  });
});

router.post('/customers/:id/update', async (req, res) => {
  const { id } = req.params;
  const Customer = (await import('../models/Customer.js')).default;
  await Customer.update(id, req.body);
  req.flash('success_msg', 'Customer updated successfully');
  res.redirect('/admin/customers');
});

// Coupons management
router.get('/coupons', adminController.getCoupons);
router.get('/coupons/new', adminController.getCreateCoupon);
router.post('/coupons', adminController.createCoupon);
router.get('/coupons/:id/edit', adminController.getEditCoupon);
router.put('/coupons/:id', adminController.updateCoupon);
router.delete('/coupons/:id', adminController.deleteCoupon);

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