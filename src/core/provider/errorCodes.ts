/**
 * JSON-RPC Error Codes
 * https://eips.ethereum.org/EIPS/eip-1474
 */

export const errorCodes = {
  PARSE_ERROR: {
    code: -32700,
    name: 'Parse error',
  },
  INVALID_REQUEST: {
    code: -32600,
    name: 'Invalid Request',
  },
  METHOD_NOT_FOUND: {
    code: -32601,
    name: 'Method not found',
  },
  INVALID_PARAMS: {
    code: -32602,
    name: 'Invalid params',
  },
  INTERNAL_ERROR: {
    code: -32603,
    name: 'Internal error',
  },
  INVALID_INPUT: {
    code: -32000,
    name: 'Invalid input',
  },
  RESOURCE_NOT_FOUND: {
    code: -32001,
    name: 'Resource not found',
  },
  RESOURCE_UNAVAILABLE: {
    code: -32002,
    name: 'Resource unavailable',
  },
  TRANSACTION_REJECTED: {
    code: -32003,
    name: 'Transaction rejected',
  },
  METHOD_NOT_SUPPORTED: {
    code: -32004,
    name: 'Method not supported',
  },
  LIMIT_EXCEEDED: {
    code: -32005,
    name: 'Limit exceeded',
  },
  JSON_RPC_VERSION_NOT_SUPPORTED: {
    code: -32006,
    name: 'JSON-RPC version not supported',
  },
  // EIP-1193 errors
  USER_REJECTED: {
    code: 4001,
    name: 'User Rejected Request',
  },
  UNAUTHORIZED: {
    code: 4100,
    name: 'Unauthorized',
  },
  UNSUPPORTED_METHOD: {
    code: 4200,
    name: 'Unsupported Method',
  },
  DISCONNECTED: {
    code: 4900,
    name: 'Disconnected',
  },
  CHAIN_DISCONNECTED: {
    code: 4901,
    name: 'Chain Disconnected',
  },
} as const;

export type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];
