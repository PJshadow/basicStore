import express from 'express';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Customer from '../models/Customer.js';

const router = express.Router();

// Homepage route
router.get('/', async (req, res) => {
  try {
    const featuredProducts = await Product.getFeatured(4);
    res.render('home/index', {
      title: 'Home',
      featuredProducts,
      currentUser: req.session.user || null
    });
  } catch (error) {
    console.error('Error loading homepage:', error);
    res.render('home/index', {
      title: 'Home',
      featuredProducts: [],
      currentUser: req.session.user || null
    });
  }
});

// About page
router.get('/about', (req, res) => {
  res.render('home/about', {
    title: 'About Us',
    currentUser: req.session.user || null
  });
});

// Contact page
router.get('/contact', (req, res) => {
  res.render('home/contact', {
    title: 'Contact Us',
    currentUser: req.session.user || null
  });
});

// FAQ page
router.get('/faq', (req, res) => {
  res.render('home/faq', {
    title: 'FAQ',
    currentUser: req.session.user || null
  });
});

// Cart page
router.get('/cart', (req, res) => {
  res.render('home/cart', {
    title: 'Shopping Cart',
    currentUser: req.session.user || null
  });
});

// Checkout page
router.get('/checkout', (req, res) => {
  const cartItems = req.session.cart || [];
  if (cartItems.length === 0) {
    req.flash('error_msg', 'Your cart is empty');
    return res.redirect('/cart');
  }

  const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  
  res.render('home/checkout', {
    title: 'Checkout',
    currentUser: req.session.user || null,
    cartItems,
    subtotal
  });
});

// Process checkout
router.post('/checkout', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone,
      address, address2, city, state, zip_code,
      paymentMethod
    } = req.body;

    const cartItems = req.session.cart || [];

    if (cartItems.length === 0) {
      req.flash('error_msg', 'Your cart is empty');
      return res.redirect('/cart');
    }

    // Validate stock for all items
    for (const item of cartItems) {
      const stockValidation = await OrderItem.validateStock(item.productId, item.quantity);
      if (!stockValidation.valid) {
        req.flash('error_msg', stockValidation.message);
        return res.redirect('/checkout');
      }
    }

    // Find or create customer
    let customer = await Customer.findByEmail(email);
    const fullAddress = address2 ? `${address}, ${address2}` : address;

    if (!customer) {
      customer = await Customer.create({
        first_name,
        last_name,
        email,
        phone,
        address: fullAddress,
        city,
        state,
        zip_code
      });
    } else {
      // Update customer info if it changed
      await Customer.update(customer.id, {
        first_name,
        last_name,
        email,
        phone,
        address: fullAddress,
        city,
        state,
        zip_code,
        country: customer.country || 'USA'
      });
    }

    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping_amount = 0; // Free shipping
    const tax_amount = 0; // Simplified
    const total_amount = subtotal + shipping_amount + tax_amount;

    // Prepare order items
    const items = cartItems.map(item => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity
    }));

    // Create order (this handles transaction and stock update)
    const orderData = {
      customer_id: customer.id,
      status: 'pending',
      subtotal,
      tax_amount,
      shipping_amount,
      total_amount,
      payment_method: paymentMethod || 'card',
      shipping_address: `${fullAddress}, ${city}, ${state} ${zip_code}`,
      billing_address: `${fullAddress}, ${city}, ${state} ${zip_code}`,
      items
    };

    const newOrder = await Order.create(orderData);

    // Clear cart
    req.session.cart = [];

    req.flash('success_msg', `Order placed successfully! Your order number is ${newOrder.order_number}`);
    res.redirect('/');
  } catch (error) {
    console.error('Checkout error:', error);
    req.flash('error_msg', 'There was an error processing your order. Please try again.');
    res.redirect('/checkout');
  }
});

// Shipping policy
router.get('/shipping', (req, res) => {
  res.render('home/shipping', {
    title: 'Shipping Policy',
    currentUser: req.session.user || null
  });
});

// Returns policy
router.get('/returns', (req, res) => {
  res.render('home/returns', {
    title: 'Returns & Refunds',
    currentUser: req.session.user || null
  });
});

// Privacy policy
router.get('/privacy', (req, res) => {
  res.render('home/privacy', {
    title: 'Privacy Policy',
    currentUser: req.session.user || null
  });
});

// Terms of service
router.get('/terms', (req, res) => {
  res.render('home/terms', {
    title: 'Terms of Service',
    currentUser: req.session.user || null
  });
});

export default router;