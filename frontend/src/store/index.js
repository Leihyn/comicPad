import { configureStore } from '@reduxjs/toolkit';
import hashconnectReducer from './hashConnectSlice';

export const store = configureStore({
  reducer: {
    hashconnect: hashconnectReducer,
  },
});

export default store;
