const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { 
  generateToken, 
  sendVerificationEmail, 
  sendPasswordResetEmail, 
  sendWelcomeEmail 
} = require('../services/emailService');
const { emailConfig } = require('../config/emailConfig');

// Generate JWT Token
const generateJwtToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Generate Verification Token
    const verificationToken = generateToken();
    const verificationExpiry = new Date(Date.now() + emailConfig.verificationTokenExpiry);

    // Create user
    const user = await User.create({
      email,
      password: await bcrypt.hash(password, 10),
      profile: {
        name,
        phone,
        whatsappNumber: phone
      },
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpiry,
      role: 'user' // Default to user
    });

    // Send Verification Email
    try {
      await sendVerificationEmail(user, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // We don't fail registration if email fails, but we inform the user/log it
    }

    res.status(201).json({
      _id: user._id,
      name: user.profile.name,
      email: user.email,
      role: user.role,
      token: generateJwtToken(user._id, user.role),
      message: 'Registration successful. Please check your email to verify your account.'
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    // Check if locked
    if (user && user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(403).json({ 
        message: 'Account is temporarily locked due to too many failed attempts. Please try again later.' 
      });
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      // Successful Login
      
      // Reset login attempts
      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      // Update last login
      user.lastLogin = Date.now();
      await user.save();

      res.json({
        _id: user._id,
        name: user.profile?.name || user.email.split('@')[0],
        email: user.email,
        role: user.role,
        isEmailVerified: user.emailVerified,
        profile: user.profile,
        token: generateJwtToken(user._id, user.role),
      });
    } else {
      // Failed Login
      if (user) {
        await user.incLoginAttempts();
      }
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Verify Email
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send Welcome Email
    try {
      await sendWelcomeEmail(user);
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }

    res.json({ message: 'Email verified successfully' });

  } catch (error) {
    console.error('Verify Email Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Request Password Reset
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Generic message for security
      return res.json({ message: 'If a user with this email exists, a password reset link has been sent.' });
    }

    const resetToken = generateToken();
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + emailConfig.passwordResetTokenExpiry;
    await user.save();

    try {
      await sendPasswordResetEmail(user, resetToken);
    } catch (error) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      return res.status(500).json({ message: 'Error sending email' });
    }

    res.json({ message: 'If a user with this email exists, a password reset link has been sent.' });

  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Reset Password
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // Also unlock account if it was locked
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    
    await user.save();

    res.json({ message: 'Password updated successfully. You can now login.' });

  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if they are provided in the request (even if empty string)
    if (req.body.name !== undefined) user.profile.name = req.body.name;
    if (req.body.phone !== undefined) user.profile.phone = req.body.phone;
    if (req.body.alternatePhone !== undefined) user.profile.alternatePhone = req.body.alternatePhone;
    if (req.body.whatsappNumber !== undefined) user.profile.whatsappNumber = req.body.whatsappNumber;
    
    // Address updates
    if (req.body.address) {
      user.profile.address = {
        ...user.profile.address,
        ...req.body.address
      };
    }

    await user.save();

    res.json(user); // Return the full user object (or specific fields if preferred)

  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};



module.exports = {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile
};