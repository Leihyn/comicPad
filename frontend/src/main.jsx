import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { AllWalletsProvider } from './services/wallets/AllWalletsProvider';
import { Toaster } from 'react-hot-toast';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AllWalletsProvider>
          <App />
          <Toaster position="top-right" />
        </AllWalletsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);