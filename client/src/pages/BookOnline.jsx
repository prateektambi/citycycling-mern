import React, { useEffect } from 'react';

const BookOnline = () => {
  useEffect(() => {
    document.title = 'City Cycling | Book Online';
  }, []);

  return (
    <div>
      <h1>Book Online</h1>
      <p>This is the Book Online page.</p>
    </div>
  );
};

export default BookOnline;
