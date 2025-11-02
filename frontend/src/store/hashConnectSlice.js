import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isConnected: false,
  accountId: null,
  isLoading: false,
};

const hashconnectSlice = createSlice({
  name: 'hashconnect',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setConnected: (state, action) => {
      state.isConnected = true;
      state.accountId = action.payload.accountId;
      state.isLoading = false;
    },
    setDisconnected: (state) => {
      state.isConnected = false;
      state.accountId = null;
      state.isLoading = false;
    },
  },
});

export const { setLoading, setConnected, setDisconnected } = hashconnectSlice.actions;
export default hashconnectSlice.reducer;
