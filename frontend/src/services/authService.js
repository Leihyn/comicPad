import api from './api';

const authService = {
  register: async (username, email, password) => {
    const response = await api.post('/auth/register', {
      username,
      email,
      password
    });
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password
    });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data.user;
  },

  updateProfile: async (data) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  connectWallet: async (accountId, publicKey) => {
    const response = await api.post('/auth/connect-wallet', {
      accountId,
      publicKey
    });
    return response.data;
  },

  disconnectWallet: async () => {
    const response = await api.post('/auth/disconnect-wallet');
    return response.data;
  },

  requestCreator: async (bio) => {
    const response = await api.post('/auth/request-creator', { bio });
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  }
};

export default authService;