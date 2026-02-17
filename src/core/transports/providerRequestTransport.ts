/**
 * Provider Request Transport using viem-portal
 *
 * Replaces the old messenger-based transport with viem-portal.
 * Used for communication between popup and background for provider requests.
 */

import type { ProviderRequestPayload, RequestResponse } from '~/core/provider/types';

// Re-export types for convenience
export type { ProviderRequestPayload };
type ProviderResponse = RequestResponse;

/**
 * Creates a transport that can be used to send and receive RPC messages between
 * extension scripts (commonly popup <-> background entries).
 *
 * NOTE: This transport is kept for backwards compatibility.
 * For popup <-> background, oRPC is now preferred.
 * For inpage <-> background, viem-portal is used directly.
 */
export const providerRequestTransport = {
  async send(_payload: ProviderRequestPayload, _options: { id: number }) {
    throw new Error('providerRequestTransport.send is deprecated. Use oRPC instead.');
  },
  async reply(
    _callback: (payload: ProviderRequestPayload) => Promise<ProviderResponse>
  ) {
    throw new Error('providerRequestTransport.reply is deprecated. Use oRPC handlers instead.');
  },
};
