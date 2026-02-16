/**
 * RainbowProvider - EIP-1193 compatible Ethereum provider
 *
 * Replaces @rainbow-me/provider/RainbowProvider with viem-portal based implementation
 */

import { EventEmitter } from 'eventemitter3';

import {
  ChainIdHex,
  IMessenger,
  IProviderRequestTransport,
  RequestArguments,
  RequestError,
  RequestResponse,
} from './types';

/**
 * Ethereum interface for compatibility with other providers
 */
export interface Ethereum {
  isMetaMask?: boolean;
  isRainbow?: boolean;
  request: (args: RequestArguments) => Promise<unknown>;
}

/**
 * Options for RainbowProvider constructor
 */
export interface RainbowProviderOptions {
  backgroundMessenger?: IMessenger;
  providerRequestTransport?: IProviderRequestTransport;
  onConstruct?: (options: {
    emit: (event: string, ...args: unknown[]) => void;
  }) => void;
}

/**
 * RainbowProvider - EIP-1193 compatible provider for dapps
 */
export class RainbowProvider extends EventEmitter {
  chainId: ChainIdHex | undefined;
  connected = false;
  isRainbow = true;
  isReady = true;
  isMetaMask = true;
  networkVersion = '1';
  selectedAddress: string | undefined;
  providers: (RainbowProvider | Ethereum)[] | undefined;
  requestId = 0;

  private backgroundMessenger?: IMessenger;
  private providerRequestTransport?: IProviderRequestTransport;

  [key: string]: unknown;

  constructor(options: RainbowProviderOptions = {}) {
    super();
    const { backgroundMessenger, providerRequestTransport, onConstruct } =
      options;

    this.backgroundMessenger = backgroundMessenger;
    this.providerRequestTransport = providerRequestTransport;
    onConstruct?.({ emit: this.emit.bind(this) });

    // EIP-6963 requires bound methods
    this.bindMethods();
  }

  bindMethods(): void {
    for (const key of Object.getOwnPropertyNames(
      Object.getPrototypeOf(this),
    ) as (keyof this)[]) {
      const value = this[key];
      if (typeof value === 'function' && key !== 'constructor') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any)[key] = (value as (...args: unknown[]) => unknown).bind(
          this,
        );
      }
    }
  }

  /**
   * @deprecated – Use `eth_requestAccounts` via request() instead
   */
  async enable(): Promise<RequestResponse | undefined> {
    return this.request({ method: 'eth_requestAccounts' });
  }

  isConnected(): boolean {
    return this.connected;
  }

  async handleChainChanged(chainId: ChainIdHex): Promise<void> {
    this.chainId = chainId;
    this.networkVersion = parseInt(this.chainId, 16).toString();
    this.emit('chainChanged', this.toHex(String(chainId)));
  }

  async request({
    method,
    params,
  }: RequestArguments): Promise<RequestResponse | undefined> {
    if (!this.providerRequestTransport) {
      throw new Error('No transport');
    }

    // Prefetch dapp metadata
    this.backgroundMessenger?.send(
      'rainbow_prefetchDappMetadata',
      window.location.href,
    );

    const id = this.requestId;
    this.requestId += 1;
    const response = await this.providerRequestTransport.send(
      {
        id,
        method,
        params,
      },
      { id },
    );

    if (response.id !== id) return;
    if (response.error) throw response.error;

    // Update internal state based on response
    switch (method) {
      case 'eth_requestAccounts':
        this.selectedAddress = response.result?.[0];
        this.connected = true;
        break;
      case 'eth_chainId':
        this.chainId = response.result as ChainIdHex;
        this.networkVersion = parseInt(this.chainId, 16).toString();
        break;
    }

    return response.result;
  }

  /**
   * @deprecated – Use `request` instead
   */
  async sendAsync(
    args: RequestArguments,
    callback: (error: RequestError | null, response: RequestResponse) => void,
  ): Promise<void> {
    try {
      const result = await this.request(args);
      callback(null, {
        id: args.id ?? 0,
        result,
      });
    } catch (error) {
      callback(error as RequestError, {
        id: args.id ?? 0,
        error: error as RequestError,
      });
    }
  }

  /**
   * @deprecated – Use `request` instead
   */
  async send(
    methodOrPayload: string | RequestArguments,
    paramsOrCallback: unknown[],
  ): Promise<RequestResponse | undefined> {
    if (typeof methodOrPayload === 'string') {
      return this.request({
        method: methodOrPayload,
        params: paramsOrCallback,
      });
    }
    return this.request(methodOrPayload);
  }

  private toHex(value: string): string {
    const num = parseInt(value, 10);
    if (Number.isNaN(num)) return value;
    return `0x${num.toString(16)}`;
  }
}
