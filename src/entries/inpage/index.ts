/**
 * Inpage script - injected into dapps
 *
 * Creates the window.ethereum provider using viem-portal.
 */

import { uuid4 } from '@sentry/core';
import _ from 'lodash';
import { EIP1193Provider, announceProvider } from 'mipd';

import { PortalProvider } from '~/core/portal';
import { RAINBOW_ICON_RAW_SVG } from '~/core/references/rawImages';
import { ChainId } from '~/core/types/chains';

import { injectNotificationIframe } from '../iframe';
import { IN_DAPP_NOTIFICATION_STATUS } from '../iframe/notification';

declare global {
  interface Window {
    ethereum: PortalProvider;
    lodash: unknown;
    rainbow: PortalProvider;
    providers: PortalProvider[];
    rnbwWalletRouter: {
      rainbowProvider: PortalProvider;
      lastInjectedProvider?: PortalProvider;
      currentProvider: PortalProvider;
      providers: PortalProvider[];
      setDefaultProvider: (rainbowAsDefault: boolean) => void;
      addProvider: (provider: PortalProvider) => void;
    };
  }
}

window.lodash = _.noConflict();

// Create the provider
const rainbowProvider = new PortalProvider();

// Helper functions
function getDappHost(url: string): string {
  try {
    const host = new URL(url).host;
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return '';
  }
}

function toHex(value: string | number): string {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return `0x${num.toString(16)}`;
}

// Set up event forwarding from background
// TODO: These will come as push messages from the portal host
function setupEventListeners(): void {
  const host = getDappHost(window.location.href);
  if (!host) return;

  // Listen for events via window.postMessage from content script relay
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const { type, data } = event.data || {};

    switch (type) {
      case 'rainbow_accountsChanged':
        rainbowProvider.emit('accountsChanged', data);
        break;
      case 'rainbow_chainChanged':
        rainbowProvider.emit('chainChanged', toHex(data));
        break;
      case 'rainbow_disconnect':
        rainbowProvider.emit('accountsChanged', []);
        rainbowProvider.emit('disconnect', []);
        break;
      case 'rainbow_connect':
        rainbowProvider.emit('connect', data);
        break;
      case 'rainbow_ethereumChainEvent':
        if (getDappHost(window.location.href) === data.host) {
          injectNotificationIframe({
            chainId: data.chainId as ChainId,
            chainName: data.chainName,
            status: data.status as IN_DAPP_NOTIFICATION_STATUS,
            extensionUrl: data.extensionUrl,
          });
        }
        break;
    }
  });
}

if (shouldInjectProvider()) {
  setupEventListeners();

  // Create a copy without isMetaMask for EIP-6963
  const providerCopy = Object.create(
    Object.getPrototypeOf(rainbowProvider),
    Object.getOwnPropertyDescriptors(rainbowProvider),
  );
  providerCopy.isMetaMask = false;

  announceProvider({
    info: {
      icon: RAINBOW_ICON_RAW_SVG,
      name: 'Rainbow',
      rdns: 'me.rainbow',
      uuid: uuid4(),
    },
    provider: providerCopy as EIP1193Provider,
  });

  Object.defineProperties(window, {
    rainbow: {
      value: rainbowProvider,
      configurable: false,
      writable: false,
    },
    ethereum: {
      get() {
        return window.rnbwWalletRouter.currentProvider;
      },
      set(newProvider) {
        window.rnbwWalletRouter?.addProvider(newProvider);
      },
      configurable: false,
    },
    rnbwWalletRouter: {
      value: {
        rainbowProvider,
        lastInjectedProvider: window.ethereum,
        currentProvider: rainbowProvider,
        providers: [
          rainbowProvider,
          ...(window.ethereum ? [window.ethereum] : []),
        ],
        setDefaultProvider(rainbowAsDefault: boolean) {
          if (rainbowAsDefault) {
            window.rnbwWalletRouter.currentProvider = window.rainbow;
          } else {
            const nonDefaultProvider =
              window.rnbwWalletRouter?.lastInjectedProvider ?? window.ethereum;
            window.rnbwWalletRouter.currentProvider = nonDefaultProvider;
          }
        },
        addProvider(provider: PortalProvider) {
          if (!window.rnbwWalletRouter?.providers?.includes(provider)) {
            window.rnbwWalletRouter?.providers?.push(provider);
          }
          if (rainbowProvider !== provider) {
            window.rnbwWalletRouter.lastInjectedProvider = provider;
          }
        },
      },
      configurable: false,
      writable: false,
    },
  });

  window.dispatchEvent(new Event('ethereum#initialized'));
}

/**
 * Check if provider should be injected
 */
function shouldInjectProvider(): boolean {
  // Check doctype
  const { doctype } = window.document;
  if (doctype && doctype.name !== 'html') return false;

  // Check file extension
  const prohibitedTypes = [/\.xml$/u, /\.pdf$/u];
  const pathname = window.location.pathname;
  if (prohibitedTypes.some((rx) => rx.test(pathname))) return false;

  // Check document element
  const nodeName = document.documentElement.nodeName;
  if (nodeName && nodeName.toLowerCase() !== 'html') return false;

  return true;
}
