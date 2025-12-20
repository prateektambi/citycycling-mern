import React from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';
import '../styles/Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="logo-container">
        <img src={logo} alt="CityCycling logo" className="logo" />
      </div>
      <nav>
        <ul className="nav-menu">
          <li><NavLink to="/" className={({isActive}) => isActive ? "active" : ''}>Home</NavLink></li>
          <li><NavLink to="/how-it-works" className={({isActive}) => isActive ? "active" : ''}>How It Works</NavLink></li>
          <li><NavLink to="/book-online" className={({isActive}) => isActive ? "active" : ''}>Book Online</NavLink></li>
          <li><NavLink to="/leave-request" className={({isActive}) => isActive ? "active" : ''}>Leave a Rental Request</NavLink></li>
          <li><NavLink to="/contact" className={({isActive}) => isActive ? "active" : ''}>Contact Us</NavLink></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
