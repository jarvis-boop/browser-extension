/**
 * Provider module - viem-inpage based provider
 */

export { InpageProvider, createInpageClient, createInpageProvider } from 'viem-inpage';

export * from './types';

export { createPortalHost } from './handleProviderPortal';
export type { PortalHostConfig } from './handleProviderPortal';
