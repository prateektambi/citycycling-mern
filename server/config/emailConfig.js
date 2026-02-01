/**
 * Email Configuration
 * Supports multiple email providers: Gmail, SendGrid, AWS SES
 */

const nodemailer = require('nodemailer');

/**
 * Create email transporter based on environment configuration
 */
const createTransporter = () => {
  const emailProvider = process.env.EMAIL_PROVIDER || 'gmail';

  switch (emailProvider.toLowerCase()) {
    case 'gmail':
      // Gmail SMTP
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER, // Your Gmail address
          pass: process.env.EMAIL_PASSWORD // Gmail App Password (not regular password)
        }
      });

    case 'sendgrid':
      // SendGrid SMTP
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });

    case 'aws-ses':
      // AWS SES
      return nodemailer.createTransport({
        host: process.env.AWS_SES_HOST, // e.g., email-smtp.us-east-1.amazonaws.com
        port: 587,
        secure: false,
        auth: {
          user: process.env.AWS_SES_USER,
          pass: process.env.AWS_SES_PASSWORD
        }
      });

    case 'smtp':
      // Generic SMTP (for Mailgun, Postmark, etc.)
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });

    default:
      throw new Error(`Unsupported email provider: ${emailProvider}`);
  }
};

/**
 * Email configuration
 */
const emailConfig = {
  from: {
    name: process.env.EMAIL_FROM_NAME || 'CityCycling',
    address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
  },
  
  // Base URL for email links (verification, password reset)
  baseUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  
  // Token expiry times
  verificationTokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
  passwordResetTokenExpiry: 30 * 60 * 1000, // 30 minutes
};

module.exports = {
  createTransporter,
  emailConfig
};
