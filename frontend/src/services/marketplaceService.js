import api from './api';

const marketplaceService = {
  getListings: async (params = {}) => {
    const response = await api.get('/marketplace/listings', { params });
    // Backend can return two formats:
    // 1. Enhanced: {success: true, data: [...]} - array directly
    // 2. Old: {success: true, data: {listings: [...], totalPages, currentPage, total}}
    // After axios interceptor unwraps response.data

    let listings = [];
    if (Array.isArray(response?.data)) {
      // Enhanced format - array directly
      listings = response.data;
    } else if (Array.isArray(response?.data?.listings)) {
      // Old format - nested in listings property
      listings = response.data.listings;
    } else if (Array.isArray(response?.listings)) {
      // Fallback
      listings = response.listings;
    }

    console.log('📦 Raw response from api.get:', response);
    console.log('📦 Extracted listings:', listings);
    console.log('📦 Is array?', Array.isArray(listings));
    return listings;
  },

  getListingById: async (id) => {
    const response = await api.get(`/marketplace/listings/${id}`);
    return response.data;
  },

  createListing: async (data) => {
    const response = await api.post('/marketplace/listings', data);
    return response.data;
  },

  buyNFT: async (listingId) => {
    // Backend will handle the transfer using operator signature
    const response = await api.post(`/marketplace/listings/${listingId}/buy`);
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