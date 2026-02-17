/**
 * Portal module - viem-portal transports for browser extension
 *
 * Chrome extension-specific transport implementations.
 * Generic typed RPC messaging - no Ethereum-specific logic.
 */

// Re-export viem-portal core
export {
  createClient,
  createHost,
  createLoopbackTransports,
} from 'viem-portal';
export type { Transport, PortalMessage, PortalClient, PortalHost, PortalSchema } from 'viem-portal';

// Transport implementations
export {
  createWindowTransport,
  createRuntimeTransport,
  createTabTransport,
  createRelayTransport,
} from './transports';
