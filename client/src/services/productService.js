import API from '../api/axiosConfig';

export const productService = {
    // Get all products
    getAll: async () => {
        const response = await API.get('/api/products');
        return response.data;
    },

    // Get single product by slug
    getBySlug: async (slug) => {
        const response = await API.get(`/api/products/${slug}`);
        return response.data;
    },

    // Get single product by ID
    getById: async (id) => {
        const response = await API.get(`/api/products/id/${id}`);
        return response.data;
    },

    // Create a product
    create: async (productData) => {
        const response = await API.post('/api/products', productData);
        return response.data;
    },

    // Update a product
    update: async (id, productData) => {
        const response = await API.put(`/api/products/${id}`, productData);
        return response.data;
    },

    // Delete a product
    delete: async (id) => {
        const response = await API.delete(`/api/products/${id}`);
        return response.data;
    }
};
