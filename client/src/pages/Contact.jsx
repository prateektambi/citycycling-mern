import React, { useEffect } from 'react';
import WhatsAppForm from '../components/WhatsAppForm';

const Contact = () => {
  useEffect(() => {
    document.title = 'City Cycling | Contact';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Get in Touch
          </h1>
          <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto">
            Have questions or specific requirements? Reach out to us directly via WhatsApp.
          </p>
        </div>
        
        <WhatsAppForm 
          title="Contact City Cycling" 
          subtitle="Let us know what you need or ask any questions, and we will get back to you immediately on WhatsApp." 
        />
      </div>
    </div>
  );
};

export default Contact;

