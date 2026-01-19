import API from '../api/axiosConfig';

const authService = {
  login: async (email, password) => {
    const response = await API.post('/api/auth/login', { email, password });
    // Note: We return the data, but the AuthContext will handle the localStorage
    return response.data;
  },

  register: async (email, password) => {
    const response = await API.post('/api/auth/register', { email, password });
    return response.data;
  },

  // You can add more later, like:
  // updatePassword: (data) => API.put('/api/auth/update-password', data),
  // forgotPassword: (email) => API.post('/api/auth/forgot-password', { email }),
};

export default authService;