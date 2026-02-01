# User Model Documentation

## Overview
The User model has been enhanced to support both authentication and comprehensive user profiles needed for order creation and customer management.

---

## Schema Structure

### 1. Authentication Fields
```javascript
{
  email: String (required, unique, lowercase, trimmed)
  password: String (required, hashed with bcrypt)
  role: 'user' | 'admin' (default: 'user')
}
```

### 2. Profile Fields
```javascript
profile: {
  // Basic Info
  name: String
  phone: String
  alternatePhone: String
  whatsappNumber: String
  
  // Address (structured for flexibility)
  address: {
    street: String
    area: String
    city: String
    state: String
    pincode: String
    landmark: String
  }
  
  // Optional
  profilePicture: String (URL)
  dateOfBirth: Date
}
```

### 3. Email Verification
```javascript
{
  emailVerified: Boolean (default: false)
  emailVerificationToken: String
  emailVerificationExpires: Date
}
```

### 4. Password Reset
```javascript
{
  passwordResetToken: String
  passwordResetExpires: Date
}
```

### 5. Account Management
```javascript
{
  accountStatus: 'active' | 'suspended' | 'deleted' (default: 'active')
  lastLogin: Date
  loginAttempts: Number (default: 0)
  lockUntil: Date (account locked after 5 failed attempts)
}
```

### 6. User Preferences
```javascript
preferences: {
  notifications: {
    email: Boolean (default: true)
    sms: Boolean (default: false)
    whatsapp: Boolean (default: true)
  }
  language: String (default: 'en')
}
```

### 7. Legal Compliance
```javascript
{
  termsAccepted: Boolean (default: false)
  termsAcceptedAt: Date
  privacyAccepted: Boolean (default: false)
  privacyAcceptedAt: Date
}
```

### 8. Timestamps (Auto-generated)
```javascript
{
  createdAt: Date
  updatedAt: Date
}
```

---

## Virtual Fields

### `isLocked`
Returns `true` if account is currently locked due to failed login attempts.

### `profile.fullAddress`
Returns formatted full address as a string (e.g., "123 Main St, Downtown, Mumbai, Maharashtra, 400001")

---

## Methods

### `incLoginAttempts()`
Increments login attempts counter. Locks account for 2 hours after 5 failed attempts.

### `resetLoginAttempts()`
Resets login attempts counter and removes account lock.

---

## Indexes
- `email` (unique index)
- `profile.phone`
- `accountStatus`

---

## Usage Examples

### Creating a New User
```javascript
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const newUser = new User({
  email: 'user@example.com',
  password: await bcrypt.hash('password123', 10),
  role: 'user',
  profile: {
    name: 'John Doe',
    phone: '9876543210',
    whatsappNumber: '9876543210',
    address: {
      street: '123 Main Street',
      area: 'Downtown',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001'
    }
  },
  termsAccepted: true,
  termsAcceptedAt: new Date()
});

await newUser.save();
```

### Using User Data for Order Creation
```javascript
const { userToCustomer } = require('./utils/userHelpers');

// Get user
const user = await User.findById(userId);

// Transform to order customer format
const customerData = userToCustomer(user);

// Use in order creation
const order = new Order({
  customer: customerData,
  // ... other order fields
});
```

### Validating User Profile Before Order
```javascript
const { validateUserProfileForOrder } = require('./utils/userHelpers');

const validation = validateUserProfileForOrder(user);

if (!validation.isComplete) {
  return res.status(400).json({
    message: 'Please complete your profile before creating an order',
    missingFields: validation.missingFields
  });
}
```

---

## Migration Notes

### For Existing Admin Users
Existing users in the database will have:
- `role: 'admin'` (if they were created before this update)
- No `profile` object initially
- `emailVerified: false`

You may want to run a migration script to:
1. Update existing users with `role: 'admin'`
2. Add basic profile structure
3. Mark admin emails as verified

### Migration Script Example
```javascript
// Run this once to update existing users
const User = require('./models/User');

async function migrateExistingUsers() {
  const users = await User.find({});
  
  for (const user of users) {
    // Set role to admin for existing users
    user.role = 'admin';
    
    // Initialize profile if it doesn't exist
    if (!user.profile) {
      user.profile = {
        name: user.email.split('@')[0], // Use email prefix as name
        address: {}
      };
    }
    
    // Mark admin emails as verified
    user.emailVerified = true;
    
    await user.save();
  }
  
  console.log(`Migrated ${users.length} users`);
}
```

---

## API Integration Points

### Registration
When users register, collect:
- Email (required)
- Password (required)
- Name (optional initially, required for orders)
- Phone (optional initially, required for orders)

### Profile Completion
Before allowing order creation, ensure users have:
- Name
- Phone number
- Complete address (street, city, pincode minimum)

### Order Creation Flow
1. Check if user is logged in
2. Validate profile completeness
3. Pre-fill order form with user data
4. Allow user to modify if needed
5. Create order with customer data

---

## Security Considerations

1. **Password Storage**: Always hash passwords with bcrypt before saving
2. **Email Verification**: Implement email verification before allowing critical actions
3. **Account Locking**: Automatic locking after 5 failed login attempts
4. **Token Expiry**: Email verification and password reset tokens should expire
5. **Data Privacy**: Never expose password or tokens in API responses

---

## Future Enhancements

1. **Social Login**: Add fields for Google/Facebook IDs
2. **KYC**: Add document verification fields
3. **Payment Methods**: Store saved payment methods
4. **Booking History**: Reference to user's orders
5. **Loyalty Points**: Add rewards/points system
6. **Multiple Addresses**: Allow users to save multiple delivery addresses
