import express from 'express';
import Product from '../models/Product.js';

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