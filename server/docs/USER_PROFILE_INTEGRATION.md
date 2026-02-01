# User Profile Integration Guide

## Quick Reference: Using User Data in Orders

### 1. Field Mapping: User → Order

| User Model Field | Order Model Field | Notes |
|-----------------|-------------------|-------|
| `profile.name` | `customer.name` | Required for orders |
| `profile.phone` | `customer.phone` | Required for orders |
| `profile.alternatePhone` OR `profile.whatsappNumber` | `customer.alternatePhone` | Optional, prefers alternatePhone |
| `profile.address.*` (combined) | `customer.address` | Formatted as single string |
| `profile.address.pincode` | `customer.pincode` | Required for delivery |

---

### 2. Backend: Pre-fill Order with User Data

#### Example: Get User Profile for Order Creation
```javascript
// In orderController.js or similar

const { userToCustomer } = require('../utils/userHelpers');

// Get current user's profile
router.get('/api/orders/prefill', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Transform user data to customer format
    const customerData = userToCustomer(user);
    
    res.json({
      customer: customerData,
      email: user.email,
      whatsappNumber: user.profile?.whatsappNumber || user.profile?.phone
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user data' });
  }
});
```

#### Example: Validate Profile Before Order Creation
```javascript
const { validateUserProfileForOrder } = require('../utils/userHelpers');

router.post('/api/orders', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Check if user has complete profile
    const validation = validateUserProfileForOrder(user);
    
    if (!validation.isComplete) {
      return res.status(400).json({
        message: 'Please complete your profile before creating an order',
        missingFields: validation.missingFields,
        redirectTo: '/profile/edit'
      });
    }

    // Proceed with order creation
    // ...
  } catch (error) {
    res.status(500).json({ message: 'Error creating order' });
  }
});
```

---

### 3. Frontend: User Profile Form

#### Example: Profile Edit Component
```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProfileEdit = () => {
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    alternatePhone: '',
    whatsappNumber: '',
    address: {
      street: '',
      area: '',
      city: '',
      state: '',
      pincode: '',
      landmark: ''
    }
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get('/api/users/profile');
      setProfile(res.data.profile || profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/users/profile', { profile });
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Error updating profile');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Complete Your Profile</h2>
      
      {/* Basic Info */}
      <input
        type="text"
        placeholder="Full Name"
        value={profile.name}
        onChange={(e) => setProfile({...profile, name: e.target.value})}
        required
      />
      
      <input
        type="tel"
        placeholder="Phone Number"
        value={profile.phone}
        onChange={(e) => setProfile({...profile, phone: e.target.value})}
        required
      />
      
      <input
        type="tel"
        placeholder="Alternate Phone (Optional)"
        value={profile.alternatePhone}
        onChange={(e) => setProfile({...profile, alternatePhone: e.target.value})}
      />
      
      <input
        type="tel"
        placeholder="WhatsApp Number"
        value={profile.whatsappNumber}
        onChange={(e) => setProfile({...profile, whatsappNumber: e.target.value})}
      />

      {/* Address */}
      <h3>Address Details</h3>
      
      <input
        type="text"
        placeholder="Street Address"
        value={profile.address.street}
        onChange={(e) => setProfile({
          ...profile, 
          address: {...profile.address, street: e.target.value}
        })}
        required
      />
      
      <input
        type="text"
        placeholder="Area/Locality"
        value={profile.address.area}
        onChange={(e) => setProfile({
          ...profile, 
          address: {...profile.address, area: e.target.value}
        })}
      />
      
      <input
        type="text"
        placeholder="Landmark (Optional)"
        value={profile.address.landmark}
        onChange={(e) => setProfile({
          ...profile, 
          address: {...profile.address, landmark: e.target.value}
        })}
      />
      
      <input
        type="text"
        placeholder="City"
        value={profile.address.city}
        onChange={(e) => setProfile({
          ...profile, 
          address: {...profile.address, city: e.target.value}
        })}
        required
      />
      
      <input
        type="text"
        placeholder="State"
        value={profile.address.state}
        onChange={(e) => setProfile({
          ...profile, 
          address: {...profile.address, state: e.target.value}
        })}
      />
      
      <input
        type="text"
        placeholder="Pincode"
        value={profile.address.pincode}
        onChange={(e) => setProfile({
          ...profile, 
          address: {...profile.address, pincode: e.target.value}
        })}
        required
      />

      <button type="submit">Save Profile</button>
    </form>
  );
};

export default ProfileEdit;
```

