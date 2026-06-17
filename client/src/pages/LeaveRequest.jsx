import React, { useEffect } from 'react';
import WhatsAppForm from '../components/WhatsAppForm';

const LeaveRequest = () => {
  useEffect(() => {
    document.title = 'City Cycling | Leave Request';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Bicycle Rental Request
          </h1>
          <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto">
            Provide your cycling preferences below, and we'll check bike availability for you.
          </p>
        </div>
        
        <WhatsAppForm 
          title="Rental Inquiry Form" 
          subtitle="Customize your requirements below to check cycle availability. We will reply to your request instantly on WhatsApp." 
        />
      </div>
    </div>
  );
};

export default LeaveRequest;

