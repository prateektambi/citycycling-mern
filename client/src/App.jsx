import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import HowItWorks from './pages/HowItWorks';
import LeaveRequest from './pages/LeaveRequest';
import Contact from './pages/Contact';
import Catalogue from './pages/Catalogue';
import BlogList from './pages/Blog/BlogList';
import BlogPost from './pages/Blog/BlogPost';
import ProductPage from './pages/ProductPage';
import OrderList from './pages/Admin/OrderList';
import CreateOrder from './pages/Admin/CreateOrder';
import ManageOrder from './pages/Admin/ManageOrder';
import ItemList from './pages/Admin/ItemList';
import ManageItem from './pages/Admin/ManageItem';
import ProductList from './pages/Admin/ProductList';
import ManageProduct from './pages/Admin/ManageProduct';
import OrderReceipt from './pages/Admin/OrderReceipt';
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserList from './pages/Admin/UserList';
import QuotationGenerator from './pages/Admin/QuotationGenerator';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import UserProfile from './pages/UserProfile';
import MyOrders from './pages/MyOrders';
import CartPage from './pages/CartPage';
import AdminProtectedRoute from './components/AdminProtectedRoutes';
import Analytics from './components/Analytics';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import Unauthorized from './pages/Unauthorized';
import ScrollToTop from './components/ScrollToTop';
import Footer from './components/Footer';
import GoogleOneTap from './components/GoogleOneTap';
import { LinkedInCallback } from './components/LinkedInAuth';
import './styles/App.css';

function App() {
  const location = useLocation();
  const isReceiptPage = location.pathname.includes('/receipt');

  return (
    <div className="flex flex-col min-h-screen">
      <ScrollToTop />
      <Analytics />
      <GoogleOneTap />
      {!isReceiptPage && <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/leave-request" element={<LeaveRequest />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/catalogue" element={<Catalogue />} /> 
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/product/:slug" element={<ProductPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
        
        {/* Protected User Routes */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/my-orders" 
          element={
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/cart" 
          element={
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          } 
        />

        {/* Protected Shared Route WITHOUT Layout (For Print/Screenshots) */}
        <Route 
          path="/orders/:id/receipt" 
          element={
            <ProtectedRoute>
              <OrderReceipt />
            </ProtectedRoute>
          } 
        />
        
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <AdminProtectedRoute>
              <AdminLayout /> 
            </AdminProtectedRoute>
          }
        >
          {/* 1. Redirect /admin directly to the dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />
          
          {/* 2. Admin Sub-routes */}
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="orders" element={<OrderList />} />
          <Route path="orders/new" element={<CreateOrder />} />
          <Route path="orders/:id" element={<ManageOrder />} />
          <Route path="users" element={<UserList />} />
          <Route path="quotations" element={<QuotationGenerator />} />
          
          {/* Item Routes */}
          <Route path="items" element={<ItemList />} />
          <Route path="items/new" element={<ManageItem />} />
          <Route path="items/:id" element={<ManageItem />} />

          {/* Product Routes */}
          <Route path="products" element={<ProductList />} />
          <Route path="products/new" element={<ManageProduct />} />
          <Route path="products/:id" element={<ManageProduct />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
      {!isReceiptPage && <Footer />}
    </div>
  );
}

export default App;