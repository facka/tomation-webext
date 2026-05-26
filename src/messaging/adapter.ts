/**
 * Adapter layer for messaging system.
 *
 * This adapter provides a unified interface that can dispatch to either:
 * 1. webext-bridge (current system, default)
 * 2. createMessenger (new typed system)
 *
 * This enables gradual migration without breaking existing code.
 * Control via environment variable: VITE_USE_NEW_MESSAGING=true
 *
 * Usage:
 * - Background: Use the background adapter (handles one-shot and channel messages)
 * - Content: Use the content adapter (handles one-shot and channel messages)
 * - UI: Use the popup adapter (handles one-shot and channel messages)
 */

import { createMessenger, CONTEXT_PORT_NAMES, type OneShotTarget, type ConnectTarget, type Channel } from './messages'
import type { MessagingContracts, CommandMessage, CommandResponse } from './contracts'

// Detect feature flag at module load time
const USE_NEW_MESSAGING = true

let backgroundAdapterSingleton: MessagingAdapter | null = null
let contentAdapterSingleton: MessagingAdapter | null = null
let uiAdapterSingleton: MessagingAdapter | null = null

// Singleton messenger instances (shared by all adapter instances in each context)
let backgroundMessengerSingleton: ReturnType<typeof createMessenger> | null = null
let contentMessengerSingleton: ReturnType<typeof createMessenger> | null = null
let uiMessengerSingleton: ReturnType<typeof createMessenger> | null = null

if (USE_NEW_MESSAGING) {
  console.info('[messaging-adapter] New messaging system is ENABLED (via VITE_USE_NEW_MESSAGING)')
} else {
  console.info('[messaging-adapter] Using webext-bridge (VITE_USE_NEW_MESSAGING not set)')
}

/**
 * Adapter interface that matches webext-bridge's API surface.
 * Maps webext-bridge-style calls to either webext-bridge or new messenger.
 */
export interface MessagingAdapter {
  /**
   * Send a one-shot message (webext-bridge compatibility).
   *
   * Usage: sendMessage(channelName, payload, targetContext)
   * Example: await sendMessage('popup-to-background', { cmd: 'start', params: {...} }, 'background')
   */
  sendMessage<TChannel extends keyof MessagingContracts>(
    channel: TChannel,
    payload: MessagingContracts[TChannel]['request'],
    target: 'background' | 'popup' | 'sidepanel' | 'options' | string,
  ): Promise<any>

  /**
   * Register a one-shot message handler (webext-bridge compatibility).
   *
   * Usage: onMessage(channelName, ({ data, sender }) => { ... })
   * Returns unsubscribe function
   */
  onMessage<TChannel extends keyof MessagingContracts>(
    channel: TChannel,
    handler: (message: { data: MessagingContracts[TChannel]['request']; sender: any }) => any,
  ): () => void

  /**
   * Get current messaging system in use
   */
  getCurrentSystem(): 'webext-bridge' | 'new-messenger'
}

/**
 * Create a background context adapter.
 * Used in: src/entrypoints/background/index.ts
 *
 * The background context needs to:
 * - Register handlers for content-to-background, options-to-background, etc.
 * - Send messages to popup, content script, etc.
 */
export function createBackgroundAdapter(): MessagingAdapter {
  if (!backgroundAdapterSingleton) {
    backgroundAdapterSingleton = USE_NEW_MESSAGING
      ? createNewMessengerBackgroundAdapter()
      : createWebextBridgeBackgroundAdapter()
  }

  return backgroundAdapterSingleton
}

/**
 * Create a content script adapter.
 * Used in: src/entrypoints/content.ts
 *
 * The content script needs to:
 * - Send messages to background
 * - Register handlers for messages from background
 */
export function createContentAdapter(): MessagingAdapter {
  if (!contentAdapterSingleton) {
    contentAdapterSingleton = USE_NEW_MESSAGING
      ? createNewMessengerContentAdapter()
      : createWebextBridgeContentAdapter()
  }

  return contentAdapterSingleton
}

/**
 * Create a popup/sidepanel/options adapter.
 * Used in: src/entrypoints/popup/main.ts, sidepanel/main.ts, options/main.ts
 *
 * UI contexts need to:
 * - Send messages to background
 * - Register handlers for messages from background
 */
export function createUIAdapter(): MessagingAdapter {
  if (!uiAdapterSingleton) {
    uiAdapterSingleton = USE_NEW_MESSAGING
      ? createNewMessengerUIAdapter()
      : createWebextBridgeUIAdapter()
  }

  return uiAdapterSingleton
}

function resolveOneShotTarget(target: string): OneShotTarget {
  if (target === 'background' || target === 'popup' || target === 'sidepanel' || target === 'options') {
    return { type: 'runtime' }
  }

  const contentScriptTarget = /^content-script@(\d+)$/.exec(target)
  if (contentScriptTarget) {
    return { type: 'tab', tabId: Number(contentScriptTarget[1]) }
  }

  if (target === 'content') {
    throw new Error('[messaging-adapter] Target "content" is ambiguous. Use content-script@{tabId}.')
  }

  return { type: 'runtime' }
}

