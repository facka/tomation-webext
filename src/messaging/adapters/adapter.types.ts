import type { MessagingContracts } from './contracts'

export type MessagingSystem = 'webext-bridge' | 'new-messenger'

/**
 * Adapter interface that matches webext-bridge's API surface.
 * Maps webext-bridge-style calls to either webext-bridge or new messenger.
 */
export interface MessagingAdapter {
  /**
   * Send a one-shot message (webext-bridge compatibility).
   *
   * Usage: sendMessage(channelName, payload, targetContext)
   */
  sendMessage<TChannel extends keyof MessagingContracts>(
    channel: TChannel,
    payload: MessagingContracts[TChannel]['request'],
    target: 'background' | 'popup' | 'sidepanel' | 'options' | string,
  ): Promise<any>

  /**
   * Register a one-shot message handler (webext-bridge compatibility).
   * Returns unsubscribe function.
   */
  onMessage<TChannel extends keyof MessagingContracts>(
    channel: TChannel,
    handler: (message: { data: MessagingContracts[TChannel]['request']; sender: any }) => any,
  ): () => void

  /**
   * Get current messaging system in use.
   */
  getCurrentSystem(): MessagingSystem
}
