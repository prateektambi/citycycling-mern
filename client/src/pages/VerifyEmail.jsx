import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import authService from '../services/authService';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

const VerifyEmail = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    const verify = async () => {
      try {
        await authService.verifyEmail(token);
        setStatus('success');
        setMessage('Email verified successfully! You can now log in.');
      } catch (err) {
        console.error(err);
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The link may be invalid or expired.');
      }
    };

    if (token) {
      verify();
    } else {
      setStatus('error');
      setMessage('Invalid verification link.');
    }
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 md:p-12 text-center animate-in fade-in zoom-in duration-300">
        
        {/* Loading State */}
        {status === 'verifying' && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <Loader className="text-blue-600 animate-spin" size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Verifying...</h2>
            <p className="text-gray-500">{message}</p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="text-green-600" size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Verified!</h2>
            <p className="text-gray-500 mb-8">{message}</p>
            <Link 
              to="/login" 
              className="block w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
            >
              Go to Login
            </Link>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <XCircle className="text-red-600" size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-500 mb-8">{message}</p>
            <Link 
              to="/register" 
              className="text-blue-600 font-bold hover:underline"
            >
              Back to Registration
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};

export default VerifyEmail;
