const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT Token
const generateJwtToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

/**
 * @desc    Google OAuth Login/Register
 * @route   POST /api/auth/google
 * @access  Public
 */
const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({ message: 'Google email is not verified' });
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (user) {
      // User exists - update Google info if not already linked
      if (user.authProvider === 'local') {
        // Link Google to existing local account
        user.authProvider = 'google';
        user.socialId = googleId;
        if (picture && !user.profile.profilePicture) {
          user.profile.profilePicture = picture;
        }
      }
      user.lastLogin = Date.now();
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        email,
        authProvider: 'google',
        socialId: googleId,
        emailVerified: true, // Google already verified the email
        profile: {
          name,
          profilePicture: picture
        },
        role: 'user'
      });
    }

    // Generate JWT and return user info
    res.json({
      _id: user._id,
      name: user.profile?.name || email.split('@')[0],
      email: user.email,
      role: user.role,
      isEmailVerified: true,
      profile: user.profile,
      authProvider: user.authProvider,
      token: generateJwtToken(user._id, user.role),
    });

  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ message: 'Google authentication failed' });
  }
};

/**
 * @desc    LinkedIn OAuth Login/Register
 * @route   POST /api/auth/linkedin
 * @access  Public
 */
const linkedinAuth = async (req, res) => {
  try {
    const { code, redirectUri } = req.body;

    console.log('LinkedIn Auth: Starting with code length:', code?.length, 'redirectUri:', redirectUri);

    if (!code) {
      return res.status(400).json({ message: 'LinkedIn authorization code is required' });
    }

    // Exchange code for access token
    console.log('LinkedIn Auth: Exchanging code for token...');
    let tokenResponse;
    try {
      tokenResponse = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      console.log('LinkedIn Auth: Token received successfully');
    } catch (tokenError) {
      console.error('LinkedIn Auth: Token exchange failed:', tokenError.response?.data || tokenError.message);
      return res.status(400).json({ 
        message: 'LinkedIn token exchange failed', 
        details: tokenError.response?.data?.error_description || tokenError.message 
      });
    }

    const accessToken = tokenResponse.data.access_token;

    // Get user profile using OpenID userinfo endpoint (new LinkedIn API)
    console.log('LinkedIn Auth: Fetching user profile...');
    let profileResponse;
    try {
      profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      console.log('LinkedIn Auth: Profile received:', profileResponse.data);
    } catch (profileError) {
      console.error('LinkedIn Auth: Profile fetch failed:', profileError.response?.data || profileError.message);
      return res.status(400).json({ 
        message: 'Failed to get LinkedIn profile', 
        details: profileError.response?.data?.message || profileError.message 
      });
    }

    const { sub: linkedinId, email, name, picture, email_verified } = profileResponse.data;

    if (!email) {
      console.error('LinkedIn Auth: No email in profile');
      return res.status(400).json({ message: 'Could not get email from LinkedIn. Please ensure your LinkedIn account has a verified email.' });
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (user) {
      if (user.authProvider === 'local') {
        user.authProvider = 'linkedin';
        user.socialId = linkedinId;
        if (picture && !user.profile.profilePicture) {
          user.profile.profilePicture = picture;
        }
      }
      user.lastLogin = Date.now();
      await user.save();
    } else {
      user = await User.create({
        email,
        authProvider: 'linkedin',
        socialId: linkedinId,
        emailVerified: email_verified || true,
        profile: {
          name,
          profilePicture: picture
        },
        role: 'user'
      });
    }

    console.log('LinkedIn Auth: Success for user:', email);

    res.json({
      _id: user._id,
      name: user.profile?.name || email.split('@')[0],
      email: user.email,
      role: user.role,
      isEmailVerified: true,
      profile: user.profile,
      authProvider: user.authProvider,
      token: generateJwtToken(user._id, user.role),
    });

  } catch (error) {
    console.error('LinkedIn Auth Error:', error.response?.data || error.message || error);
    res.status(500).json({ message: 'LinkedIn authentication failed', details: error.message });
  }
};

module.exports = {
  googleAuth,
  linkedinAuth
};
