const express = require('express');
const router = express.Router();
const { sendVerificationEmail, sendPasswordResetEmail, generateToken } = require('../services/emailService');

/**
 * Test Email Endpoint
 * Remove this in production!
 * 
 * Usage: GET http://localhost:5000/api/test/email?to=test@example.com
 */
router.get('/email', async (req, res) => {
  try {
    const { to } = req.query;

    if (!to) {
      return res.status(400).json({ 
        message: 'Please provide email address in query: ?to=your-email@example.com' 
      });
    }

    // Create a test user object
    const testUser = {
      email: to,
      profile: {
        name: 'Test User'
      }
    };

    // Generate a test token
    const testToken = generateToken();

    // Send verification email
    await sendVerificationEmail(testUser, testToken);

    res.json({
      success: true,
      message: `✅ Test verification email sent to ${to}`,
      note: 'Check your inbox (and spam folder)',
      verificationLink: `${process.env.CLIENT_URL}/verify-email/${testToken}`
    });

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to send test email',
      error: error.message,
      details: JSON.stringify(error, Object.getOwnPropertyNames(error)), // Serialize full error object
      troubleshooting: [
        'Check if EMAIL_USER and EMAIL_PASSWORD are set in .env',
        'Make sure you used Gmail App Password (not regular password)',
        'Verify 2FA is enabled on your Gmail account',
        'Check server console for detailed error'
      ]
    });
  }
});

/**
 * Test Password Reset Email
 * Usage: GET http://localhost:5000/api/test/reset-email?to=test@example.com
 */
router.get('/reset-email', async (req, res) => {
  try {
    const { to } = req.query;

    if (!to) {
      return res.status(400).json({ 
        message: 'Please provide email address in query: ?to=your-email@example.com' 
      });
    }

    const testUser = {
      email: to,
      profile: {
        name: 'Test User'
      }
    };

    const testToken = generateToken();

    await sendPasswordResetEmail(testUser, testToken);

    res.json({
      success: true,
      message: `✅ Test password reset email sent to ${to}`,
      note: 'Check your inbox (and spam folder)',
      resetLink: `${process.env.CLIENT_URL}/reset-password/${testToken}`
    });

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to send test email',
      error: error.message
    });
  }
});

/**
 * Test Email Configuration
 * Usage: GET http://localhost:5000/api/test/email-config
 */
router.get('/email-config', (req, res) => {
  res.json({
    provider: process.env.EMAIL_PROVIDER || 'Not set',
    user: process.env.EMAIL_USER || 'Not set',
    passwordSet: !!process.env.EMAIL_PASSWORD,
    fromName: process.env.EMAIL_FROM_NAME || 'Not set',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'Not set',
    clientUrl: process.env.CLIENT_URL || 'Not set',
    note: 'Password is hidden for security'
  });
});

module.exports = router;
