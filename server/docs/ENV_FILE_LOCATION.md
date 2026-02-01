# .env File Location - Clarification

## ✅ **Use: `server/.env`**

Your server is configured to load environment variables from:
```
e:\citycycling\mern\server\.env
```

## 📁 Why?

In `server/config.js` (line 2):
```javascript
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
```

This loads `.env` from the **server folder**, not the root.

---

## 📂 Your Current Structure

```
e:\citycycling\mern\
├── .env                    ❌ NOT USED (can be deleted)
├── client/
│   └── (React app)
└── server/
    ├── .env                ✅ THIS ONE IS USED
    ├── config.js           (loads server/.env)
    ├── server.js
    └── ...
```

---

## ✅ What I Did

I added the email configuration to the **correct** file:
```
e:\citycycling\mern\server\.env
```

---

## 📝 Your server/.env Now Contains

```env
# Environment
NODE_ENV='dev'

# Database
MONGO_URI=mongodb+srv://...

# Server
PORT=5000

# Security
JWT_SECRET=...
ADMIN_USER_PASSWORD=...

# Email (NEW)
EMAIL_PROVIDER=gmail
EMAIL_USER=citycycling.in@gmail.com
EMAIL_PASSWORD=your-gmail-app-password-here
EMAIL_FROM_NAME=CityCycling
EMAIL_FROM_ADDRESS=citycycling.in@gmail.com
CLIENT_URL=http://localhost:5173
```

---

## 🎯 Next Steps

1. ✅ Open `server/.env` (the correct one)
2. ✅ Replace `EMAIL_PASSWORD=your-gmail-app-password-here` with your actual Gmail App Password
3. ✅ Restart your server
4. ✅ Test: `http://localhost:5000/api/test/email?to=your-email@example.com`

---

## 🗑️ Optional: Clean Up

You can delete the root `.env` file since it's not being used:
```
e:\citycycling\mern\.env  ← Can be deleted
```

Or keep it empty as a placeholder.

---

## 🔒 Security Note

Make sure `.env` is in your `.gitignore`:

```gitignore
# server/.gitignore
.env
node_modules/
```

✅ Your `server/.gitignore` already has this, so you're good!

---

## 📊 Summary

| File | Status | Used By |
|------|--------|---------|
| `e:\citycycling\mern\.env` | ❌ Not used | Nothing |
| `e:\citycycling\mern\server\.env` | ✅ **ACTIVE** | Server |

**Always edit: `server/.env`** ✅
