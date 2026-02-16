/**
 * Portal Schema - defines the typed RPC interface between
 * inpage ↔ content script ↔ background
 */

import type { Address, Hex } from 'viem';
import type { PortalSchema } from 'viem-portal';

/**
 * Provider request payload
 */
export interface ProviderRequestParams {
  method: string;
  params?: unknown[];
}

/**
 * Provider response
 */
export interface ProviderResponse {
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Active session info
 */
export interface ActiveSession {
  address: Address;
  chainId: number;
}

/**
 * Chain event notification
 */
export interface ChainEvent {
  chainId: number;
  chainName?: string;
  status: string;
  extensionUrl: string;
  host: string;
}

/**
 * Wallet action parameters
 */
export interface WalletActionParams {
  action: string;
  payload: unknown;
}

/**
 * Provider Portal Schema
 * Defines all methods available between inpage and background
 */
export type ProviderPortalSchema = PortalSchema & {
  // Core provider request (JSON-RPC passthrough)
  eth_request: {
    params: [method: string, params?: unknown[]];
    result: unknown;
  };

  // Session management
  getActiveSession: {
    params: [host: string];
    result: ActiveSession | null;
  };

  // Chain events (push from background to inpage)
  chainChanged: {
    params: [chainId: number];
    result: void;
  };

  accountsChanged: {
    params: [accounts: Address[]];
    result: void;
  };

  disconnect: {
    params: [];
    result: void;
  };

  connect: {
    params: [info: { chainId: Hex }];
    result: void;
  };

  // Notifications
  ethereumChainEvent: {
    params: [event: ChainEvent];
    result: void;
  };

  // Dapp metadata
  prefetchDappMetadata: {
    params: [url: string];
    result: void;
  };

  // Wallet actions (internal, popup ↔ background)
  wallet_action: {
    params: [action: string, payload: unknown];
    result: unknown;
  };
};

/**
 * Background-only methods (popup ↔ background)
 */
export type BackgroundPortalSchema = PortalSchema & {
  // Wallet operations
  wallet_accounts: { params: []; result: Address[] };
  wallet_sign: { params: [address: Address, message: string]; result: Hex };
  wallet_sendTransaction: {
    params: [tx: Record<string, unknown>];
    result: Hex;
  };
  wallet_lock: { params: []; result: void };
  wallet_unlock: { params: [password: string]; result: boolean };
};
