/**
 * Email Service
 * Handles sending emails for verification, password reset, and notifications
 */

const crypto = require('crypto');
const { createTransporter, emailConfig } = require('../config/emailConfig');

/**
 * Generate secure random token
 */
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Send email verification
 * @param {Object} user - User object
 * @param {string} token - Verification token
 */
const sendVerificationEmail = async (user, token) => {
  const transporter = createTransporter();
  
  const verificationUrl = `${emailConfig.baseUrl}/verify-email/${token}`;
  
  const mailOptions = {
    from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
    to: user.email,
    subject: 'Verify Your Email - CityCycling',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚴 Welcome to CityCycling!</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.profile?.name || 'there'}!</h2>
            <p>Thank you for registering with CityCycling. We're excited to have you on board!</p>
            <p>Please verify your email address by clicking the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account with CityCycling, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CityCycling. All rights reserved.</p>
            <p>Mumbai, India</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to CityCycling!
      
      Hi ${user.profile?.name || 'there'}!
      
      Thank you for registering with CityCycling. Please verify your email address by clicking the link below:
      
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account with CityCycling, please ignore this email.
      
      © ${new Date().getFullYear()} CityCycling. All rights reserved.
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${user.email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw error; // Throw the original error!
  }
};

/**
 * Send password reset email
 * @param {Object} user - User object
 * @param {string} token - Reset token
 */
const sendPasswordResetEmail = async (user, token) => {
  const transporter = createTransporter();
  
  const resetUrl = `${emailConfig.baseUrl}/reset-password/${token}`;
  
  const mailOptions = {
    from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
    to: user.email,
    subject: 'Password Reset Request - CityCycling',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.profile?.name || 'there'}!</h2>
            <p>We received a request to reset your password for your CityCycling account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #f5576c;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link will expire in 30 minutes</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Your password won't change until you create a new one</li>
              </ul>
            </div>
            <p>For security reasons, we recommend choosing a strong password that you don't use elsewhere.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CityCycling. All rights reserved.</p>
            <p>Mumbai, India</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Password Reset Request
      
      Hi ${user.profile?.name || 'there'}!
      
      We received a request to reset your password for your CityCycling account.
      
      Click the link below to reset your password:
      ${resetUrl}
      
      ⚠️ IMPORTANT:
      - This link will expire in 30 minutes
      - If you didn't request this, please ignore this email
      - Your password won't change until you create a new one
      
      © ${new Date().getFullYear()} CityCycling. All rights reserved.
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${user.email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Send welcome email (after successful verification)
 * @param {Object} user - User object
 */
const sendWelcomeEmail = async (user) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
    to: user.email,
    subject: 'Welcome to CityCycling! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to CityCycling!</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.profile?.name || 'there'}!</h2>
            <p>Your email has been verified successfully! You're all set to start your cycling journey with us.</p>
            
            <h3>What's Next?</h3>
            <div class="feature">
              <strong>📝 Complete Your Profile</strong>
              <p>Add your address and contact details for seamless booking.</p>
            </div>
            <div class="feature">
              <strong>🚴 Browse Our Catalogue</strong>
              <p>Check out our range of bicycles available for rent.</p>
            </div>
            <div class="feature">
              <strong>📅 Book Your First Ride</strong>
              <p>Choose your dates and we'll deliver the bike to your doorstep!</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${emailConfig.baseUrl}/catalogue" class="button">Browse Bicycles</a>
            </div>
            
            <p>If you have any questions, feel free to reach out to us anytime!</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CityCycling. All rights reserved.</p>
            <p>Mumbai, India</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${user.email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    // Don't throw error for welcome email - it's not critical
    return { success: false };
  }
};

/**
 * Send order confirmation email
 * @param {Object} user - User object
 * @param {Object} order - Order object
 */
const sendOrderConfirmationEmail = async (user, order) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
    to: user.email,
    subject: `Order Confirmation - ${order.orderId}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .order-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Order Confirmed!</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.profile?.name || order.customer.name}!</h2>
            <p>Thank you for your order! We've received it and will process it shortly.</p>
            
            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> ${order.orderId}</p>
              <p><strong>Status:</strong> ${order.orderStatus}</p>
              <p><strong>Total Amount:</strong> ₹${order.financials.grandTotal}</p>
            </div>
            
            <p>We'll keep you updated on your order status via email and WhatsApp.</p>
            <p>You can track your order anytime by logging into your account.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CityCycling. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Order confirmation email sent to ${user.email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending order confirmation email:', error);
    return { success: false };
  }
};

module.exports = {
  generateToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendOrderConfirmationEmail
};
