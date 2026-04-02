import express from 'express';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

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
        images: product.image_url ? [
          product.image_url,
          'https://via.placeholder.com/600x600/6c757d/ffffff?text=Product+2',
          'https://via.placeholder.com/600x600/6c757d/ffffff?text=Product+3'
        ] : [
          'https://via.placeholder.com/600x600/6c757d/ffffff?text=Product'
        ]
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

    // Check stock
    if (product.stock_quantity < (parseInt(quantity) || 1)) {
      req.flash('error_msg', 'Insufficient stock');
      return res.redirect('back');
    }

    // Check if product already in cart
    const existingItemIndex = req.session.cart.findIndex(item => item.productId == id);
    
    if (existingItemIndex > -1) {
      // Update quantity
      req.session.cart[existingItemIndex].quantity += parseInt(quantity) || 1;
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
    res.redirect('back');
  } catch (error) {
    console.error('Error adding to cart:', error);
    req.flash('error_msg', 'Error adding product to cart');
    res.redirect('back');
  }
});

export default router;