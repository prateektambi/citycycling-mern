import React, { useEffect } from 'react';

const LeaveRequest = () => {
  useEffect(() => {
    document.title = 'City Cycling | Leave Request';
  }, []);

  return (
    <div>
      <h1>Leave a Rental Request</h1>
      <p>This is the Leave a Rental Request page.</p>
    </div>
  );
};

export default LeaveRequest;
