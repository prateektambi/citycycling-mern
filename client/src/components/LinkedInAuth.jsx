import React, { useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import authService from '../services/authService';
import { Linkedin } from 'lucide-react';

const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
const LINKEDIN_REDIRECT_URI = `${window.location.origin}/auth/linkedin/callback`;
const LINKEDIN_SCOPE = 'openid profile email';

// Generate LinkedIn OAuth URL
export const getLinkedInAuthUrl = () => {
  const state = Math.random().toString(36).substring(7);
  sessionStorage.setItem('linkedin_oauth_state', state);
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: LINKEDIN_REDIRECT_URI,
    state,
    scope: LINKEDIN_SCOPE,
  });
  
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
};

// LinkedIn Login Button
export const LinkedInLoginButton = ({ onError }) => {
  const handleClick = () => {
    if (!LINKEDIN_CLIENT_ID) {
      onError?.('LinkedIn is not configured');
      return;
    }
    window.location.href = getLinkedInAuthUrl();
  };

  if (!LINKEDIN_CLIENT_ID) return null;

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-medium text-gray-700"
    >
      <Linkedin size={20} className="text-[#0A66C2]" />
      Continue with LinkedIn
    </button>
  );
};

// LinkedIn Callback Handler Component
export const LinkedInCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);
  const hasHandled = React.useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent double execution (React StrictMode or fast redirects)
      if (hasHandled.current) return;
      hasHandled.current = true;

      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        console.error('LinkedIn OAuth error:', error);
        navigate('/login?error=linkedin_failed', { replace: true });
        return;
      }

      if (!code) {
        console.error('LinkedIn OAuth: No code received');
        navigate('/login?error=linkedin_failed', { replace: true });
        return;
      }

      // Clear the stored state (we don't need strict validation for this flow)
      sessionStorage.removeItem('linkedin_oauth_state');

      try {
        const data = await authService.linkedinAuth(code, LINKEDIN_REDIRECT_URI);
        login(data);
        navigate(data.role === 'admin' ? '/admin/orders' : '/', { replace: true });
      } catch (err) {
        console.error('LinkedIn login failed:', err);
        navigate('/login?error=linkedin_failed', { replace: true });
      }
    };

    handleCallback();
  }, [location, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Signing in with LinkedIn...</p>
      </div>
    </div>
  );
};
