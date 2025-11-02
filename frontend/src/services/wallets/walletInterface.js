// Purpose: Defines the interface for all wallet implementations
// All wallet implementations should follow this structure

/**
 * @typedef {Object} WalletInterface
 * @property {function(AccountId, number): Promise<TransactionId|null>} transferHBAR
 * @property {function(AccountId, TokenId, number): Promise<TransactionId|null>} transferFungibleToken
 * @property {function(TokenId): Promise<TransactionId|null>} associateToken
 * @property {function(ContractId, string, any, number): Promise<TransactionId|null>} executeContractFunction
 * @property {function(): void} disconnect
 */

// This file serves as documentation for the wallet interface
// Actual implementations are in separate files (e.g., hashpackClient.jsx)
export {};
