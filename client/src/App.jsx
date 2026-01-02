import React from 'react';
import {BrowseRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import HowItWorks from './pages/HowItWorks';
import LeaveRequest from './pages/LeaveRequest';
import Contact from './pages/Contact';
import Catalogue from './pages/Catalogue'; // Import Catalogue
import ProductPage from './pages/ProductPage'; // Import ProductPage
import OrderList from './pages/Admin/OrderList';
import CreateOrder from './pages/Admin/CreateOrder';
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
        
       <Route path="/admin">
          {/* 1. Redirect /admin directly to the list */}
          <Route index element={<Navigate to="orders" replace />} />
          
          {/* 2. Admin Sub-routes */}
          <Route path="orders" element={<OrderList />} />
          <Route path="orders/new" element={<CreateOrder />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;