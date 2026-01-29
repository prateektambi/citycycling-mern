import React, { useState, useContext } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Menu, X, Bike, ShoppingCart, LogOut, PlusCircle, Package } from 'lucide-react'; // Optional: Use lucide-react for icons

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const navItems = [
    { name: 'Active Orders', path: '/admin/orders', icon: <ShoppingCart size={20}/> },
    { name: 'New Order', path: '/admin/orders/new', icon: <PlusCircle size={20}/> },
    { name: 'Fleet/Catalogue', path: '/admin/products', icon: <Bike size={20}/> },
    { name: 'Physical Stock', path: '/admin/items', icon: <Package size={20}/> },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-blue-600 text-white p-4 flex justify-between items-center shadow-md sticky top-0 z-50">
        <h1 className="font-bold text-lg">CityCycling Admin</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Mobile + Desktop) */}
      <aside className={`
        ${isMobileMenuOpen ? 'block' : 'hidden'} 
        md:block w-64 bg-white shadow-lg flex flex-col 
        fixed md:relative top-0 left-0 bottom-0 md:h-screen md:sticky md:top-0 z-50 md:z-20
        overflow-hidden
      `}>
        <div className="p-6 hidden md:block border-b">
          <h1 className="text-2xl font-bold text-blue-600">CityCycling</h1>
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Management Portal</p>
        </div>

        <nav className="mt-4 px-4 space-y-2 flex-1 overflow-y-auto">
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

        <div className="p-4 border-t bg-gray-50 flex-shrink-0">
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
            onClick={() => {
              logout();
              setIsMobileMenuOpen(false);
            }}
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