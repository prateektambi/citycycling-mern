const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile
} = require('../controllers/authController');
const { googleAuth, linkedinAuth } = require('../controllers/socialAuthController');

// Public Routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/linkedin', linkedinAuth);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected Routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

module.exports = router;