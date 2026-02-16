/**
 * Portal module - viem-portal based messaging for browser extension
 *
 * Replaces the old messenger system with typed RPC using viem-portal.
 */

// Schema and types
export * from './schema';

// Transports
export {
  createWindowTransport,
  createRuntimeTransport,
  createTabTransport,
  createRelayTransport,
} from './transports';

// Provider (for inpage)
export { PortalProvider, createPortalProvider } from './provider';
export type { ChainIdHex } from './provider';

// Host (for background)
export { createPortalHost, ErrorCodes } from './host';
export type { PortalHostConfig } from './host';

// Re-export viem-portal utilities
export {
  createClient,
  createHost,
  createLoopbackTransports,
} from 'viem-portal';
export type {
  PortalClient,
  PortalHost,
  PortalSchema,
  Transport,
} from 'viem-portal';
