import React, { useState, useContext } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Menu, X, Bike, ShoppingCart, LogOut, PlusCircle } from 'lucide-react'; // Optional: Use lucide-react for icons

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const navItems = [
    { name: 'Active Orders', path: '/admin/orders', icon: <ShoppingCart size={20}/> },
    { name: 'New Order', path: '/admin/orders/new', icon: <PlusCircle size={20}/> },
    { name: 'Inventory', path: '/admin/inventory', icon: <Bike size={20}/> },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="font-bold text-lg">CityCycling Admin</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar (Mobile + Desktop) */}
      <aside className={`
        ${isMobileMenuOpen ? 'block' : 'hidden'} 
        md:block w-full md:w-64 bg-white shadow-lg z-20
      `}>
        <div className="p-6 hidden md:block border-b">
          <h1 className="text-2xl font-bold text-blue-600">CityCycling</h1>
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Management Portal</p>
        </div>

        <nav className="mt-4 px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isActive(item.path) 
                ? 'bg-blue-50 text-blue-600 font-semibold' 
                : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t bg-gray-50 hidden md:block">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
              {user?.email[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 p-2 rounded-md hover:bg-red-100 transition"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <Outlet /> {/* This is where your OrderList or ManageOrder will render */}
      </main>
    </div>
  );
};

export default AdminLayout;