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
    },

    // Update an existing order
    update: async (id, orderData) => {
        const response = await API.put(`/api/orders/${id}`, orderData);
        return response.data;
    },

    // Cancel an order
    cancel: async (id) => {
        const response = await API.delete(`/api/orders/${id}`);
        return response.data;
    },

    // Change Order State
    changeState: async (id, newState, performedBy) => {
        const response = await API.patch(`/api/orders/${id}/state`, { newState, performedBy });
        return response.data;
    },

    // Manage Tags (Add/Remove)
    manageTag: async (id, action, tag, performedBy) => {
        const response = await API.patch(`/api/orders/${id}/tags`, { action, tag, performedBy });
        return response.data;
    },

    // Get WhatsApp Link
    getWhatsAppLink: async (id, template) => {
        const response = await API.post(`/api/orders/${id}/whatsapp`, { template });
        return response.data;
    },

    // Send Quotation Email
    sendQuotationEmail: async (quotationData) => {
        const response = await API.post('/api/orders/quotation/email', quotationData);
        return response.data;
    }
};