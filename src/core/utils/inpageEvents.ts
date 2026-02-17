/**
 * Inpage Events - Simple event forwarding from background to inpage
 *
 * Uses chrome.tabs.sendMessage to send events to content script,
 * which forwards to inpage via window.postMessage.
 * This replaces the old messenger system for event notifications.
 */

import type { Address } from 'viem';

/**
 * Find tab ID by URL host
 * Queries chrome.tabs to find a tab with matching URL host
 */
async function findTabIdByHost(host: string): Promise<number | null> {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.url) {
        try {
          const url = new URL(tab.url);
          const tabHost = url.host.replace(/^www\./, '');
          if (tabHost === host) {
            return tab.id ?? null;
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }
  } catch {
    // Chrome API not available
  }
  return null;
}

/**
 * Send accountsChanged event to inpage
 */
export async function sendAccountsChangedEvent(
  host: string,
  accounts: Address[],
): Promise<void> {
  const tabId = await findTabIdByHost(host);
  if (!tabId) return;

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'rainbow_accountsChanged',
      data: accounts,
    });
  } catch {
    // Tab might not have content script loaded, ignore
  }
}

/**
 * Send chainChanged event to inpage
 */
export async function sendChainChangedEvent(
  host: string,
  chainId: number,
): Promise<void> {
  const tabId = await findTabIdByHost(host);
  if (!tabId) return;

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'rainbow_chainChanged',
      data: `0x${chainId.toString(16)}`,
    });
  } catch {
    // Tab might not have content script loaded, ignore
  }
}

/**
 * Send connect event to inpage
 */
export async function sendConnectEvent(
  host: string,
  chainId: number,
): Promise<void> {
  const tabId = await findTabIdByHost(host);
  if (!tabId) return;

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'rainbow_connect',
      data: { chainId: `0x${chainId.toString(16)}` },
    });
  } catch {
    // Tab might not have content script loaded, ignore
  }
}

/**
 * Send disconnect event to inpage
 */
export async function sendDisconnectEvent(host: string): Promise<void> {
  const tabId = await findTabIdByHost(host);
  if (!tabId) return;

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'rainbow_disconnect',
      data: [],
    });
  } catch {
    // Tab might not have content script loaded, ignore
  }
}

/**
 * Send setDefaultProvider event to all tabs
 */
export async function sendSetDefaultProviderEvent(
  rainbowAsDefault: boolean,
): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && tab.url?.startsWith('http')) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'rainbow_setDefaultProvider',
            data: { rainbowAsDefault },
          });
        } catch {
          // Tab might not have content script, ignore
        }
      }
    }
  } catch {
    // Chrome API not available
  }
}

/**
 * Send ethereumChainEvent to inpage
 */
export async function sendEthereumChainEvent(
  host: string,
  event: {
    host: string;
    chainId: number;
    chainName: string;
    status: string;
    extensionUrl: string;
  },
): Promise<void> {
  const tabId = await findTabIdByHost(host);
  if (!tabId) return;

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'rainbow_ethereumChainEvent',
      data: event,
    });
  } catch {
    // Tab might not have content script loaded, ignore
  }
}
