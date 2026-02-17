/**
 * Portal Provider - EIP-1193 provider using viem-portal
 *
 * Simple EIP-1193 provider that forwards requests via viem-portal.
 */

import { EventEmitter } from 'eventemitter3';
import { createClient } from 'viem-portal';

import { createWindowTransport, type Transport } from '~/core/portal';

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

  // Using any for client to avoid complex schema typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;

  constructor() {
    super();
    const transport = createWindowTransport();
    this.client = createClient(transport as Transport);

    this.request = this.request.bind(this);
    this.enable = this.enable.bind(this);
    this.isConnected = this.isConnected.bind(this);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setupListeners(_host: string): void {}

  async enable(): Promise<unknown> {
    return this.request({ method: 'eth_requestAccounts' });
  }

  isConnected(): boolean {
    return this.connected;
  }

  async request({
    method,
    params,
  }: {
    method: string;
    params?: unknown[];
  }): Promise<unknown> {
    const result = await this.client.request('eth_request', method, params);

    if (method === 'eth_requestAccounts' && Array.isArray(result)) {
      this.selectedAddress = result[0] as string | undefined;
      this.connected = true;
    } else if (method === 'eth_chainId' && typeof result === 'string') {
      this.chainId = result as ChainIdHex;
      this.networkVersion = parseInt(this.chainId, 16).toString();
    }

    return result;
  }

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

export function createPortalProvider(): PortalProvider {
  return new PortalProvider();
}
