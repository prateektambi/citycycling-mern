import React, { useEffect } from 'react';
import '../styles/HomePage.css';
import HomePageHeroImage from '../assets/HomePageHeroImage.png';

const HomePage = () => {
  useEffect(() => {
    document.title = 'City Cycling | Home';
  }, []);

  return (
   <div className="home-page">
      
      {/* 1. Full-Width Hero Image Section (Hero Section) */}
      <section className="hero-section">
        <div className="hero-overlay">
          <h1>Explore the City on Two Wheels!</h1>
          <p>Your ultimate source for reliable, affordable cycle rentals.</p>
        </div>
        {/*  */}
        <img 
          src={HomePageHeroImage} 
          alt="Full width image of a cyclist on a scenic road" 
          className="hero-image"
        />
      </section>

      {/* 2. Main Content Section */}
      <main className="main-content">
        <section className="welcome-message">
          <h2>Welcome to CityCycling</h2>
          <p>Whether you need a bike for a quick commute or a full weekend adventure, we have a fleet of well-maintained cycles ready for you. Fast booking, flexible returns, and unbeatable prices.</p>
        </section>
      </main>

      {/* 3. Contact Information (Footer/Contact Block) */}
      <footer className="contact-info-block">
        <div className="contact-details">
          <h3>Contact Us</h3>
          <p>
            <b>Address: Mayfair Anthem, Marathalli-Bellendur-Outer Ring Road, Bangalore, 560103 </b>
            <br />
            Landmark: <b>Behind Embassay Tech Village (Wells Fargo, Flipkart)</b>
            <br />
            Google map link: <a href="https://www.google.com/maps/place/City+Cycling/@12.9269647,77.6923447,17z/data=!3m1!4b1!4m6!3m5!1s0x3bae115d433791f5:0x7829065807a6c8dd!8m2!3d12.9269595!4d77.6949196!16s%2Fg%2F11bbt8bw53?entry=ttu&g_ep=EgoyMDI1MTIwMi4wIKXMDSoASAFQAw%3D%3D"> 
            City Cycling </a>
          </p>
          <p>
            Phone: <a href="tel:+918971552453">+91-8971552453</a>
          </p>
          <p>
            Email: <a href="mailto:citycycling.in@gmail.com">citycycling.in@gmail.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
