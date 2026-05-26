/**
 * Messaging module for the extension.
 *
 * This module exports both the new strongly-typed messaging system
 * and the compatibility adapter that bridges to webext-bridge.
 *
 * Usage:
 * ------
 *
 * Background script:
 * ```typescript
 * import { createBackgroundAdapter, logMessagingSystem } from '@/messaging'
 *
 * const messaging = createBackgroundAdapter()
 * logMessagingSystem('background')
 *
 * messaging.onMessage('content-to-background', async ({ data, sender }) => {
 *   const { cmd, params } = data
 *   // handle command
 * })
 * ```
 *
 * Content script:
 * ```typescript
 * import { createContentAdapter } from '@/messaging'
 *
 * const messaging = createContentAdapter()
 * const response = await messaging.sendMessage('content-to-background', payload, 'background')
 * ```
 *
 * UI contexts (Popup, Sidepanel, Options):
 * ```typescript
 * import { createUIAdapter } from '@/messaging'
 *
 * const messaging = createUIAdapter()
 * const response = await messaging.sendMessage('popup-to-background', payload, 'background')
 * ```
 *
 * Feature flag:
 * Set VITE_USE_NEW_MESSAGING=true in .env to enable the new messaging system.
 * Default is webext-bridge for stability during migration.
 */

// Core messaging system (fully typed, new implementation)
export { createMessenger, CONTEXT_PORT_NAMES, contentScriptPortName, isKnownPortName } from './messages'
export type {
  OneShotContract,
  ChannelContract,
  OneShotTarget,
  ConnectTarget,
  Channel,
  Messenger,
  MessengerOptions,
} from './messages'

// Message contracts (define all messages used in the extension)
export type {
  MessagingContracts,
  CommandMessage,
  CommandResponse,
  ContentToBackgroundRequest,
  ContentToBackgroundResponse,
  OptionsToBackgroundRequest,
  OptionsToBackgroundResponse,
  SidepanelToBackgroundRequest,
  SidepanelToBackgroundResponse,
  PopupToBackgroundRequest,
  PopupToBackgroundResponse,
  BackgroundToPopupRequest,
  BackgroundToPopupResponse,
  BackgroundToContentScriptRequest,
  BackgroundToContentScriptResponse,
  SidepanelToContentScriptRequest,
  SidepanelToContentScriptResponse,
} from './contracts'

// Adapter layer (enables gradual migration from webext-bridge)
export {
  createBackgroundAdapter,
  createContentAdapter,
  createUIAdapter,
  isNewMessagingEnabled,
  logMessagingSystem,
} from './adapter'
export type { MessagingAdapter } from './adapter'