// ============================================================================
// webext-bridge adapters
// ============================================================================

function createWebextBridgeBackgroundAdapter(): MessagingAdapter {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { sendMessage, onMessage } = require('webext-bridge/background')

  return {
    sendMessage: (channel, payload, target) => {
      return sendMessage(channel, payload, target)
    },
    onMessage: (channel, handler) => {
      const unsubscribe = onMessage(channel, ({ data, sender }: any) => {
        return handler({ data, sender })
      })
      return unsubscribe ?? (() => {})
    },
    getCurrentSystem: () => 'webext-bridge',
  }
}

function createWebextBridgeContentAdapter(): MessagingAdapter {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { sendMessage, onMessage } = require('webext-bridge/content-script')

  return {
    sendMessage: (channel, payload, target) => {
      return sendMessage(channel, payload, target)
    },
    onMessage: (channel, handler) => {
      const unsubscribe = onMessage(channel, ({ data, sender }: any) => {
        return handler({ data, sender })
      })
      return unsubscribe ?? (() => {})
    },
    getCurrentSystem: () => 'webext-bridge',
  }
}

function createWebextBridgeUIAdapter(): MessagingAdapter {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { sendMessage, onMessage } = require('webext-bridge/popup')

  return {
    sendMessage: (channel, payload, target) => {
      return sendMessage(channel, payload, target)
    },
    onMessage: (channel, handler) => {
      const unsubscribe = onMessage(channel, ({ data, sender }: any) => {
        return handler({ data, sender })
      })
      return unsubscribe ?? (() => {})
    },
    getCurrentSystem: () => 'webext-bridge',
  }
}

// ============================================================================
// new-messenger adapters
// ============================================================================

/**
 * Adapter for new messenger in background context.
 * Translates webext-bridge API calls to new messenger API.
 * Uses singleton messenger so all adapters in background context share handlers.
 */
function createNewMessengerBackgroundAdapter(): MessagingAdapter {
  if (!backgroundMessengerSingleton) {
    backgroundMessengerSingleton = createMessenger()
  }
  const backgroundMessenger = backgroundMessengerSingleton

  return {
    async sendMessage(channel: any, payload: any, target: string) {
      const oneShotTarget = resolveOneShotTarget(target)

      try {
        const response = await backgroundMessenger.send(oneShotTarget, channel, payload)
        return response as any
      } catch (error: unknown) {
        console.error(`[messaging-adapter] Failed to send message on channel ${channel}:`, error)
        throw error
      }
    },

    onMessage(channel: any, handler: any) {
      return backgroundMessenger.on(channel, async (payload: any, meta: any) => {
        return handler({ data: payload, sender: meta.sender })
      })
    },

    getCurrentSystem: () => 'new-messenger',
  }
}

/**
 * Adapter for new messenger in content script context.
 * Uses singleton messenger so all adapters in content context share handlers.
 */
function createNewMessengerContentAdapter(): MessagingAdapter {
  if (!contentMessengerSingleton) {
    contentMessengerSingleton = createMessenger()
  }
  const contentMessenger = contentMessengerSingleton

  return {
    async sendMessage(channel: any, payload: any, target: string) {
      const oneShotTarget: OneShotTarget = { type: 'runtime' }

      try {
        const response = await contentMessenger.send(oneShotTarget, channel, payload)
        return response as any
      } catch (error: unknown) {
        console.error(`[messaging-adapter] Failed to send message on channel ${channel}:`, error)
        throw error
      }
    },

    onMessage(channel: any, handler: any) {
      return contentMessenger.on(channel, async (payload: any, meta: any) => {
        return handler({ data: payload, sender: meta.sender })
      })
    },

    getCurrentSystem: () => 'new-messenger',
  }
}

/**
 * Adapter for new messenger in UI contexts (popup, sidepanel, options).
 * Uses singleton messenger so all adapters in UI context share handlers.
 */
function createNewMessengerUIAdapter(): MessagingAdapter {
  if (!uiMessengerSingleton) {
    uiMessengerSingleton = createMessenger()
  }
  const uiMessenger = uiMessengerSingleton

  return {
    async sendMessage(channel: any, payload: any, target: string) {
      const oneShotTarget: OneShotTarget = { type: 'runtime' }

      try {
        const response = await uiMessenger.send(oneShotTarget, channel, payload)
        return response as any
      } catch (error: unknown) {
        console.error(`[messaging-adapter] Failed to send message on channel ${channel}:`, error)
        throw error
      }
    },

    onMessage(channel: any, handler: any) {
      return uiMessenger.on(channel, async (payload: any, meta: any) => {
        return handler({ data: payload, sender: meta.sender })
      })
    },

    getCurrentSystem: () => 'new-messenger',
  }
}

/**
 * Global feature flag check for runtime conditionals
 */
export function isNewMessagingEnabled(): boolean {
  return USE_NEW_MESSAGING
}

/**
 * Helper to log which system is being used (useful for debugging migration)
 */
export function logMessagingSystem(context: string): void {
  const system = USE_NEW_MESSAGING ? 'new-messenger' : 'webext-bridge'
  console.log(`[messaging-adapter] Using ${system} in ${context}`)
}
