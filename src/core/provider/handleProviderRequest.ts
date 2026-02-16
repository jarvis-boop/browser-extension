/**
 * handleProviderRequest - Handles incoming provider RPC requests
 *
 * Replaces @rainbow-me/provider/handleProviderRequest
 * Uses viem directly instead of ethers for RPC calls
 */

import { type Address, isAddress, isHex, recoverMessageAddress } from 'viem';

import type {
  AddEthereumChainProposedChain,
  CallbackOptions,
  IProviderRequestTransport,
  ProviderRequestPayload,
  RequestResponse,
} from './types';
import {
  buildError,
  buildResponse,
  errorCodes,
  getDappHost,
  isValidUrl,
  normalizeTransactionResponsePayload,
  toHex,
} from './utils';

/**
 * Active session info
 */
interface ActiveSession {
  address: Address;
  chainId: number;
}

/**
 * Feature flags
 */
interface FeatureFlags {
  custom_rpc?: boolean;
}

/**
 * Configuration for handleProviderRequest
 */
export interface HandleProviderRequestOptions {
  providerRequestTransport: IProviderRequestTransport;
  getFeatureFlags: () => FeatureFlags;
  checkRateLimit: (params: {
    id: number;
    meta: CallbackOptions;
    method: string;
  }) => Promise<RequestResponse | undefined>;
  isSupportedChain: (chainId: number) => boolean;
  getActiveSession: (params: { host: string }) => ActiveSession | null;
  removeAppSession: (params: { host: string }) => void;
  getChainNativeCurrency: (
    chainId: number,
  ) => { name: string; symbol: string; decimals: number } | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getProvider: (params: { chainId?: number }) => any;
  messengerProviderRequest: (
    request: ProviderRequestPayload,
  ) => Promise<object>;
  onAddEthereumChain: (params: {
    proposedChain: AddEthereumChainProposedChain;
    callbackOptions?: CallbackOptions;
  }) => { chainAlreadyAdded: boolean };
  onSwitchEthereumChainNotSupported: (params: {
    proposedChain: AddEthereumChainProposedChain;
    callbackOptions?: CallbackOptions;
  }) => void;
  onSwitchEthereumChainSupported: (params: {
    proposedChain: AddEthereumChainProposedChain;
    callbackOptions?: CallbackOptions;
  }) => void;
}

/**
 * Creates a provider request handler
 */
