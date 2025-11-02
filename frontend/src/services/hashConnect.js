import { HashConnect } from "hashconnect";
import { LedgerId } from "@hashgraph/sdk";

const env = "testnet";
const appMetadata = {
    name: "ComicPad",
    description: "ComicPad - Decentralized Comic Publishing Platform",
    icons: [typeof window !== 'undefined' ? window.location.origin + "/logo.png" : "/logo.png"],
    url: typeof window !== 'undefined' ? window.location.origin : "http://localhost:5173",
};

// Initialize HashConnect only on client side
let hc = null;
let hcInitPromise = null;

// Initialize HashConnect
if (typeof window !== 'undefined') {
    hc = new HashConnect(
        LedgerId.fromString(env),
        "bfa190dbe93fcf30377b932b31129d05", // projectId
        appMetadata,
        true
    );

    console.log("HashConnect instance created:", hc);
    hcInitPromise = hc.init();
}

export const getHashConnectInstance = () => {
    if (!hc) {
        throw new Error("HashConnect not initialized. Make sure this is called on the client side.");
    }
    return hc;
};

export const getConnectedAccountIds = () => {
    const instance = getHashConnectInstance();
    return instance.connectedAccountIds;
};

export const getInitPromise = () => {
    if (!hcInitPromise) {
        throw new Error("HashConnect not initialized. Make sure this is called on the client side.");
    }
    return hcInitPromise;
};

export { hc, hcInitPromise };
