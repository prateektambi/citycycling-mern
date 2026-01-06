import axios from 'axios';

// This logic automatically switches URLs
const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? 'https://citycycling.in' : 'http://localhost:5000'),
    headers: {
        'Content-Type': 'application/json'
    }
});

export default API;