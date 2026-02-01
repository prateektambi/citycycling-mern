# Email System Setup Guide

## 📧 How Email Verification & Password Reset Works

### **Flow Diagram:**

```
User Registration
    ↓
Generate Verification Token (32-byte random hex)
    ↓
Save token + expiry to user document
    ↓
Send email with verification link
    ↓
User clicks link → Verify token → Mark email as verified
```

```
Forgot Password
    ↓
Generate Reset Token (32-byte random hex)
    ↓
Save token + expiry (30 min) to user document
    ↓
Send email with reset link
    ↓
User clicks link → Verify token → Allow password change
```

---

## 🚀 Setup Instructions

### **Step 1: Install NodeMailer**

```bash
npm install nodemailer
```

### **Step 2: Choose Your Email Provider**

#### **Option A: Gmail (Easiest for Testing)**

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Add to `.env`:**
```env
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM_NAME=CityCycling
EMAIL_FROM_ADDRESS=your-email@gmail.com
CLIENT_URL=http://localhost:5173
```

#### **Option B: SendGrid (Recommended for Production)**

1. **Sign up:** https://sendgrid.com (Free tier: 100 emails/day)
2. **Create API Key:**
   - Dashboard → Settings → API Keys → Create API Key
   - Copy the API key

3. **Add to `.env`:**
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM_NAME=CityCycling
EMAIL_FROM_ADDRESS=noreply@citycycling.in
CLIENT_URL=https://citycycling.in
```

4. **Verify Sender Identity:**
   - SendGrid → Settings → Sender Authentication
   - Verify your email or domain

#### **Option C: AWS SES (Best for Scale)**

1. **AWS Console** → SES → Create SMTP Credentials
2. **Verify Email/Domain**
3. **Add to `.env`:**
```env
EMAIL_PROVIDER=aws-ses
AWS_SES_HOST=email-smtp.us-east-1.amazonaws.com
AWS_SES_USER=your-smtp-username
AWS_SES_PASSWORD=your-smtp-password
EMAIL_FROM_NAME=CityCycling
EMAIL_FROM_ADDRESS=noreply@citycycling.in
CLIENT_URL=https://citycycling.in
```

---

## 📝 Environment Variables Reference

```env
# Email Provider (gmail, sendgrid, aws-ses, smtp)
EMAIL_PROVIDER=gmail

# Gmail Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

# AWS SES Configuration
AWS_SES_HOST=email-smtp.region.amazonaws.com
AWS_SES_USER=your-smtp-username
AWS_SES_PASSWORD=your-smtp-password

# Generic SMTP (for Mailgun, Postmark, etc.)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASSWORD=your-password

# Email Settings
EMAIL_FROM_NAME=CityCycling
EMAIL_FROM_ADDRESS=noreply@citycycling.in

# Frontend URL (for email links)
CLIENT_URL=http://localhost:5173  # Dev
# CLIENT_URL=https://citycycling.in  # Production
```

---

## 🔧 Implementation Example

### **1. User Registration with Email Verification**

```javascript
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken, sendVerificationEmail } = require('../services/emailService');
const { emailConfig } = require('../config/emailConfig');

router.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Generate verification token
    const verificationToken = generateToken();
    const verificationExpiry = new Date(Date.now() + emailConfig.verificationTokenExpiry);

    // Create user
    const user = new User({
      email,
      password: await bcrypt.hash(password, 10),
      profile: { name, phone },
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpiry,
      emailVerified: false
    });

    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(user, verificationToken);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // User is created, but email failed - you can handle this gracefully
    }

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      email: user.email
    });

  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});
```

### **2. Email Verification Endpoint**

```javascript
router.get('/api/auth/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with valid token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification link' 
      });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email (optional)
    await sendWelcomeEmail(user);

    res.json({ 
      message: 'Email verified successfully! You can now log in.' 
    });

  } catch (error) {
    res.status(500).json({ message: 'Verification failed' });
  }
});
```

### **3. Forgot Password**

```javascript
const { generateToken, sendPasswordResetEmail } = require('../services/emailService');
const { emailConfig } = require('../config/emailConfig');

