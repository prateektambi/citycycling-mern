# Gmail Setup for CityCycling - Step by Step

## 📧 Getting Your Gmail App Password

### **Step 1: Enable 2-Factor Authentication**

1. Go to your Google Account: https://myaccount.google.com
2. Click on **Security** (left sidebar)
3. Scroll to **"How you sign in to Google"**
4. Click on **"2-Step Verification"**
5. Follow the steps to enable it (if not already enabled)
   - You'll need your phone for verification
   - This is required for App Passwords

---

### **Step 2: Generate App Password**

1. Once 2FA is enabled, go back to **Security**
2. Scroll to **"How you sign in to Google"**
3. Click on **"App passwords"** (or go directly to: https://myaccount.google.com/apppasswords)
4. You may need to sign in again
5. Select:
   - **App**: Mail
   - **Device**: Other (Custom name)
   - Type: "CityCycling Server"
6. Click **Generate**
7. **Copy the 16-character password** (it looks like: `abcd efgh ijkl mnop`)
   - ⚠️ You won't be able to see this again!
   - Save it somewhere safe

---

### **Step 3: Update Your .env File**

Open `e:\citycycling\mern\server\.env` and update these lines:

```env
# Replace with your actual Gmail address
EMAIL_USER=citycycling.in@gmail.com

# Replace with the 16-character app password (remove spaces)
EMAIL_PASSWORD=abcdefghijklmnop

# This will appear as the sender name
EMAIL_FROM_NAME=CityCycling

# This should match EMAIL_USER
EMAIL_FROM_ADDRESS=citycycling.in@gmail.com
```

**Example:**
```env
EMAIL_USER=citycycling.in@gmail.com
EMAIL_PASSWORD=xyzw1234abcd5678
EMAIL_FROM_NAME=CityCycling
EMAIL_FROM_ADDRESS=citycycling.in@gmail.com
```

---

### **Step 4: Test Email Sending**

I'll create a test endpoint for you to verify it works!

---

## ⚠️ Important Notes

### **Gmail Sending Limits:**
- **500 emails per day** (free Gmail account)
- **2000 emails per day** (Google Workspace account)
- If you exceed this, Gmail will temporarily block sending

### **Security:**
- ✅ App Password is safer than your regular password
- ✅ App Password only works for this specific app
- ✅ You can revoke it anytime from Google Account settings
- ✅ Never share your App Password

### **Troubleshooting:**

**"Invalid credentials" error:**
- Make sure you copied the App Password correctly (no spaces)
- Make sure 2FA is enabled
- Try generating a new App Password

**"Less secure app access" error:**
- This is outdated - use App Passwords instead
- Don't enable "Less secure app access" (it's insecure)

**Emails going to spam:**
- This is normal for development
- For production, use a verified domain with SendGrid/AWS SES
- Check spam folder during testing

---

## 🚀 Next Steps

1. ✅ Enable 2FA on your Gmail account
2. ✅ Generate App Password
3. ✅ Update `.env` file with your credentials
4. ✅ Test email sending
5. ✅ Implement registration endpoint

---

## 📞 Need Help?

If you get stuck:
1. Make sure 2FA is enabled
2. Try generating a new App Password
3. Check for typos in .env file
4. Restart your server after updating .env

---

## 🎯 For Production

**Gmail is great for testing, but for production:**
- Use SendGrid (100 emails/day free)
- Use AWS SES (very cheap, $0.10 per 1000 emails)
- Use a custom domain (noreply@citycycling.in)
- Better deliverability and analytics

We can switch to SendGrid later - it's just changing the EMAIL_PROVIDER in .env!
