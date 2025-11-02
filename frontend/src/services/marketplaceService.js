import api from './api';

const marketplaceService = {
  getListings: async (params = {}) => {
    const response = await api.get('/marketplace/listings', { params });
    return response.data?.listings || response.data?.data?.listings || [];
  },

  getListingById: async (id) => {
    const response = await api.get(`/marketplace/listings/${id}`);
    return response.data;
  },

  createListing: async (data) => {
    const response = await api.post('/marketplace/listings', data);
    return response.data;
  },

  buyNFT: async (listingId, transactionData) => {
    const response = await api.post(`/marketplace/listings/${listingId}/buy`, transactionData);
    return response.data;
  },

  placeBid: async (listingId, amount) => {
    const response = await api.post(`/marketplace/listings/${listingId}/bid`, {
      amount
    });
    return response.data;
  },

  cancelListing: async (listingId) => {
    const response = await api.delete(`/marketplace/listings/${listingId}`);
    return response.data;
  },

  makeOffer: async (data) => {
    const response = await api.post('/marketplace/offers', data);
    return response.data;
  },

  respondToOffer: async (offerId, action) => {
    const response = await api.put(`/marketplace/offers/${offerId}`, {
      action
    });
    return response.data;
  },

  cancelListing: async (listingId) => {
    const response = await api.delete(`/marketplace/listings/${listingId}`);
    return response.data;
  }
};

export default marketplaceService;