/**
 * Provider module - replaces @rainbow-me/provider
 */

export { RainbowProvider } from './RainbowProvider';
export type { RainbowProviderOptions, Ethereum } from './RainbowProvider';

export { handleProviderRequest } from './handleProviderRequest';
export type { HandleProviderRequestOptions } from './handleProviderRequest';

export { errorCodes } from './errorCodes';
export type { ErrorCode } from './errorCodes';

export * from './types';
export {
  buildError,
  buildResponse,
  toHex,
  getDappHost,
  isValidUrl,
} from './utils';
