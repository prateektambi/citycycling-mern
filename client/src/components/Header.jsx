import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';
import { Phone, MessageCircle } from 'lucide-react';
import '../styles/Header.css';

const Header = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
            <li><NavLink to="/leave-request" className={({isActive}) => isActive ? "active" : ''}>Leave a Rental Request</NavLink></li>
          </ul>
        </nav>
        {!isMobile && renderContactLinks(false)}
      </header>
      {isMobile && renderContactLinks(true)}
    </>
  );
};

export default Header;
