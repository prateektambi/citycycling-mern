import React, { useEffect } from 'react';

const Contact = () => {
  useEffect(() => {
    document.title = 'City Cycling | Contact';
  }, []);

  return (
    <div>
      <h1>Contact Us</h1>
      <p>This is the Contact Us page.</p>
    </div>
  );
};

export default Contact;
