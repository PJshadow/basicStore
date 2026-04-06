import express from 'express';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '../public');

const router = express.Router();

// Product listing page
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      category,
      search,
      minPrice,
      maxPrice,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    // Get category ID if category slug provided
    let categoryId = null;
    if (category) {
      const categoryObj = await Category.findBySlug(category);
      if (categoryObj) {
        categoryId = categoryObj.id;
      }
    }

    const filters = {
      page: parseInt(page),
      limit: 12,
      categoryId,
      search: search || '',
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      sortBy,
      sortOrder
    };

    const products = await Product.findAll(filters);
    const totalProducts = await Product.count(filters);
    const totalPages = Math.ceil(totalProducts / filters.limit);

    // Get all categories for sidebar
    const categories = await Category.findAll();

    res.render('home/product-list', {
      title: 'Products',
      products,
      categories,
      currentUser: req.session.user || null,
      categorySlug: category || 'all',
      search: search || '',
      minPrice: minPrice || '',
      maxPrice: maxPrice || '',
      pagination: {
        currentPage: filters.page,
        totalPages,
        totalProducts,
        hasNextPage: filters.page < totalPages,
        hasPrevPage: filters.page > 1
      }
    });
  } catch (error) {
    console.error('Error loading products:', error);
    req.flash('error_msg', 'Error loading products');
    res.redirect('/');
  }
});

// Product detail page
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const product = await Product.findBySlug(slug);
    
    if (!product) {
      req.flash('error_msg', 'Product not found');
      return res.redirect('/products');
    }

    // Get related products
    let relatedProducts = [];
    if (product.category_id) {
      relatedProducts = await Product.getRelated(product.id, product.category_id, 4);
    }

    // Get category name
    let categoryName = 'Uncategorized';
    if (product.category_id) {
      const category = await Category.findById(product.category_id);
      if (category) {
        categoryName = category.name;
      }
    }

    // Mock reviews for now (would come from a reviews model)
    const reviews = [
      {
        user: 'John Doe',
        rating: 5,
        comment: 'Excellent product quality!',
        date: '2026-03-10'
      },
      {
        user: 'Jane Smith',
        rating: 4,
        comment: 'Very satisfied with my purchase.',
        date: '2026-03-05'
      }
    ];

    // Get all product images from database
    const dbImages = await Product.getImages(product.id);
    const images = dbImages.map(img => img.image_url);
    
    if (images.length === 0) {
      images.push('/images/product-placeholder.png');
    }

    res.render('home/product-detail', {
      title: product.name,
      product: {
        ...product,
        categoryName,
        features: product.description ? [
          'High quality materials',
          'Durable construction',
          'Satisfaction guaranteed'
        ] : [],
        specifications: {
          'Material': 'Premium',
          'Warranty': '1 year',
          'Shipping': 'Free shipping'
        },
        images
      },
      relatedProducts,
      reviews,
      currentUser: req.session.user || null
    });
  } catch (error) {
    console.error('Error loading product:', error);
    req.flash('error_msg', 'Error loading product');
    res.redirect('/products');
  }
});

// Add to cart
router.post('/:id/add-to-cart', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    
    // Initialize cart in session if not exists
    if (!req.session.cart) {
      req.session.cart = [];
    }
    
    // Check if product exists
    const product = await Product.findById(id);
    if (!product) {
      req.flash('error_msg', 'Product not found');
      return res.redirect('back');
    }

    // Check if product already in cart
    const existingItemIndex = req.session.cart.findIndex(item => item.productId == id);
    const currentQuantity = existingItemIndex > -1 ? req.session.cart[existingItemIndex].quantity : 0;
    const requestedQuantity = parseInt(quantity) || 1;

    // Check stock total
    if (product.stock_quantity < (currentQuantity + requestedQuantity)) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock. Only ${product.stock_quantity} available.`
        });
      }
      req.flash('error_msg', `Insufficient stock. Only ${product.stock_quantity} available.`);
      return res.redirect('back');
    }

    if (existingItemIndex > -1) {
      // Update quantity
      req.session.cart[existingItemIndex].quantity += requestedQuantity;
    } else {
      // Add new item
      const cartItem = {
        productId: id,
        name: product.name,
        price: product.sale_price || product.price,
        image: product.image_url,
        quantity: parseInt(quantity) || 1,
        addedAt: new Date()
      };
      
      req.session.cart.push(cartItem);
    }
    
    req.flash('success_msg', 'Product added to cart!');
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        message: 'Product added to cart',
        cartCount: req.session.cart.reduce((total, item) => total + item.quantity, 0)
      });
    }
    
    res.redirect('back');
  } catch (error) {
    console.error('Error adding to cart:', error);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({
        success: false,
        message: 'Error adding product to cart'
      });
    }
    
    req.flash('error_msg', 'Error adding product to cart');
    res.redirect('back');
  }
});

// Update cart quantity
router.post('/cart/update', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const requestedQuantity = parseInt(quantity);
    
    if (!req.session.cart) {
      return res.status(400).json({ success: false, message: 'Cart not found' });
    }
    
    // Check product stock from DB
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    if (product.stock_quantity < requestedQuantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Only ${product.stock_quantity} units available.` 
      });
    }
    
    const itemIndex = req.session.cart.findIndex(item => item.productId == productId);
    
    if (itemIndex > -1) {
      if (requestedQuantity <= 0) {
        req.session.cart.splice(itemIndex, 1);
      } else {
        req.session.cart[itemIndex].quantity = requestedQuantity;
      }
      
      return res.json({ 
        success: true, 
        cartCount: req.session.cart.reduce((total, item) => total + item.quantity, 0)
      });
    }
    
    res.status(404).json({ success: false, message: 'Item not found in cart' });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ success: false, message: 'Error updating cart' });
  }
});

// Remove from cart
router.post('/cart/remove', (req, res) => {
  try {
    const { productId } = req.body;
    
    if (!req.session.cart) {
      return res.status(400).json({ success: false, message: 'Cart not found' });
    }
    
    req.session.cart = req.session.cart.filter(item => item.productId != productId);
    
    res.json({ 
      success: true, 
      cartCount: req.session.cart.reduce((total, item) => total + item.quantity, 0)
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, message: 'Error removing from cart' });
  }
});

export default router;