export function handleProviderRequest(options: HandleProviderRequestOptions) {
  const {
    providerRequestTransport,
    getFeatureFlags,
    checkRateLimit,
    isSupportedChain,
    getActiveSession,
    removeAppSession,
    getChainNativeCurrency,
    getProvider,
    messengerProviderRequest,
    onAddEthereumChain,
    onSwitchEthereumChainNotSupported,
    onSwitchEthereumChainSupported,
  } = options;

  return providerRequestTransport?.reply(
    async (
      { method, id, params }: ProviderRequestPayload,
      meta: CallbackOptions,
    ): Promise<RequestResponse> => {
      try {
        // Check rate limit
        const rateLimited = await checkRateLimit({ id, meta, method });
        if (rateLimited) {
          return buildError({
            id,
            message: 'Rate Limit Exceeded',
            errorCode: errorCodes.LIMIT_EXCEEDED,
          });
        }

        const url = meta?.sender?.url || '';
        const host = (isValidUrl(url) && getDappHost(url)) || '';
        const activeSession = getActiveSession({ host });

        let response: unknown = null;

        switch (method) {
          case 'eth_chainId': {
            response = activeSession ? toHex(activeSession.chainId) : '0x1';
            break;
          }

          case 'eth_coinbase': {
            response = activeSession?.address?.toLowerCase() || '';
            break;
          }

          case 'eth_accounts': {
            response = activeSession
              ? [activeSession.address?.toLowerCase()]
              : [];
            break;
          }

          case 'eth_blockNumber': {
            const provider = getProvider({ chainId: activeSession?.chainId });
            const blockNumber = await provider.getBlockNumber();
            response = toHex(blockNumber);
            break;
          }

          case 'eth_getBalance': {
            const p = params as [string, string?];
            const provider = getProvider({ chainId: activeSession?.chainId });
            const balance = await provider.getBalance(p?.[0]);
            response = toHex(balance);
            break;
          }

          case 'eth_getTransactionByHash': {
            const p = params as [string];
            const provider = getProvider({ chainId: activeSession?.chainId });
            const transaction = await provider.getTransaction(p?.[0]);
            const normalizedTransaction =
              normalizeTransactionResponsePayload(transaction);
            const {
              gasLimit,
              gasPrice,
              maxFeePerGas,
              maxPriorityFeePerGas,
              value,
            } = normalizedTransaction;
            response = {
              ...normalizedTransaction,
              gasLimit: toHex(gasLimit),
              gasPrice: gasPrice ? toHex(gasPrice) : undefined,
              maxFeePerGas: maxFeePerGas ? toHex(maxFeePerGas) : undefined,
              maxPriorityFeePerGas: maxPriorityFeePerGas
                ? toHex(maxPriorityFeePerGas)
                : undefined,
              value: toHex(value),
            };
            break;
          }

          case 'eth_call': {
            const p = params as [object, string?];
            const provider = getProvider({ chainId: activeSession?.chainId });
            response = await provider.call(p?.[0]);
            break;
          }

          case 'eth_estimateGas': {
            const p = params as [object];
            const provider = getProvider({ chainId: activeSession?.chainId });
            const gas = await provider.estimateGas(p?.[0]);
            response = toHex(gas);
            break;
          }

          case 'eth_gasPrice': {
            const provider = getProvider({ chainId: activeSession?.chainId });
            const gasPrice = await provider.getGasPrice();
            response = toHex(gasPrice);
            break;
          }

          case 'eth_getCode': {
            const p = params as [string, string?];
            const provider = getProvider({ chainId: activeSession?.chainId });
            response = await provider.getCode(p?.[0], p?.[1]);
            break;
          }

          // Methods requiring user approval
          case 'eth_sendTransaction':
          case 'eth_signTransaction':
          case 'personal_sign':
          case 'eth_signTypedData':
          case 'eth_signTypedData_v3':
          case 'eth_signTypedData_v4': {
            const p = params as unknown[];
            // For typed data v4, extract chain ID from domain
            if (method === 'eth_signTypedData_v4') {
              let dataParam = p?.[1];
              if (!isAddress(p?.[0] as string)) {
                dataParam = p?.[0];
              }
              const data =
                typeof dataParam === 'string'
                  ? JSON.parse(dataParam)
                  : dataParam;
              const chainId = (data as { domain?: { chainId?: number } })
                ?.domain?.chainId;
              if (
                chainId &&
                activeSession?.chainId &&
                chainId !== activeSession.chainId
              ) {
                return buildError({
                  id,
                  message: `Chain ID mismatch. Expected ${activeSession.chainId}, got ${chainId}`,
                  errorCode: errorCodes.INVALID_PARAMS,
                });
              }
            }
            response = await messengerProviderRequest({
              method,
              id,
              params,
              meta: { ...meta, sender: meta.sender },
            });
            break;
          }

          case 'wallet_addEthereumChain': {
            const p = params as [AddEthereumChainProposedChain];
            const proposedChain = p?.[0];
            const proposedChainId = parseInt(proposedChain.chainId, 16);
            const featureFlags = getFeatureFlags();

            // Check if we support custom RPCs
            if (!featureFlags.custom_rpc) {
              const supportedChain = isSupportedChain(proposedChainId);
              if (!supportedChain) {
                return buildError({
                  id,
                  message: 'Chain not supported',
                  errorCode: errorCodes.INVALID_PARAMS,
                });
              }
            }

            // Validate chain parameters
            const chainId = proposedChain.chainId;
            const rpcUrl = proposedChain.rpcUrls?.[0];
            const { name, symbol, decimals } = proposedChain.nativeCurrency;
            const blockExplorerUrl = proposedChain.blockExplorerUrls?.[0];

            if (
              !chainId ||
              !rpcUrl ||
              !name ||
              !symbol ||
              decimals === undefined
            ) {
              return buildError({
                id,
                message: 'Missing required chain parameters',
                errorCode: errorCodes.INVALID_PARAMS,
              });
            }

            // Check if we already have native currency info
            const knownChainNativeCurrency =
              getChainNativeCurrency(proposedChainId);

            // Handle the chain addition
            const { chainAlreadyAdded } = onAddEthereumChain({
              proposedChain: {
                chainId,
                chainName: proposedChain.chainName,
                nativeCurrency: knownChainNativeCurrency || {
                  name,
                  symbol,
                  decimals,
                },
                rpcUrls: [rpcUrl],
                blockExplorerUrls: blockExplorerUrl ? [blockExplorerUrl] : [],
              },
              callbackOptions: meta,
            });

            if (chainAlreadyAdded) {
              response = null;
            } else {
              response = await messengerProviderRequest({
                method,
                id,
                params,
                meta: { ...meta, sender: meta.sender },
              });
            }
            break;
          }

          case 'wallet_switchEthereumChain': {
            const p = params as [{ chainId: string }];
            const proposedChain = p?.[0];
            const supportedChainId = parseInt(proposedChain.chainId, 16);
            const featureFlags = getFeatureFlags();

            // If same chain, no-op
            if (activeSession?.chainId === supportedChainId) {
              response = null;
              break;
            }

            // Check if chain is supported
            const isSupported = isSupportedChain(supportedChainId);

            if (!isSupported && !featureFlags.custom_rpc) {
              onSwitchEthereumChainNotSupported({
                proposedChain: {
                  chainId: proposedChain.chainId,
                  chainName: '',
                  nativeCurrency: { name: '', symbol: '', decimals: 18 },
                  rpcUrls: [],
                  blockExplorerUrls: [],
                },
                callbackOptions: meta,
              });
              return buildError({
                id,
                message: 'Chain not supported',
                errorCode: errorCodes.INVALID_PARAMS,
              });
            }

            onSwitchEthereumChainSupported({
              proposedChain: {
                chainId: proposedChain.chainId,
                chainName: '',
                nativeCurrency: { name: '', symbol: '', decimals: 18 },
                rpcUrls: [],
                blockExplorerUrls: [],
              },
              callbackOptions: meta,
            });
            response = null;
            break;
          }

          case 'wallet_watchAsset': {
            const p = params as [
              {
                type: string;
                options: {
                  address: string;
                  symbol?: string;
                  decimals?: number;
                };
              },
            ];
            const { type } = p?.[0] || {};
            const { address, symbol, decimals } = p?.[0]?.options || {};

            if (type !== 'ERC20') {
              return buildError({
                id,
                message: 'Only ERC20 tokens are supported',
                errorCode: errorCodes.INVALID_PARAMS,
              });
            }

            if (!address || !isAddress(address)) {
              return buildError({
                id,
                message: 'Invalid token address',
                errorCode: errorCodes.INVALID_PARAMS,
              });
            }

            response = await messengerProviderRequest({
              method,
              id,
              params: [
                {
                  type,
                  options: {
                    address,
                    symbol,
                    decimals,
                    chainId: activeSession?.chainId,
                  },
                },
              ],
              meta: { ...meta, sender: meta.sender },
            });
            break;
          }

          case 'eth_requestAccounts': {
            if (activeSession) {
              response = [activeSession.address?.toLowerCase()];
            } else {
              response = await messengerProviderRequest({
                method,
                id,
                params,
                meta: { ...meta, sender: meta.sender },
              });
            }
            break;
          }

          case 'personal_ecRecover': {
            const p = params as [string, string];
            const message = p?.[0];
            const signature = p?.[1];

            if (!message || !signature || !isHex(signature)) {
              return buildError({
                id,
                message: 'Invalid message or signature',
                errorCode: errorCodes.INVALID_PARAMS,
              });
            }

            try {
              const recoveredAddress = await recoverMessageAddress({
                message,
                signature: signature as `0x${string}`,
              });
              response = recoveredAddress;
            } catch (e) {
              return buildError({
                id,
                message: `Failed to recover address: ${(e as Error).message}`,
                errorCode: errorCodes.INVALID_PARAMS,
              });
            }
            break;
          }

          case 'wallet_revokePermissions': {
            removeAppSession({ host });
            response = null;
            break;
          }

          default: {
            // Forward unknown methods to provider
            try {
              const provider = getProvider({ chainId: activeSession?.chainId });
              response = await provider.send(method, params || []);
            } catch (e) {
              return buildError({
                id,
                message: (e as Error).message || 'Method failed',
                errorCode: errorCodes.INTERNAL_ERROR,
              });
            }
          }
        }

        return buildResponse(id, response);
      } catch (error) {
        return buildError({
          id,
          message: (error as Error).message || 'Internal error',
          errorCode: errorCodes.INTERNAL_ERROR,
        });
      }
    },
  );
}
