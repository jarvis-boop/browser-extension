/**
 * Inpage script - injected into dapps
 *
 * Creates the window.ethereum provider using viem-portal.
 */

import { uuid4 } from '@sentry/core';
import _ from 'lodash';
import { EIP1193Provider, announceProvider } from 'mipd';

import { PortalProvider } from '~/core/provider/PortalProvider';
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

// Set up event forwarding from background via viem-portal
// PortalProvider handles subscription to push events internally
function setupEventListeners(): void {
  // Listen for ethereumChainEvent to show notification iframe
  // Other events (accountsChanged, chainChanged, connect, disconnect)
  // are handled internally by PortalProvider
  rainbowProvider.on('connect', (info: unknown) => {
    const data = info as { chainId: string };
    // Could trigger notification here if needed
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
