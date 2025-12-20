import React, { useEffect } from 'react';

const HowItWorks = () => {
  useEffect(() => {
    document.title = 'City Cycling | How It Works';
  }, []);

  return (
    <div>
      <h1>How It Works</h1>
      <p>This is the How It Works page.</p>
    </div>
  );
};

export default HowItWorks;
