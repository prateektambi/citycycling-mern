import API from '../api/axiosConfig';

const userService = {
    getAll: async () => {
        const response = await API.get('/api/users');
        return response.data;
    }
};

export { userService };
