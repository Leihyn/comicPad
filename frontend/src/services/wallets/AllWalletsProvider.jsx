import { WalletConnectContextProvider } from "../../contexts/WalletConnectContext";
import { HashPackClient } from "./hashpackClient";

// Purpose: Wrapper component that provides all wallet functionality
// Simplified to HashPack-only for ComicPad
export const AllWalletsProvider = (props) => {
  return (
    <WalletConnectContextProvider>
      <HashPackClient />
      {props.children}
    </WalletConnectContextProvider>
  );
};
