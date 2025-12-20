import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import HowItWorks from './pages/HowItWorks';
import BookOnline from './pages/BookOnline';
import LeaveRequest from './pages/LeaveRequest';
import Contact from './pages/Contact';
import './styles/App.css';

function App() {
  return (
    <div>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/book-online" element={<BookOnline />} />
        <Route path="/leave-request" element={<LeaveRequest />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </div>
  );
}

export default App;