---

### 4. Frontend: Pre-fill Order Form

#### Example: Create Order with User Data
```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CreateOrder = () => {
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    alternatePhone: '',
    address: '',
    pincode: ''
  });

  useEffect(() => {
    // Pre-fill with user data
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await axios.get('/api/orders/prefill');
      setCustomerData(res.data.customer);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/orders', {
        customer: customerData,
        // ... other order fields
      });
      alert('Order created successfully!');
    } catch (error) {
      if (error.response?.data?.missingFields) {
        alert(`Please complete your profile: ${error.response.data.missingFields.join(', ')}`);
        // Redirect to profile edit
        window.location.href = '/profile/edit';
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Order</h2>
      
      {/* Customer fields are pre-filled but editable */}
      <input
        type="text"
        value={customerData.name}
        onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
        placeholder="Customer Name"
      />
      
      <input
        type="tel"
        value={customerData.phone}
        onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
        placeholder="Phone"
      />
      
      <input
        type="tel"
        value={customerData.alternatePhone}
        onChange={(e) => setCustomerData({...customerData, alternatePhone: e.target.value})}
        placeholder="Alternate Phone"
      />
      
      <textarea
        value={customerData.address}
        onChange={(e) => setCustomerData({...customerData, address: e.target.value})}
        placeholder="Delivery Address"
      />
      
      <input
        type="text"
        value={customerData.pincode}
        onChange={(e) => setCustomerData({...customerData, pincode: e.target.value})}
        placeholder="Pincode"
      />

      {/* Rest of order form... */}
      
      <button type="submit">Create Order</button>
    </form>
  );
};

export default CreateOrder;
```

---

### 5. API Endpoints to Implement

#### User Profile Management
```javascript
// Get current user's profile
GET /api/users/profile
Authorization: Bearer <token>

// Update current user's profile
PUT /api/users/profile
Authorization: Bearer <token>
Body: {
  profile: {
    name: "John Doe",
    phone: "9876543210",
    // ... other fields
  }
}

// Get user data for order pre-fill
GET /api/orders/prefill
Authorization: Bearer <token>
```

---

### 6. Workflow: User Creates Online Order

```
1. User logs in → JWT token stored
2. User navigates to "Book Now" or "Create Order"
3. Frontend calls GET /api/orders/prefill
4. Backend checks if user has complete profile
   - If incomplete → Return missing fields
   - If complete → Return customer data
5. Frontend shows:
   - If incomplete → Redirect to profile completion
   - If complete → Pre-fill order form with user data
6. User reviews/edits data and submits order
7. Backend validates and creates order
```

---

### 7. Admin vs User Order Creation

#### Admin Creating Order (Current Flow)
- Admin manually enters all customer details
- No user account required for customer
- Customer data stored only in Order

#### User Creating Order (New Flow)
- User must be logged in
- User profile auto-fills customer data
- User can still edit data before submitting
- Order links to user account (future: order history)

---

### 8. Database Relationships (Future Enhancement)

Consider adding a reference from Order to User:

```javascript
// In Order model
{
  // ... existing fields
  
  // Optional: Link to user account if order was created by logged-in user
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Not required for admin-created orders
  }
}
```

This allows:
- Users to view their order history
- Better customer analytics
- Personalized recommendations
- Loyalty programs

---

### 9. Testing Checklist

- [ ] User can register with email/password
- [ ] User can complete profile
- [ ] Profile validation works correctly
- [ ] Order form pre-fills with user data
- [ ] User can edit pre-filled data
- [ ] Order creation works with user data
- [ ] Incomplete profile redirects to profile edit
- [ ] Admin can still create orders manually
- [ ] Migration script updates existing users
- [ ] Address formatting works correctly
- [ ] Phone number fields map correctly

---

### 10. Next Steps

1. **Implement User Profile API endpoints**
2. **Create Profile Edit page**
3. **Update Order Creation to support user pre-fill**
4. **Add profile completion check**
5. **Create "My Orders" page for users**
6. **Add user reference to Order model**
7. **Implement order history for users**
