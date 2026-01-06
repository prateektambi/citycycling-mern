import API from '../api/axiosConfig';

export const orderService = {
    // Fetch all orders (with optional status filter)
    getAll: async (status) => {
        const response = await API.get('/api/orders', { 
            params: status ? { status } : {} 
        });
        return response.data;
    },

    // Get a single order by ID
    getById: async (id) => {
        const response = await API.get(`/api/orders/${id}`);
        return response.data;
    },

    // Create a new order
    create: async (orderData) => {
        const response = await API.post('/api/orders', orderData);
        return response.data;
    }
};