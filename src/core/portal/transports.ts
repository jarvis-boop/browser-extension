/**
 * Portal module - viem-portal transports for browser extension
 *
 * Chrome extension-specific transport implementations using viem-portal.
 * Generic RPC messaging layer - no Ethereum-specific logic here.
 */

import type { PortalMessage, Transport } from 'viem-portal';

// Re-export types for consumers
export type { Transport, PortalMessage } from 'viem-portal';

// Re-export viem-portal utilities
export { createClient, createHost, createLoopbackTransports } from 'viem-portal';

const PORTAL_MESSAGE_TYPE = 'rainbow-portal';

interface PortalEnvelope {
  type: typeof PORTAL_MESSAGE_TYPE;
  message: PortalMessage;
}

function isPortalEnvelope(data: unknown): data is PortalEnvelope {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as PortalEnvelope).type === PORTAL_MESSAGE_TYPE
  );
}

/**
 * Window transport for inpage ↔ content script communication
 */
export function createWindowTransport(): Transport {
  const handlers = new Set<(msg: PortalMessage) => void>();

  const listener = (event: MessageEvent) => {
    if (event.source !== window) return;
    if (!isPortalEnvelope(event.data)) return;
    handlers.forEach((h) => h(event.data.message));
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('message', listener);
  }

  return {
    send(message: PortalMessage) {
      window.postMessage(
        { type: PORTAL_MESSAGE_TYPE, message },
        '*',
      );
    },
    subscribe(handler: (msg: PortalMessage) => void) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    close() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('message', listener);
      }
      handlers.clear();
    },
  };
}

/**
 * Chrome runtime transport for popup ↔ background communication
 */
export function createRuntimeTransport(): Transport {
  const handlers = new Set<(msg: PortalMessage) => void>();

  const listener = (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => {
    if (!isPortalEnvelope(message)) return false;
    handlers.forEach((h) => h((message as PortalEnvelope).message));
    sendResponse({});
    return true;
  };

  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    chrome.runtime.onMessage.addListener(listener);
  }

  return {
    send(message: PortalMessage) {
      chrome.runtime.sendMessage({ type: PORTAL_MESSAGE_TYPE, message });
    },
    subscribe(handler: (msg: PortalMessage) => void) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    close() {
      if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
        chrome.runtime.onMessage.removeListener(listener);
      }
      handlers.clear();
    },
  };
}

/**
 * Chrome tabs transport for content script ↔ background communication
 */
export function createTabTransport(tabId?: number): Transport {
  const handlers = new Set<(msg: PortalMessage) => void>();

  const listener = (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => {
    if (!isPortalEnvelope(message)) return false;
    if (tabId !== undefined && sender.tab?.id !== tabId) return false;
    handlers.forEach((h) => h((message as PortalEnvelope).message));
    sendResponse({});
    return true;
  };

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener(listener);
  }

  return {
    send(message: PortalMessage) {
      const envelope = { type: PORTAL_MESSAGE_TYPE, message };
      if (tabId !== undefined) {
        chrome.tabs.sendMessage(tabId, envelope);
      } else {
        chrome.runtime.sendMessage(envelope);
      }
    },
    subscribe(handler: (msg: PortalMessage) => void) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    close() {
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(listener);
      }
      handlers.clear();
    },
  };
}

/**
 * Relay transport for content script (bridges window ↔ tab)
 */
export function createRelayTransport(): {
  windowSide: Transport;
  tabSide: Transport;
} {
  const windowTransport = createWindowTransport();
  const tabTransport = createTabTransport();

  windowTransport.subscribe((msg) => tabTransport.send(msg));
  tabTransport.subscribe((msg) => windowTransport.send(msg));

  return {
    windowSide: windowTransport,
    tabSide: tabTransport,
  };
}
