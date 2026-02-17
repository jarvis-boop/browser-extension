/**
 * Portal Host - Background service handler using viem-portal
 *
 * Handles incoming RPC requests from inpage/popup and routes them
 * to the appropriate handlers.
 */

import { type Address, isHex, recoverMessageAddress } from 'viem';
import { type PortalHost, type MethodHandlers, createHost } from 'viem-portal';
import { createTabTransport } from 'viem-portal';

export const ErrorCodes = {
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  CHAIN_NOT_SUPPORTED: 4902,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  RATE_LIMITED: -32005,
} as const;

export interface PortalHostConfig {
  getActiveSession: (host: string) => { address: Address; chainId: number } | null;
  removeSession: (host: string) => void;
  updateSessionChain: (host: string, chainId: number) => void;
  isSupportedChain: (chainId: number) => boolean;
  getChainRpcUrl: (chainId: number) => string | undefined;
  requestApproval: (request: {
    method: string;
    params?: unknown[];
    host: string;
    tabId?: number;
  }) => Promise<unknown>;
  // Using unknown for provider to allow different provider types
  getProvider: (chainId?: number) => unknown;
}

/**
 * Minimal schema for provider RPC
 */
export type ProviderSchema = {
  eth_request: { params: [method: string, params?: unknown[]]; result: unknown };
  getActiveSession: { params: [host: string]; result: { address: Address; chainId: number } | null };
  chainChanged: { params: [chainId: number]; result: void };
  accountsChanged: { params: [accounts: Address[]]; result: void };
  disconnect: { params: []; result: void };
  connect: { params: [info: { chainId: string }]; result: void };
  ethereumChainEvent: { params: [event: unknown]; result: void };
  prefetchDappMetadata: { params: [url: string]; result: void };
  wallet_action: { params: [action: string, payload: unknown]; result: unknown };
};

export function createPortalHost(config: PortalHostConfig): PortalHost<ProviderSchema> {
  const transport = createTabTransport();

  const handlers: MethodHandlers<ProviderSchema> = {
    eth_request: async ([method, params]) => {
      const requestHost = '';
      const session = config.getActiveSession(requestHost);

      switch (method) {
        case 'eth_chainId':
          return session ? `0x${session.chainId.toString(16)}` : '0x1';

        case 'eth_accounts':
          return session ? [session.address.toLowerCase() as Address] : [];

        case 'eth_coinbase':
          return session?.address?.toLowerCase() || null;

        case 'eth_requestAccounts':
          if (session) {
            return [session.address.toLowerCase() as Address];
          }
          return config.requestApproval({ method, params, host: requestHost });

        case 'eth_blockNumber':
        case 'eth_getBalance':
        case 'eth_getTransactionByHash':
        case 'eth_call':
        case 'eth_estimateGas':
        case 'eth_gasPrice':
        case 'eth_getCode':
        case 'eth_getLogs': {
          const provider = config.getProvider(session?.chainId) as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
          return provider.request({ method, params: params || [] });
        }

        case 'eth_sendTransaction':
        case 'eth_signTransaction':
        case 'personal_sign':
        case 'eth_signTypedData':
        case 'eth_signTypedData_v3':
        case 'eth_signTypedData_v4':
          return config.requestApproval({ method, params, host: requestHost });

        case 'wallet_switchEthereumChain': {
          const [{ chainId }] = params as [{ chainId: string }];
          const targetChainId = parseInt(chainId, 16);

          if (session?.chainId === targetChainId) {
            return null;
          }

          if (!config.isSupportedChain(targetChainId)) {
            throw { code: ErrorCodes.CHAIN_NOT_SUPPORTED, message: 'Chain not supported' };
          }

          config.updateSessionChain(requestHost, targetChainId);
          return null;
        }

        case 'wallet_addEthereumChain':
          return config.requestApproval({ method, params, host: requestHost });

        case 'wallet_watchAsset':
          return config.requestApproval({ method, params, host: requestHost });

        case 'personal_ecRecover': {
          const [message, signature] = params as [string, string];
          if (!message || !signature || !isHex(signature)) {
            throw { code: ErrorCodes.INVALID_PARAMS, message: 'Invalid params' };
          }
          return recoverMessageAddress({ message, signature });
        }

        case 'wallet_revokePermissions':
          config.removeSession(requestHost);
          return null;

        default: {
          const provider = config.getProvider(session?.chainId) as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
          return provider.request({ method, params: params || [] });
        }
      }
    },

    getActiveSession: async ([host]) => config.getActiveSession(host),
    chainChanged: async () => {},
    accountsChanged: async () => {},
    disconnect: async () => {},
    connect: async () => {},
    ethereumChainEvent: async () => {},
    prefetchDappMetadata: async () => {},
    wallet_action: async () => {
      throw { code: ErrorCodes.UNSUPPORTED_METHOD, message: 'Not implemented' };
    },
  };

  return createHost(transport, { handlers });
}