router.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    
    // Don't reveal if email exists (security best practice)
    if (!user) {
      return res.json({ 
        message: 'If that email exists, a reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = generateToken();
    const resetExpiry = new Date(Date.now() + emailConfig.passwordResetTokenExpiry);

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpiry;
    await user.save();

    // Send reset email
    await sendPasswordResetEmail(user, resetToken);

    res.json({ 
      message: 'If that email exists, a reset link has been sent.' 
    });

  } catch (error) {
    res.status(500).json({ message: 'Error processing request' });
  }
});
```

### **4. Reset Password**

```javascript
router.post('/api/auth/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset link' 
      });
    }

    // Update password
    user.password = await bcrypt.hash(password, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0; // Reset login attempts
    await user.save();

    res.json({ 
      message: 'Password reset successful! You can now log in.' 
    });

  } catch (error) {
    res.status(500).json({ message: 'Password reset failed' });
  }
});
```

---

## 🎨 Email Templates Included

### **1. Verification Email**
- ✅ Beautiful gradient header
- ✅ Clear call-to-action button
- ✅ Fallback text link
- ✅ 24-hour expiry notice
- ✅ Plain text version

### **2. Password Reset Email**
- ✅ Security-focused design
- ✅ Warning box with important info
- ✅ 30-minute expiry notice
- ✅ Plain text version

### **3. Welcome Email**
- ✅ Sent after email verification
- ✅ Onboarding information
- ✅ Next steps guide
- ✅ Link to catalogue

### **4. Order Confirmation Email**
- ✅ Order details
- ✅ Tracking information
- ✅ Professional design

---

## 🧪 Testing Emails

### **Test Email Sending:**

```javascript
// Create a test route (remove in production)
router.get('/api/test-email', async (req, res) => {
  try {
    const testUser = {
      email: 'test@example.com',
      profile: { name: 'Test User' }
    };
    
    const token = 'test-token-123';
    
    await sendVerificationEmail(testUser, token);
    
    res.json({ message: 'Test email sent!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🔒 Security Best Practices

1. ✅ **Tokens are cryptographically secure** (32 random bytes)
2. ✅ **Tokens expire** (24h for verification, 30min for reset)
3. ✅ **Tokens are single-use** (deleted after use)
4. ✅ **Don't reveal if email exists** (forgot password)
5. ✅ **Use HTTPS** in production
6. ✅ **Rate limit** email endpoints

---

## 📊 Email Delivery Tips

### **Improve Deliverability:**

1. **Use a verified domain** (not Gmail for production)
2. **Set up SPF, DKIM, DMARC** records
3. **Use professional "from" address** (noreply@citycycling.in)
4. **Include unsubscribe link** (for marketing emails)
5. **Monitor bounce rates**
6. **Start with small volumes** and scale up

### **Avoid Spam Folder:**

- ✅ Use clear subject lines
- ✅ Include plain text version
- ✅ Avoid spam trigger words
- ✅ Don't use URL shorteners
- ✅ Include physical address in footer
- ✅ Test with mail-tester.com

---

## 🚨 Error Handling

```javascript
try {
  await sendVerificationEmail(user, token);
} catch (emailError) {
  // Log error but don't fail registration
  console.error('Email failed:', emailError);
  
  // Option 1: Still register user, show message
  // "Registration successful, but email failed. Please contact support."
  
  // Option 2: Fail registration
  // throw new Error('Registration failed - email service unavailable');
  
  // Option 3: Queue for retry
  // await emailQueue.add({ userId: user._id, type: 'verification' });
}
```

---

## 📈 Production Checklist

- [ ] Install nodemailer: `npm install nodemailer`
- [ ] Choose email provider (Gmail/SendGrid/AWS SES)
- [ ] Set up provider account and get credentials
- [ ] Add environment variables to `.env`
- [ ] Test email sending in development
- [ ] Verify sender domain (for production)
- [ ] Update CLIENT_URL to production URL
- [ ] Implement rate limiting on email endpoints
- [ ] Set up email monitoring/logging
- [ ] Test all email flows (verification, reset, welcome)
- [ ] Check spam score with mail-tester.com
- [ ] Set up email analytics (SendGrid/AWS SES dashboards)

---

## 🎯 Recommended Setup for CityCycling

**Development:**
- Use Gmail with App Password
- CLIENT_URL: http://localhost:5173

**Production:**
- Use SendGrid (free tier sufficient to start)
- CLIENT_URL: https://citycycling.in
- Verify sender domain: citycycling.in
- Monitor email delivery rates

---

## 💡 Next Steps

1. Install nodemailer
2. Set up Gmail App Password (for testing)
3. Add environment variables
4. Implement registration endpoint
5. Test email flow
6. Upgrade to SendGrid for production
