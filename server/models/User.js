const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // ========== AUTHENTICATION FIELDS ==========
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: function() { return this.authProvider === 'local'; } // Only required for local auth
  },
  authProvider: {
    type: String,
    enum: ['local', 'google', 'facebook', 'apple', 'linkedin'],
    default: 'local'
  },
  socialId: { type: String }, // Provider-specific user ID
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },

  // ========== PROFILE FIELDS ==========
  profile: {
    name: { 
      type: String, 
      trim: true 
    },
    phone: { 
      type: String, 
      trim: true 
    },
    alternatePhone: { 
      type: String, 
      trim: true 
    },
    whatsappNumber: { 
      type: String, 
      trim: true 
    },
    
    // Address Details
    address: {
      street: { type: String, trim: true },
      area: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      landmark: { type: String, trim: true }
    },

    // Optional profile picture
    profilePicture: { type: String },
    
    // Date of birth (optional, for age verification if needed)
    dateOfBirth: { type: Date }
  },

  // ========== EMAIL VERIFICATION ==========
  emailVerified: { 
    type: Boolean, 
    default: false 
  },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date },

  // ========== PASSWORD RESET ==========
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },

  // ========== ACCOUNT STATUS ==========
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  },

  // ========== PREFERENCES ==========
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: true }
    },
    language: { type: String, default: 'en' }
  },

  // ========== SECURITY & TRACKING ==========
  lastLogin: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },

  // ========== TERMS & PRIVACY ==========
  termsAccepted: { type: Boolean, default: false },
  termsAcceptedAt: { type: Date },
  privacyAccepted: { type: Boolean, default: false },
  privacyAcceptedAt: { type: Date }

}, { 
  timestamps: true // Adds createdAt and updatedAt automatically
});

// ========== VIRTUAL FIELDS ==========
// Check if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Get full address as string
userSchema.virtual('profile.fullAddress').get(function() {
  const addr = this.profile.address;
  if (!addr || !addr.street) return '';
  
  const parts = [
    addr.street,
    addr.area,
    addr.city,
    addr.state,
    addr.pincode
  ].filter(Boolean);
  
  return parts.join(', ');
});

// ========== METHODS ==========
// Increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  // Otherwise increment
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock the account after 5 failed attempts for 2 hours
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// ========== INDEXES ==========
userSchema.index({ 'profile.phone': 1 });
userSchema.index({ accountStatus: 1 });

module.exports = mongoose.model('User', userSchema);