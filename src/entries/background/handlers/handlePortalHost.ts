/**
 * handlePortalHost - Sets up the viem-portal host in background
 *
 * Handles incoming RPC requests from inpage via the portal transport.
 */

import { createPortalHost, ErrorCodes, type ProviderSchema } from '~/core/provider/handleProviderPortal';
import type { PortalHost } from 'viem-portal';
import { useAppSessionsStore } from '~/core/state';
import { useNetworkStore } from '~/core/state/networks/networks';
import { getProvider } from '~/core/viem/clientToProvider';

let portalHost: PortalHost<ProviderSchema> | null = null;

/**
 * Initialize the portal host for handling provider requests
 */
export function startPortalHost(): PortalHost<ProviderSchema> {
  if (portalHost) {
    return portalHost;
  }

  portalHost = createPortalHost({
    // Session management
    getActiveSession: (host: string) => {
      const session = useAppSessionsStore.getState().getActiveSession({ host });
      if (session) {
        return {
          address: session.address,
          chainId: session.chainId,
        };
      }
      return null;
    },

    removeSession: (host: string) => {
      useAppSessionsStore.getState().removeAppSession({ host });
    },

    updateSessionChain: (host: string, chainId: number) => {
      useAppSessionsStore.getState().updateActiveSessionChainId({ host, chainId });
    },

    // Chain support
    isSupportedChain: (chainId: number) => {
      return !!useNetworkStore.getState().getBackendSupportedChain(chainId);
    },

    getChainRpcUrl: (chainId: number) => {
      const chain = useNetworkStore.getState().getActiveRpcForChain(chainId);
      return chain?.rpcUrls.default.http[0];
    },

    // User approval - delegate to existing handleProviderRequest logic
    requestApproval: async (_request) => {
      // This opens the popup and waits for user approval
      // For now we throw unsupported - the full implementation would integrate
      // with the pending request store and popup flow
      throw {
        code: ErrorCodes.USER_REJECTED,
        message: 'User approval via portal not yet implemented',
      };
    },

    // Provider for chain queries
    getProvider: (chainId?: number) => {
      return getProvider({ chainId });
    },
  });

  return portalHost;
}

/**
 * Handler to initialize the portal host
 */
export function handlePortalHost(): void {
  startPortalHost();
}
