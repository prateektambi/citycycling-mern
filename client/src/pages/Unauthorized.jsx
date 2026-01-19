import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-10 rounded-xl shadow-lg">
        <div className="flex justify-center">
          <div className="bg-red-100 p-4 rounded-full">
            <ShieldAlert size={48} className="text-red-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-extrabold text-gray-900">Access Denied</h1>
        
        <p className="text-gray-600">
          Oops! You don't have the admin privileges required to view this section of CityCycling.
        </p>

        <div className="pt-4">
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-semibold"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;