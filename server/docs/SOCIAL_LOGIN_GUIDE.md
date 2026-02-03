# Social Login Setup Guide

This guide covers the social login implementation for CityCycling, currently supporting **Google** and **LinkedIn**.

---

## Overview

Social login allows users to sign in using their existing Google or LinkedIn accounts, eliminating the need for password creation and email verification.

### Supported Providers
| Provider | Status | Features |
|----------|--------|----------|
| Google | ✅ Active | One Tap popup, Button on login/register |
| LinkedIn | ✅ Active | OAuth 2.0, Button on login/register |
| Facebook | 🔜 Planned | - |
| Apple | 🔜 Planned | - |

---

## User Flow

1. **User clicks social login button** (or sees Google One Tap popup)
2. **OAuth provider popup** opens for authentication
3. **User grants permission** to share profile/email
4. **Backend verifies token** and creates/links user account
5. **User is logged in** automatically (no email verification needed)

---

## Environment Variables

### Server (`server/.env`)
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

### Client (`client/.env`)
```bash
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_LINKEDIN_CLIENT_ID=your_linkedin_client_id
```

---

## Setting Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Add authorized JavaScript origins:
   - `http://localhost:5173` (development)
   - `https://yourdomain.com` (production)
7. Add authorized redirect URIs:
   - `http://localhost:5173` (development)
   - `https://yourdomain.com` (production)
8. Copy **Client ID** and **Client Secret** to `.env` files

---

## Setting Up LinkedIn OAuth

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app
3. Go to **Products** tab → Request access to **Sign In with LinkedIn using OpenID Connect**
4. Go to **Auth** tab:
   - Add OAuth 2.0 redirect URLs:
     - `http://localhost:5173/auth/linkedin/callback` (development)
     - `https://yourdomain.com/auth/linkedin/callback` (production)
5. Copy **Client ID** and **Client Secret** to `.env` files

---

## File Structure

```
server/
├── controllers/
│   └── socialAuthController.js    # Handles OAuth token verification
├── routes/
│   └── authRoutes.js              # Routes: /api/auth/google, /api/auth/linkedin
└── models/
    └── User.js                    # authProvider, socialId fields

client/
├── components/
│   ├── GoogleOneTap.jsx           # Auto-popup for Google login
│   └── LinkedInAuth.jsx           # LinkedIn button & callback handler
├── pages/
│   ├── Login.jsx                  # Contains social login buttons
│   └── Register.jsx               # Contains social signup buttons
├── services/
│   └── authService.js             # googleAuth(), linkedinAuth() methods
└── App.jsx                        # LinkedInCallback route
```

---

## API Endpoints

### POST `/api/auth/google`
Authenticates user with Google ID token.

**Request:**
```json
{ "credential": "google_id_token" }
```

**Response:**
```json
{
  "_id": "user_id",
  "name": "John Doe",
  "email": "john@gmail.com",
  "role": "user",
  "authProvider": "google",
  "token": "jwt_token"
}
```

### POST `/api/auth/linkedin`
Authenticates user with LinkedIn authorization code.

**Request:**
```json
{
  "code": "linkedin_auth_code",
  "redirectUri": "http://localhost:5173/auth/linkedin/callback"
}
```

**Response:** Same format as Google.

---

## User Model Changes

The `User` model includes:

```javascript
authProvider: {
  type: String,
  enum: ['local', 'google', 'facebook', 'apple', 'linkedin'],
  default: 'local'
},
socialId: {
  type: String  // Provider's unique user ID
},
password: {
  type: String,
  required: function() { return this.authProvider === 'local'; }
}
```

---

## Account Linking Behavior

| Scenario | Behavior |
|----------|----------|
| New user via social login | Creates account with `authProvider: 'google'/'linkedin'` |
| Existing email user logs in via social | Links social account, changes `authProvider` |
| Social user's email verified | Automatically set to `true` |

---

## Troubleshooting

### Google One Tap Not Showing
- Only works on HTTPS in production
- May be blocked by browser extensions
- User may have dismissed it (shows again after some time)

### LinkedIn "Invalid Client ID"
- Ensure `LINKEDIN_CLIENT_ID` is set in server `.env`
- Restart server after adding env variables

### LinkedIn "State Mismatch"
- Fixed by using `useRef` to prevent double execution
- Uses `replace: true` in navigation to clean history

---

## Security Notes

- **Google tokens** are verified server-side using `google-auth-library`
- **LinkedIn codes** are exchanged for tokens server-side (client secret never exposed)
- **No passwords stored** for social login users
- **Email verification bypassed** (social providers already verify emails)
