/**
 * Provider utilities
 */

import type { TransactionResponse } from '@ethersproject/providers';

import { type ErrorCode, errorCodes } from './errorCodes';
import type { RequestResponse } from './types';

/**
 * Build an error response
 */
export function buildError({
  id,
  message,
  errorCode,
}: {
  id: number;
  message: string;
  errorCode: ErrorCode;
}): RequestResponse {
  return {
    id,
    error: {
      name: errorCode.name,
      message,
      code: errorCode.code,
    },
  };
}

/**
 * Build a success response
 */
export function buildResponse(id: number, result: unknown): RequestResponse {
  return {
    id,
    result,
  };
}

/**
 * Check if a URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the host from a URL (without www prefix)
 */
export function getDappHost(url: string): string {
  try {
    if (url) {
      const host = new URL(url).host;
      if (host.indexOf('www.') === 0) {
        return host.replace('www.', '');
      }
      return host;
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Convert a value to hex string
 * Handles string, number, bigint, and ethers BigNumber
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toHex(value: string | number | bigint | any): string {
  if (value === null || value === undefined) {
    return '0x0';
  }
  if (typeof value === 'string') {
    // If already hex, return as-is
    if (value.startsWith('0x')) return value;
    // Try to parse as number
    const num = parseInt(value, 10);
    if (!Number.isNaN(num)) {
      return `0x${num.toString(16)}`;
    }
    return value;
  }
  if (typeof value === 'bigint') {
    return `0x${value.toString(16)}`;
  }
  if (typeof value === 'number') {
    return `0x${value.toString(16)}`;
  }
  // Handle ethers BigNumber or objects with toHexString method
  if (typeof value?.toHexString === 'function') {
    return value.toHexString();
  }
  // Handle objects with toString method
  if (typeof value?.toString === 'function') {
    const str = value.toString();
    if (str.startsWith('0x')) return str;
    const num = parseInt(str, 10);
    if (!Number.isNaN(num)) {
      return `0x${num.toString(16)}`;
    }
    return str;
  }
  return `0x${String(value)}`;
}

/**
 * Normalize transaction response for cross-browser compatibility
 * Firefox can't serialize functions
 */
export function normalizeTransactionResponsePayload(
  payload: TransactionResponse,
): Omit<TransactionResponse, 'wait'> & { wait?: unknown } {
  if (navigator.userAgent?.toLowerCase().includes('firefox')) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { wait: _, ...cleanedPayload } = payload;
    return cleanedPayload;
  }
  return payload;
}

// Re-export error codes
export { errorCodes };
