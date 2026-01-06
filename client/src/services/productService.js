import API from '../api/axiosConfig';

export const productService = {
    // Get all products (used in CreateOrder)
    getAll: async () => {
        const response = await API.get('/api/products');
        return response.data;
    },

    // Get single product by slug (used in ProductPage)
    getBySlug: async (slug) => {
        const response = await API.get(`/api/products/${slug}`);
        return response.data;
    }
};
