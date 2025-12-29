import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import HowItWorks from './pages/HowItWorks';
import LeaveRequest from './pages/LeaveRequest';
import Contact from './pages/Contact';
import Catalogue from './pages/Catalogue'; // Import Catalogue
import ProductPage from './pages/ProductPage'; // Import ProductPage
import './styles/App.css';

function App() {
  return (
    <div>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/leave-request" element={<LeaveRequest />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/catalogue" element={<Catalogue />} /> 
        <Route path="/product/:slug" element={<ProductPage />} />
      </Routes>
    </div>
  );
}

export default App;