import { createContext, useContext, useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { HashConnect } from 'hashconnect';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const [connecting, setConnecting] = useState(false);
  const [wallet, setWallet] = useState(null);
  const hashconnectRef = useRef(null);
  const [pairingData, setPairingData] = useState(null);

  // Initialize HashConnect
  useEffect(() => {
    const initHashConnect = async () => {
      try {
        const hashconnect = new HashConnect();
        hashconnectRef.current = hashconnect;

        // Set up event listeners
        hashconnect.pairingEvent.on((data) => {
          console.log('Pairing event:', data);
          setPairingData(data);
        });

        hashconnect.disconnectionEvent.on(() => {
          console.log('Disconnected from wallet');
          setWallet(null);
          localStorage.removeItem('wallet');
          setPairingData(null);
          toast.info('Wallet disconnected');
        });

        hashconnect.connectionStatusChangeEvent.on((state) => {
          console.log('Connection status changed:', state);
        });

        // Initialize connection
        const appMetadata = {
          name: "ComicPad",
          description: "Decentralized Comic Platform for Hedera",
          icon: window.location.origin + "/logo.png",
          url: window.location.origin
        };

        await hashconnect.init(appMetadata, 'testnet', false);
        console.log('HashConnect initialized');

        // Check for existing pairing
        const savedPairingData = localStorage.getItem('hashconnect_pairing');
        if (savedPairingData) {
          try {
            const parsed = JSON.parse(savedPairingData);
            setPairingData(parsed);

            const savedWallet = localStorage.getItem('wallet');
            if (savedWallet) {
              setWallet(JSON.parse(savedWallet));
            }
          } catch (error) {
            console.error('Failed to restore pairing:', error);
            localStorage.removeItem('hashconnect_pairing');
          }
        }
      } catch (error) {
        console.error('Failed to initialize HashConnect:', error);
      }
    };

    initHashConnect();

    return () => {
      // Cleanup if needed
    };
  }, []);

  const connectWallet = async () => {
    setConnecting(true);
    try {
      const hashconnect = hashconnectRef.current;

      if (!hashconnect) {
        toast.error('HashConnect not initialized. Please refresh the page.');
        throw new Error('HashConnect not initialized');
      }

      console.log('Connecting to HashPack...');

      // Connect to extension
      await hashconnect.connectToLocalWallet();

      // Wait for pairing event
      const waitForPairing = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 60000); // 60 second timeout

        const handler = (data) => {
          clearTimeout(timeout);
          hashconnect.pairingEvent.off(handler);
          resolve(data);
        };

        hashconnect.pairingEvent.on(handler);
      });

      const pairing = await waitForPairing;
      console.log('Pairing successful:', pairing);

      if (!pairing || !pairing.accountIds || pairing.accountIds.length === 0) {
        throw new Error('No accounts found in wallet');
      }

      const accountId = pairing.accountIds[0];
      const network = pairing.network || 'testnet';

      const walletData = {
        accountId,
        network,
        topic: pairing.topic,
        connected: true,
        connectedAt: new Date().toISOString()
      };

      setWallet(walletData);
      localStorage.setItem('wallet', JSON.stringify(walletData));
      localStorage.setItem('hashconnect_pairing', JSON.stringify(pairing));

      toast.success(`Connected to ${accountId}`);
      return walletData;
    } catch (error) {
      console.error('Failed to connect wallet:', error);

      if (error.message?.includes('timeout')) {
        toast.error('Connection timeout. Please make sure HashPack extension is unlocked.');
      } else if (error.message?.includes('rejected') || error.message?.includes('denied')) {
        toast.error('Connection rejected by user');
      } else if (error.message?.includes('No accounts')) {
        toast.error('No accounts found. Please create an account in HashPack first.');
      } else if (error.message?.includes('not initialized')) {
        // Already showed toast
      } else {
        toast.error('Failed to connect wallet. Please ensure HashPack is installed and unlocked.');
      }
      setWallet(null);
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      const hashconnect = hashconnectRef.current;

      if (hashconnect && pairingData?.topic) {
        await hashconnect.disconnect(pairingData.topic);
      }

      setWallet(null);
      setPairingData(null);
      localStorage.removeItem('wallet');
      localStorage.removeItem('hashconnect_pairing');
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      toast.error('Failed to disconnect wallet');
      throw error;
    }
  };

  const value = {
    wallet,
    isConnected: !!wallet?.connected,
    connecting,
    connectWallet,
    disconnectWallet,
    hashconnect: hashconnectRef.current
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};