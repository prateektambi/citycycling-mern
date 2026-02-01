import API from '../api/axiosConfig';

const authService = {
  login: async (email, password) => {
    const response = await API.post('/api/auth/login', { email, password });
    return response.data;
  },

  register: async (name, email, password, phone) => {
    const response = await API.post('/api/auth/register', { 
      name, 
      email, 
      password,
      phone 
    });
    return response.data;
  },

  verifyEmail: async (token) => {
    const response = await API.get(`/api/auth/verify-email/${token}`);
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await API.post('/api/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, password) => {
    const response = await API.post(`/api/auth/reset-password/${token}`, { password });
    return response.data;
  },

  getProfile: async () => {
    const response = await API.get('/api/auth/profile');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await API.put('/api/auth/profile', profileData);
    return response.data;
  }
};

export default authService;