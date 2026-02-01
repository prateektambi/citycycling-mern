# 🚀 Final Steps - Test Your Email Setup

## ✅ You've Completed:
1. ✅ Added Gmail App Password to `server/.env`
2. ✅ Email configuration is ready

---

## 🔄 Step 1: Restart Your Server

Your server needs to reload the new environment variables.

### **Option A: Using the Terminal**
In your running terminal (where `npm run dev` is running):
1. Press `Ctrl + C` to stop the server
2. Run `npm run dev` again

### **Option B: In VS Code**
1. Find the terminal running `cd server; npm run dev`
2. Click in that terminal
3. Press `Ctrl + C`
4. Type: `npm run dev` and press Enter

---

## 🧪 Step 2: Test Email Configuration

Once server is restarted, open in your browser:

```
http://localhost:5000/api/test/email-config
```

### **Expected Response:**
```json
{
  "provider": "gmail",
  "user": "citycycling.in@gmail.com",
  "passwordSet": true,
  "fromName": "CityCycling",
  "fromAddress": "citycycling.in@gmail.com",
  "clientUrl": "http://localhost:5173",
  "note": "Password is hidden for security"
}
```

✅ If you see this, your configuration is loaded correctly!

---

## 📧 Step 3: Send Test Email

Open in your browser (replace with your email):

```
http://localhost:5000/api/test/email?to=your-email@example.com
```

### **Expected Response:**
```json
{
  "success": true,
  "message": "✅ Test verification email sent to your-email@example.com",
  "note": "Check your inbox (and spam folder)"
}
```

### **Check Your Email!**
You should receive a beautiful verification email with:
- ✅ CityCycling branding
- ✅ Verification button
- ✅ Professional design

---

## ❌ Troubleshooting

### **If email-config shows "Not set":**
- ❌ Server wasn't restarted
- ✅ Solution: Restart server (Ctrl+C, then npm run dev)

### **If you get "Invalid credentials" error:**
- ❌ Wrong App Password
- ✅ Solution: Double-check `EMAIL_PASSWORD` in `server/.env`
- ✅ Make sure you used Gmail App Password (not regular password)
- ✅ Remove any spaces from the password

### **If email doesn't arrive:**
- ✅ Check spam folder
- ✅ Wait 1-2 minutes
- ✅ Try a different email address
- ✅ Check server console for errors

---

## 🎯 Quick Test Commands

### **1. Check Configuration:**
```
http://localhost:5000/api/test/email-config
```

### **2. Send Verification Email:**
```
http://localhost:5000/api/test/email?to=your-email@example.com
```

### **3. Send Password Reset Email:**
```
http://localhost:5000/api/test/reset-email?to=your-email@example.com
```

---

## ✅ Success Checklist

- [ ] Server restarted
- [ ] `/api/test/email-config` shows correct settings
- [ ] Test email sent successfully
- [ ] Email received in inbox
- [ ] Email looks professional with CityCycling branding

---

## 🎉 Once Email Works

We can implement:
1. User registration with email verification
2. Password reset flow
3. Welcome emails
4. Order confirmation emails
5. And more!

---

## 📞 Need Help?

If you're stuck, share:
1. Response from `/api/test/email-config`
2. Error message (if any)
3. Server console output

I'll help you troubleshoot! 🚀
