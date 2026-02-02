import { useEffect } from 'react';
import ReactGA from 'react-ga4';
import { useLocation } from 'react-router-dom';

const Analytics = () => {
  const location = useLocation();
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  useEffect(() => {
    // Only initialize if ID exists (production)
    if (measurementId) {
      if (!window.gaInitialized) {
        ReactGA.initialize(measurementId);
        window.gaInitialized = true;
      }
    }
  }, [measurementId]);

  useEffect(() => {
    // Track page views on route change
    if (measurementId && window.gaInitialized) {
      ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
    }
  }, [location, measurementId]);

  return null; // This component handles side-effects only
};

export default Analytics;
