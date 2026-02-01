# Gmail Email Setup - Quick Start

## ✅ What's Been Done

1. ✅ Installed `nodemailer`
2. ✅ Created email configuration (`emailConfig.js`)
3. ✅ Created email service (`emailService.js`)
4. ✅ Added email variables to `.env`
5. ✅ Created test endpoints

---

## 🚀 Next Steps for You

### **Step 1: Get Gmail App Password (5 minutes)**

1. **Enable 2-Factor Authentication:**
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification" if not already enabled

2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select: Mail → Other (CityCycling Server)
   - Click Generate
   - **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### **Step 2: Update .env File**

Open `e:\citycycling\mern\.env` and replace these values:

```env
# Replace with your Gmail address
EMAIL_USER=citycycling.in@gmail.com

# Replace with your 16-char app password (remove spaces)
EMAIL_PASSWORD=abcdefghijklmnop

# Keep these as is
EMAIL_FROM_NAME=CityCycling
EMAIL_FROM_ADDRESS=citycycling.in@gmail.com
```

### **Step 3: Restart Your Server**

The server needs to reload the new environment variables.

---

## 🧪 Test Email Sending

Once you've updated `.env` and restarted the server, test it:

### **Option 1: Browser**
Open in your browser:
```
http://localhost:5000/api/test/email?to=your-email@example.com
```

### **Option 2: Postman/Thunder Client**
```
GET http://localhost:5000/api/test/email?to=your-email@example.com
```

### **Option 3: curl**
```bash
curl "http://localhost:5000/api/test/email?to=your-email@example.com"
```

---

## ✅ Success Response

If everything works, you'll see:

```json
{
  "success": true,
  "message": "✅ Test verification email sent to your-email@example.com",
  "note": "Check your inbox (and spam folder)",
  "verificationLink": "http://localhost:5173/verify-email/abc123..."
}
```

**Check your email!** You should receive a beautiful verification email.

---

## ❌ Troubleshooting

### **Error: "Invalid credentials"**
- ✅ Make sure you used **App Password**, not your regular Gmail password
- ✅ Remove spaces from the app password
- ✅ Make sure 2FA is enabled

### **Error: "Missing credentials"**
- ✅ Check `.env` file has `EMAIL_USER` and `EMAIL_PASSWORD`
- ✅ Restart your server after updating `.env`

### **Email not received:**
- ✅ Check spam folder
- ✅ Wait a few minutes (Gmail can be slow sometimes)
- ✅ Try a different email address

### **Check Configuration:**
```
GET http://localhost:5000/api/test/email-config
```

This shows your current email settings (password is hidden).

---

## 📧 Test Endpoints Available

1. **Verification Email:**
   ```
   GET /api/test/email?to=email@example.com
   ```

2. **Password Reset Email:**
   ```
   GET /api/test/reset-email?to=email@example.com
   ```

3. **Check Configuration:**
   ```
   GET /api/test/email-config
   ```

---

## 🎯 What's Next?

Once email is working:

1. ✅ Implement user registration endpoint
2. ✅ Implement email verification endpoint
3. ✅ Implement forgot password endpoint
4. ✅ Implement reset password endpoint
5. ✅ Create frontend pages for these flows

---

## 📝 Current .env Template

```env
MONGO_URI=mongodb+srv://...
PORT=5000
NODE_ENV='dev'
JWT_SECRET=your-secret-key-here

# Email Configuration (Gmail)
EMAIL_PROVIDER=gmail
EMAIL_USER=citycycling.in@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM_NAME=CityCycling
EMAIL_FROM_ADDRESS=citycycling.in@gmail.com

# Frontend URL (for email links)
CLIENT_URL=http://localhost:5173
```

---

## 🔒 Security Notes

- ✅ App Password is safer than your regular password
- ✅ Never commit `.env` to git
- ✅ App Password only works for this app
- ✅ You can revoke it anytime from Google Account

---

## 📞 Need Help?

If you get stuck, let me know and I'll help troubleshoot!

**Common issues:**
1. Forgot to enable 2FA → Enable it first
2. Used regular password → Use App Password
3. Didn't restart server → Restart after updating .env
4. Typo in .env → Double-check EMAIL_USER and EMAIL_PASSWORD
