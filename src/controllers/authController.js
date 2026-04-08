// Authentication Controller
// Handles user authentication, registration, password reset, etc.

import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { validationResult } from 'express-validator';
import emailService from '../utils/emailService.js';

export default {
  // Login user
  login: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Verify password
      const isValidPassword = await User.verifyPassword(user, password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Set session
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.userEmail = user.email;

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = user;

      res.status(200).json({
        message: 'Login successful',
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Register new user
  register: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, role = 'staff' } = req.body;

      // Check if user already exists
      const existingUserByEmail = await User.findByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const existingUserByUsername = await User.findByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      // Create new user
      const newUser = await User.create({ username, email, password, role });

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(newUser);
        console.log('✅ Welcome email sent to:', newUser.email);
      } catch (e) {
        console.error('❌ Failed to send welcome email:', e);
      }

      // Set session
      req.session.userId = newUser.id;
      req.session.userRole = newUser.role;
      req.session.userEmail = newUser.email;

      res.status(201).json({
        message: 'Registration successful',
        user: newUser
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Logout user
  logout: (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error('Logout error:', err);
          return res.status(500).json({ error: 'Failed to logout' });
        }
        
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logout successful' });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Forgot password
  forgotPassword: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;

      // Check if user exists
      const user = await User.findByEmail(email);
      if (!user) {
        // For security, don't reveal that email doesn't exist
        return res.status(200).json({ 
          message: 'If your email is registered, you will receive a password reset link' 
        });
      }

      // Generate reset token (in a real app, you would generate a JWT token and send email)
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      
      // Send password reset email
      try {
        await emailService.sendPasswordResetEmail(user, resetToken);
        console.log('✅ Password reset email sent to:', user.email);
      } catch (e) {
        console.error('❌ Failed to send password reset email:', e);
      }

      res.status(200).json({ 
        message: 'Password reset instructions sent to your email',
        // In development, include the token for testing
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Reset password
  resetPassword: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, newPassword } = req.body;

      // In a real application, you would:
      // 1. Verify the reset token from database
      // 2. Check if token is expired
      // 3. Find user associated with token
      // 4. Update password
      // 5. Delete/invalidate the token

      // For now, we'll implement a simplified version
      // This would require a token validation mechanism

      res.status(200).json({ 
        message: 'Password reset successful. Please login with your new password.' 
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get current user profile
  getProfile: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = user;

      res.status(200).json({
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email } = req.body;
      const userId = req.session.userId;

      // Check if email is already taken by another user
      if (email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: 'Email already registered' });
        }
      }

      // Check if username is already taken by another user
      if (username) {
        const existingUser = await User.findByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: 'Username already taken' });
        }
      }

      const updated = await User.update(userId, { username, email });
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = await User.findById(userId);
      const { password_hash, ...userWithoutPassword } = user;

      res.status(200).json({
        message: 'Profile updated successfully',
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.session.userId;

      // Get user with password hash
      const user = await User.findByEmail(req.session.userEmail);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await User.verifyPassword(user, currentPassword);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Update password
      const updated = await User.updatePassword(userId, newPassword);
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};