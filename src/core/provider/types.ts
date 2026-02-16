/**
 * Provider types - replaces @rainbow-me/provider types
 */

import type { PortalSchema } from 'viem-portal';

/**
 * JSON-RPC method types
 */
export type RPCMethod =
  | 'eth_accounts'
  | 'eth_blockNumber'
  | 'eth_call'
  | 'eth_chainId'
  | 'eth_coinbase'
  | 'eth_estimateGas'
  | 'eth_gasPrice'
  | 'eth_getBalance'
  | 'eth_getBlockByHash'
  | 'eth_getBlockByNumber'
  | 'eth_getCode'
  | 'eth_getLogs'
  | 'eth_getStorageAt'
  | 'eth_getTransactionByBlockHashAndIndex'
  | 'eth_getTransactionByBlockNumberAndIndex'
  | 'eth_getTransactionByHash'
  | 'eth_getTransactionCount'
  | 'eth_getTransactionReceipt'
  | 'eth_getUncleByBlockHashAndIndex'
  | 'eth_getUncleByBlockNumberAndIndex'
  | 'eth_getUncleCountByBlockHash'
  | 'eth_getUncleCountByBlockNumber'
  | 'eth_hashrate'
  | 'eth_mining'
  | 'eth_newBlockFilter'
  | 'eth_newFilter'
  | 'eth_newPendingTransactionFilter'
  | 'eth_protocolVersion'
  | 'eth_requestAccounts'
  | 'eth_sendRawTransaction'
  | 'eth_sendTransaction'
  | 'eth_sign'
  | 'eth_signTransaction'
  | 'eth_signTypedData'
  | 'eth_signTypedData_v3'
  | 'eth_signTypedData_v4'
  | 'eth_subscribe'
  | 'eth_syncing'
  | 'eth_uninstallFilter'
  | 'eth_unsubscribe'
  | 'net_listening'
  | 'net_peerCount'
  | 'net_version'
  | 'personal_ecRecover'
  | 'personal_sign'
  | 'wallet_addEthereumChain'
  | 'wallet_getCapabilities'
  | 'wallet_getPermissions'
  | 'wallet_requestPermissions'
  | 'wallet_revokePermissions'
  | 'wallet_sendCalls'
  | 'wallet_switchEthereumChain'
  | 'wallet_watchAsset'
  // Allow any string for forward compatibility with new methods
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (string & {});

/**
 * Request arguments for provider.request()
 */
export interface RequestArguments {
  id?: number;
  method: RPCMethod;
  params?: unknown[];
}

/**
 * Error response from provider
 */
export interface RequestError {
  name: string;
  message?: string;
  code?: number;
}

/**
 * Response from provider.request()
 */
export type RequestResponse =
  | {
      id: number;
      error?: RequestError;
      jsonrpc?: string;
      result?: never;
    }
  | {
      id: number;
      error?: RequestError;
      jsonrpc?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result: any;
    };

/**
 * Tab info from browser extension
 */
export interface Tab {
  title?: string;
  id?: number;
}

/**
 * Message sender info
 */
export interface IMessageSender {
  url?: string;
  tab?: Tab;
}

/**
 * Callback options for message handlers
 */
export interface CallbackOptions {
  sender: IMessageSender;
  topic: string;
  id?: number | string;
}

/**
 * Provider request payload (extends RequestArguments with metadata)
 */
export interface ProviderRequestPayload extends RequestArguments {
  id: number;
  meta?: CallbackOptions;
}

/**
 * Chain ID as hex string
 */
export type ChainIdHex = `0x${string}`;

/**
 * Proposed chain for wallet_addEthereumChain
 */
export interface AddEthereumChainProposedChain {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  iconUrls?: string[];
}

/**
 * Portal schema for provider communication
 */
export type ProviderPortalSchema = PortalSchema & {
  provider_request: {
    params: [payload: ProviderRequestPayload];
    result: RequestResponse;
  };
};

/**
 * Messenger interface for cross-context communication
 */
export interface IMessenger {
  available: boolean;
  name: string;
  send<TPayload, TResponse>(
    topic: string,
    payload: TPayload,
    options?: { id?: string | number },
  ): Promise<TResponse>;
  reply<TPayload, TResponse>(
    topic: string,
    callback: (
      payload: TPayload,
      callbackOptions: CallbackOptions,
    ) => Promise<TResponse>,
  ): () => void;
}

/**
 * Provider request transport interface
 */
export interface IProviderRequestTransport {
  send(
    payload: ProviderRequestPayload,
    options: { id: number },
  ): Promise<RequestResponse>;
  reply(
    callback: (
      payload: ProviderRequestPayload,
      callbackOptions: CallbackOptions,
    ) => Promise<RequestResponse>,
  ): Promise<void>;
}
