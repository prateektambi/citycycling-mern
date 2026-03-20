import API from '../api/axiosConfig';

const userService = {
    getAll: async () => {
        const response = await API.get('/api/users');
        return response.data;
    },
    findByEmail: async (email) => {
        const response = await API.get(`/api/users/find/${email}`);
        return response.data;
    }
};

export { userService };
