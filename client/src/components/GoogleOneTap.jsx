import { useEffect, useContext } from 'react';
import { useGoogleOneTapLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const GoogleOneTap = () => {
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();

  useGoogleOneTapLogin({
    onSuccess: async (credentialResponse) => {
      try {
        const result = await authService.googleAuth(credentialResponse.credential);
        login(result);
        navigate('/');
      } catch (error) {
        console.error('Google login failed:', error);
      }
    },
    onError: () => {
      console.log('Google One Tap failed');
    },
    disabled: !!user, // Disable if user is already logged in
    cancel_on_tap_outside: true,
  });

  return null; // This component only handles the One Tap logic
};

export default GoogleOneTap;
