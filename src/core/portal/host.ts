/**
 * Portal Host - Background service handler using viem-portal
 *
 * Handles incoming RPC requests from inpage/popup and routes them
 * to the appropriate handlers.
 */

import { type Address, isHex, recoverMessageAddress } from 'viem';
import { type MethodHandlers, type PortalHost, createHost } from 'viem-portal';

import type { ProviderPortalSchema } from './schema';
import { createTabTransport } from './transports';

/**
 * Error codes (EIP-1193 / JSON-RPC)
 */
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

/**
 * Configuration for the portal host
 */
export interface PortalHostConfig {
  // Session management
  getActiveSession: (
    host: string,
  ) => { address: Address; chainId: number } | null;
  removeSession: (host: string) => void;
  updateSessionChain: (host: string, chainId: number) => void;

  // Chain support
  isSupportedChain: (chainId: number) => boolean;
  getChainRpcUrl: (chainId: number) => string | undefined;

  // User approval
  requestApproval: (request: {
    method: string;
    params?: unknown[];
    host: string;
    tabId?: number;
  }) => Promise<unknown>;

  // Provider for chain queries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getProvider: (chainId?: number) => any;
}

/**
 * Create the portal host for background script
 */
export function createPortalHost(
  config: PortalHostConfig,
): PortalHost<ProviderPortalSchema> {
  const transport = createTabTransport();

  // Type assertion needed because handler return types are complex
  const handlers: MethodHandlers<ProviderPortalSchema> = {
    // Main eth_request handler - routes all provider requests
    eth_request: async ([method, params]: [string, unknown[]?]) => {
      // TODO: Get host from request context when available
      const requestHost = '';
      const session = config.getActiveSession(requestHost);

      switch (method) {
        case 'eth_chainId':
          return session ? `0x${session.chainId.toString(16)}` : '0x1';

        case 'eth_accounts':
          return session ? [session.address.toLowerCase()] : [];

        case 'eth_coinbase':
          return session?.address?.toLowerCase() || null;

        case 'eth_requestAccounts':
          if (session) {
            return [session.address.toLowerCase()];
          }
          // Need user approval
          return config.requestApproval({ method, params, host: requestHost });

        case 'eth_blockNumber':
        case 'eth_getBalance':
        case 'eth_getTransactionByHash':
        case 'eth_call':
        case 'eth_estimateGas':
        case 'eth_gasPrice':
        case 'eth_getCode':
        case 'eth_getLogs': {
          const provider = config.getProvider(session?.chainId);
          return provider.send(method, params || []);
        }

        case 'eth_sendTransaction':
        case 'eth_signTransaction':
        case 'personal_sign':
        case 'eth_signTypedData':
        case 'eth_signTypedData_v3':
        case 'eth_signTypedData_v4':
          // These all require user approval
          return config.requestApproval({ method, params, host: requestHost });

        case 'wallet_switchEthereumChain': {
          const [{ chainId }] = params as [{ chainId: string }];
          const targetChainId = parseInt(chainId, 16);

          if (session?.chainId === targetChainId) {
            return null; // Already on chain
          }

          if (!config.isSupportedChain(targetChainId)) {
            throw {
              code: ErrorCodes.CHAIN_NOT_SUPPORTED,
              message: 'Chain not supported',
            };
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
            throw {
              code: ErrorCodes.INVALID_PARAMS,
              message: 'Invalid params',
            };
          }
          return recoverMessageAddress({
            message,
            signature: signature as `0x${string}`,
          });
        }

        case 'wallet_revokePermissions':
          config.removeSession(requestHost);
          return null;

        default: {
          // Forward unknown methods to provider
          const provider = config.getProvider(session?.chainId);
          return provider.send(method, params || []);
        }
      }
    },

    // Session query
    getActiveSession: async ([host]: [string]) => {
      return config.getActiveSession(host);
    },

    // Push notifications (no-op, these are sent from host to client)
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    chainChanged: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    accountsChanged: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    disconnect: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    connect: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    ethereumChainEvent: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    prefetchDappMetadata: async () => {},

    // Internal wallet action handler
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    wallet_action: async ([action, payload]: [string, unknown]) => {
      // This would be handled by the wallet service
      throw { code: ErrorCodes.UNSUPPORTED_METHOD, message: 'Not implemented' };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const host = createHost<ProviderPortalSchema>(transport, { handlers });
  return host;
}
