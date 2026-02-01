import React, { useState, useEffect, useContext } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import logo from '../assets/logo.png';
import { Phone, MessageCircle, User, LogOut, LayoutDashboard } from 'lucide-react';
import '../styles/Header.css';

const Header = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowProfileMenu(false);
  };

  const renderContactLinks = (mobile) => (
    <div style={mobile ? { backgroundColor: '#f3f4f6', padding: '8px', textAlign: 'center', fontSize: '0.875rem', display: 'flex', justifyContent: 'center', gap: '24px', alignItems: 'center', borderBottom: '1px solid #e5e7eb' } : { display: 'flex', gap: '24px', alignItems: 'center' }}>
      <a href="tel:+918971552453" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: mobile ? '#374151' : '#ffffff', fontWeight: '500' }}>
        <Phone size={14} /> <span>+91 897155 2453</span>
      </a>
      <a href="https://wa.me/918971552453" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: mobile ? '#374151' : '#ffffff', fontWeight: '500' }}>
        <MessageCircle size={14} /> <span>WhatsApp Us</span>
      </a>
    </div>
  );

  return (
    <>
      <header className="header">
        <div className="logo-container" style={isMobile ? { marginRight: '20px' } : {}}>
          <NavLink to="/">
            <img src={logo} alt="CityCycling logo" className="logo" />
          </NavLink>
        </div>
        <nav>
          <ul className="nav-menu">
            <li><NavLink to="/catalogue" className={({isActive}) => isActive ? "active" : ''}>Book Online</NavLink></li>
            <li><NavLink to="/how-it-works" className={({isActive}) => isActive ? "active" : ''}>How It Works</NavLink></li>
            <li><NavLink to="/leave-request" className={({isActive}) => isActive ? "active" : ''}>Leave a Request</NavLink></li>
          </ul>
        </nav>
        
        {/* Right Side: Contact + Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {!isMobile && renderContactLinks(false)}
          
          {/* Auth Section */}
          <div className="auth-section">
            {user ? (
              <div className="relative group">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 hover:bg-blue-700/50 text-white px-2 py-1.5 rounded-lg transition-colors border border-transparent hover:border-blue-400/30"
                >
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold border border-white/20">
                    {user.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
                  </div>
                  <span className="hidden md:inline text-sm font-medium pr-1">
                    {user.name && user.name.split(' ')[0]}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10 cursor-default" 
                      onClick={() => setShowProfileMenu(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 z-20 overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">
                      <div className="px-4 py-2 border-b border-gray-100 mb-1">
                        <p className="text-xs text-gray-500">Signed in as</p>
                        <p className="text-sm font-bold text-gray-800 truncate">{user.email}</p>
                      </div>
                      
                      {user.role === 'admin' && (
                        <Link 
                          to="/admin/orders" 
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                        >
                          <LayoutDashboard size={16} /> Admin Dashboard
                        </Link>
                      )}
                      
                      {user.role !== 'admin' && (
                        <Link 
                          to="/profile" 
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                        >
                          <User size={16} /> My Profile
                        </Link>
                      )}
                      
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left mt-1"
                      >
                        <LogOut size={16} /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link 
                to="/login"
                className="border border-blue-400/50 text-white hover:bg-blue-700 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors"
                style={{ backdropFilter: 'blur(4px)' }}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>
      {isMobile && renderContactLinks(true)}
    </>
  );
};

export default Header;
