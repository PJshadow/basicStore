import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Email templates
const emailTemplates = {
  welcome: {
    subject: 'Welcome to BasicStore!',
    html: `<h1>Welcome to BasicStore</h1>
           <p>Thank you for registering with us.</p>`
  },
  orderConfirmation: {
    subject: 'Your Order Confirmation',
    html: `<h1>Order Confirmed</h1>
           <p>Thank you for your order.</p>`
  },
  passwordReset: {
    subject: 'Password Reset Request',
    html: `<h1>Reset Your Password</h1>
           <p>Click the link below to reset your password.</p>`
  }
};

// Send email function
const sendEmail = async (to, templateName, data = {}) => {
  const template = emailTemplates[templateName];
  if (!template) {
    throw new Error(`Email template "${templateName}" not found`);
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@basicstore.com',
    to,
    subject: template.subject,
    html: template.html,
    // You can add text version as well
    text: template.html.replace(/<[^>]*>/g, '')
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export default {
  transporter,
  sendEmail,
  emailTemplates
};