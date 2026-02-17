/**
 * handleProviderRequest - Simplified wrapper that delegates to viem-portal host
 *
 * This replaces the old complex handleProviderRequest with viem-portal based
 * implementation.
 */

import { handlePortalHost } from './handlePortalHost';

/**
 * Initialize the provider request handler via viem-portal
 * This sets up the portal host to handle incoming RPC requests
 */
export const handleProviderRequest = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  inpageMessenger,
}: {
  inpageMessenger: unknown;
}) => {
  // Initialize the viem-portal host
  handlePortalHost();
};
