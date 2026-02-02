import { useEffect, useContext } from 'react';
import ReactGA from 'react-ga4';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Analytics = () => {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    // Don't initialize if admin
    if (isAdmin) return;

    // Only initialize if ID exists (production)
    if (measurementId) {
      if (!window.gaInitialized) {
        ReactGA.initialize(measurementId);
        window.gaInitialized = true;
      }
    }
  }, [measurementId, isAdmin]);

  useEffect(() => {
    // Don't track if admin
    if (isAdmin) return;

    // Track page views on route change
    if (measurementId && window.gaInitialized) {
      ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
    }
  }, [location, measurementId, isAdmin]);

  return null; // This component handles side-effects only
};

export default Analytics;
