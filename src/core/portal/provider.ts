/**
 * Portal Provider - EIP-1193 provider using viem-portal
 *
 * Replaces the old RainbowProvider with a simpler implementation
 * that uses viem-portal for typed RPC communication.
 */

import { EventEmitter } from 'eventemitter3';
import { type PortalClient, createClient } from 'viem-portal';

import type { ProviderPortalSchema } from './schema';
import { createWindowTransport } from './transports';

export type ChainIdHex = `0x${string}`;

/**
 * Portal Provider - EIP-1193 compatible Ethereum provider
 */
export class PortalProvider extends EventEmitter {
  chainId: ChainIdHex | undefined;
  connected = false;
  isRainbow = true;
  isReady = true;
  isMetaMask = true;
  networkVersion = '1';
  selectedAddress: string | undefined;

  private client: PortalClient<ProviderPortalSchema>;

  constructor() {
    super();
    const transport = createWindowTransport();
    this.client = createClient<ProviderPortalSchema>(transport);

    // Bind methods for EIP-6963 compatibility
    this.request = this.request.bind(this);
    this.enable = this.enable.bind(this);
    this.isConnected = this.isConnected.bind(this);
  }

  /**
   * Set up event listeners from background
   * These would be handled via push messages from background
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  setupListeners(_host: string): void {}

  /**
   * @deprecated Use eth_requestAccounts via request()
   */
  async enable(): Promise<unknown> {
    return this.request({ method: 'eth_requestAccounts' });
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * EIP-1193 request method
   */
  async request({
    method,
    params,
  }: {
    method: string;
    params?: unknown[];
  }): Promise<unknown> {
    // Forward all requests through the portal
    const result = await this.client.request('eth_request', method, params);

    // Update internal state based on response
    if (method === 'eth_requestAccounts' && Array.isArray(result)) {
      this.selectedAddress = result[0] as string | undefined;
      this.connected = true;
    } else if (method === 'eth_chainId' && typeof result === 'string') {
      this.chainId = result as ChainIdHex;
      this.networkVersion = parseInt(this.chainId, 16).toString();
    }

    return result;
  }

  /**
   * @deprecated Use request() instead
   */
  async sendAsync(
    args: { method: string; params?: unknown[] },
    callback: (error: Error | null, response: { result?: unknown }) => void,
  ): Promise<void> {
    try {
      const result = await this.request(args);
      callback(null, { result });
    } catch (error) {
      callback(error as Error, {});
    }
  }

  /**
   * @deprecated Use request() instead
   */
  async send(
    methodOrPayload: string | { method: string; params?: unknown[] },
    paramsOrCallback?:
      | unknown[]
      | ((error: Error | null, response: unknown) => void),
  ): Promise<unknown> {
    if (typeof methodOrPayload === 'string') {
      return this.request({
        method: methodOrPayload,
        params: paramsOrCallback as unknown[],
      });
    }
    return this.request(methodOrPayload);
  }
}

/**
 * Create a provider instance
 */
export function createPortalProvider(): PortalProvider {
  return new PortalProvider();
}
