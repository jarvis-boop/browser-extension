/**
 * Portal Provider - Minimal EIP-1193 provider using viem-portal
 *
 * Simple EIP-1193 provider for inpage (window.ethereum).
 * For chain RPC, use viem with portalTransport instead.
 */

import { EventEmitter } from 'eventemitter3';
import { createClient, createWindowTransport } from 'viem-portal';

export type ChainIdHex = `0x${string}`;

/**
 * Minimal EIP-1193 provider for dapps
 */
export class PortalProvider extends EventEmitter {
  chainId: ChainIdHex | undefined;
  connected = false;
  isRainbow = true;
  isReady = true;
  isMetaMask = true;
  networkVersion = '1';
  selectedAddress: string | undefined;

  private client = createClient(createWindowTransport());

  async request({ method, params }: { method: string; params?: unknown[] }) {
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

  // Legacy EIP-1193 methods
  async enable() {
    return this.request({ method: 'eth_requestAccounts' });
  }

  isConnected() {
    return this.connected;
  }

  async sendAsync(
    args: { method: string; params?: unknown[] },
    callback: (error: Error | null, response: { result?: unknown }) => void,
  ) {
    try {
      callback(null, { result: await this.request(args) });
    } catch (error) {
      callback(error as Error, {});
    }
  }

  async send(
    methodOrPayload: string | { method: string; params?: unknown[] },
    paramsOrCallback?:
      | unknown[]
      | ((error: Error | null, response: unknown) => void),
  ) {
    if (typeof methodOrPayload === 'string') {
      return this.request({
        method: methodOrPayload,
        params: paramsOrCallback as unknown[],
      });
    }
    return this.request(methodOrPayload);
  }
}
