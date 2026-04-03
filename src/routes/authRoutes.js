import express from 'express';
import { body, validationResult } from 'express-validator';
const router = express.Router();

// Login page
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('auth/login', {
    title: 'Login',
    currentUser: null
  });
});

// Login process
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    try {
      // Use authController.login but adapt for EJS views
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('error_msg', 'Please provide valid credentials');
        return res.redirect('/auth/login');
      }

      const { email, password } = req.body;
      
      // Find user by email
      const User = (await import('../models/User.js')).default;
      const user = await User.findByEmail(email);
      
      if (!user) {
        req.flash('error_msg', 'Invalid email or password');
        return res.redirect('/auth/login');
      }

      // Verify password
      const isValidPassword = await User.verifyPassword(user, password);
      if (!isValidPassword) {
        req.flash('error_msg', 'Invalid email or password');
        return res.redirect('/auth/login');
      }

      // Set session
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      };

      req.flash('success_msg', 'Login successful!');
      res.redirect(user.role === 'admin' ? '/admin' : '/');
    } catch (error) {
      console.error('Login error:', error);
      req.flash('error_msg', 'An error occurred during login');
      res.redirect('/auth/login');
    }
  }
);

// Register page
router.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('auth/register', {
    title: 'Register',
    currentUser: null
  });
});

// Register process
router.post('/register',
  [
    body('username').notEmpty().trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('confirm_password').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        errors.array().forEach(error => {
          req.flash('error_msg', error.msg);
        });
        return res.redirect('/auth/register');
      }

      const { username, email, password, first_name, last_name } = req.body;

      // Check if user exists
      const User = (await import('../models/User.js')).default;
      const Customer = (await import('../models/Customer.js')).default;
      
      const existingUserByEmail = await User.findByEmail(email);
      if (existingUserByEmail) {
        req.flash('error_msg', 'Email already registered');
        return res.redirect('/auth/register');
      }

      const existingUserByUsername = await User.findByUsername(username);
      if (existingUserByUsername) {
        req.flash('error_msg', 'Username already taken');
        return res.redirect('/auth/register');
      }

      // Create new user
      const newUser = await User.create({ username, email, password, role: 'customer' });

      // Create associated customer record
      try {
        await Customer.create({ first_name, last_name, email });
      } catch (custError) {
        console.error('Error creating customer record:', custError);
        // We don't necessarily want to fail registration if customer record creation fails,
        // but in a production app we might want to handle this better (e.g. transaction)
      }

      // Set session
      req.session.user = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      };

      req.flash('success_msg', 'Registration successful! You are now logged in.');
      res.redirect('/');
    } catch (error) {
      console.error('Registration error:', error);
      req.flash('error_msg', 'An error occurred during registration');
      res.redirect('/auth/register');
    }
  }
);

// Forgot password page
router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Forgot Password',
    currentUser: null
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/');
  });
});

// Profile page
router.get('/profile', (req, res) => {
  if (!req.session.user) {
    req.flash('error_msg', 'Please login to view your profile');
    return res.redirect('/auth/login');
  }
  res.render('auth/profile', {
    title: 'My Profile',
    currentUser: req.session.user
  });
});

export default router;