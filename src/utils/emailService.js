// Email Service
// Handles sending emails using Nodemailer

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Create email transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

/**
 * Send email
 */
export const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@basicstore.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      ...(options.cc && { cc: options.cc }),
      ...(options.bcc && { bcc: options.bcc }),
      ...(options.attachments && { attachments: options.attachments })
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send order confirmation email
 */
export const sendOrderConfirmation = async (order, customer) => {
  const subject = `Order Confirmation - ${order.order_number}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .order-details { margin: 20px 0; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; }
        .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmation</h1>
        </div>
        <div class="content">
          <p>Dear ${customer.first_name} ${customer.last_name},</p>
          <p>Thank you for your order! Your order has been received and is being processed.</p>
          
          <div class="order-details">
            <h3>Order Details:</h3>
            <p><strong>Order Number:</strong> ${order.order_number}</p>
            <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
            <p><strong>Order Status:</strong> ${order.status}</p>
            <p><strong>Total Amount:</strong> $${order.total_amount.toFixed(2)}</p>
          </div>
          
          <p>You can track your order status by logging into your account.</p>
          
          <p>If you have any questions, please contact our customer support.</p>
          
          <p>Best regards,<br>The ${process.env.APP_NAME || 'BasicStore'} Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'BasicStore'}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Order Confirmation - ${order.order_number}
    
    Dear ${customer.first_name} ${customer.last_name},
    
    Thank you for your order! Your order has been received and is being processed.
    
    Order Details:
    - Order Number: ${order.order_number}
    - Order Date: ${new Date(order.created_at).toLocaleDateString()}
    - Order Status: ${order.status}
    - Total Amount: $${order.total_amount.toFixed(2)}
    
    You can track your order status by logging into your account.
    
    If you have any questions, please contact our customer support.
    
    Best regards,
    The ${process.env.APP_NAME || 'BasicStore'} Team
  `;
  
  return sendEmail({
    to: customer.email,
    subject,
    html,
    text
  });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const subject = 'Password Reset Request';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset</h1>
        </div>
        <div class="content">
          <p>Hello ${user.username},</p>
          <p>You have requested to reset your password. Click the button below to reset your password:</p>
          
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>${resetUrl}</p>
          
          <p>This link will expire in 1 hour.</p>
          
          <p>If you didn't request a password reset, please ignore this email.</p>
          
          <p>Best regards,<br>The ${process.env.APP_NAME || 'BasicStore'} Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'BasicStore'}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Password Reset Request
    
    Hello ${user.username},
    
    You have requested to reset your password. Use the link below to reset your password:
    
    ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you didn't request a password reset, please ignore this email.
    
    Best regards,
    The ${process.env.APP_NAME || 'BasicStore'} Team
  `;
  
  return sendEmail({
    to: user.email,
    subject,
    html,
    text
  });
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (user) => {
  const subject = `Welcome to ${process.env.APP_NAME || 'BasicStore'}!`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome Aboard!</h1>
        </div>
        <div class="content">
          <p>Hello ${user.username},</p>
          <p>Welcome to ${process.env.APP_NAME || 'BasicStore'}! We're excited to have you join our community.</p>
          
          <p>Your account has been successfully created. You can now:</p>
          <ul>
            <li>Browse our products</li>
            <li>Place orders</li>
            <li>Track your orders</li>
            <li>Manage your profile</li>
          </ul>
          
          <p>If you have any questions, feel free to contact our support team.</p>
          
          <p>Happy shopping!</p>
          
          <p>Best regards,<br>The ${process.env.APP_NAME || 'BasicStore'} Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'BasicStore'}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Welcome to ${process.env.APP_NAME || 'BasicStore'}!
    
    Hello ${user.username},
    
    Welcome to ${process.env.APP_NAME || 'BasicStore'}! We're excited to have you join our community.
    
    Your account has been successfully created. You can now:
    - Browse our products
    - Place orders
    - Track your orders
    - Manage your profile
    
    If you have any questions, feel free to contact our support team.
    
    Happy shopping!
    
    Best regards,
    The ${process.env.APP_NAME || 'BasicStore'} Team
  `;
  
  return sendEmail({
    to: user.email,
    subject,
    html,
    text
  });
};

/**
 * Send low stock alert email (admin)
 */
export const sendLowStockAlert = async (product, adminEmail) => {
  const subject = `Low Stock Alert - ${product.name}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .alert { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Low Stock Alert</h1>
        </div>
        <div class="content">
          <div class="alert">
            <h3>⚠️ Attention Required</h3>
            <p>The following product is running low on stock:</p>
          </div>
          
          <h3>Product Details:</h3>
          <p><strong>Product Name:</strong> ${product.name}</p>
          <p><strong>SKU:</strong> ${product.sku || 'N/A'}</p>
          <p><strong>Current Stock:</strong> ${product.stock_quantity}</p>
          <p><strong>Low Stock Threshold:</strong> ${product.low_stock_threshold}</p>
          <p><strong>Category:</strong> ${product.category_name || 'Uncategorized'}</p>
          
          <p>Please consider restocking this product soon.</p>
          
          <p>Best regards,<br>The ${process.env.APP_NAME || 'BasicStore'} System</p>
        </div>
        <div class="footer">
          <p>This is an automated alert. Please do not reply to this message.</p>
          <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'BasicStore'}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Low Stock Alert - ${product.name}
    
    ⚠️ Attention Required
    
    The following product is running low on stock:
    
    Product Details:
    - Product Name: ${product.name}
    - SKU: ${product.sku || 'N/A'}
    - Current Stock: ${product.stock_quantity}
    - Low Stock Threshold: ${product.low_stock_threshold}
    - Category: ${product.category_name || 'Uncategorized'}
    
    Please consider restocking this product soon.
    
    Best regards,
    The ${process.env.APP_NAME || 'BasicStore'} System
  `;
  
  return sendEmail({
    to: adminEmail,
    subject,
    html,
    text
  });
};

/**
 * Test email configuration
 */
export const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email server is ready to send messages');
    return { success: true, message: 'Email server is ready' };
  } catch (error) {
    console.error('❌ Email server configuration error:', error);
    return { 
      success: false, 
      message: 'Email server configuration error',
      error: error.message 
    };
  }
};

export default {
  sendEmail,
  sendOrderConfirmation,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendLowStockAlert,
  testEmailConfig
};