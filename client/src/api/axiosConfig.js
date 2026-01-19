import axios from 'axios';

// This logic automatically switches URLs
const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? 'https://citycycling.in' : 'http://localhost:5000'),
    headers: {
        'Content-Type': 'application/json'
    }
    
});

// This "Interceptor" attaches the token automatically to every request
API.interceptors.request.use((config) => {
  const savedUser = localStorage.getItem('cityCyclingUser');
  if (savedUser) {
    const { token } = JSON.parse(savedUser);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;