import { createMessenger } from '../messages'
import type { MessagingAdapter } from './adapter.types'
import {
  USE_NEW_MESSAGING,
  createNewMessengerAdapter,
  createWebextBridgeAdapter,
  resolveOneShotTarget,
} from './adapter.shared'

let backgroundAdapterSingleton: MessagingAdapter | null = null
let backgroundMessengerSingleton: ReturnType<typeof createMessenger> | null = null

/**
 * Create a background context adapter.
 */
export function createBackgroundAdapter(): MessagingAdapter {
  if (!backgroundAdapterSingleton) {
    backgroundAdapterSingleton = USE_NEW_MESSAGING
      ? createNewBackgroundAdapter()
      : createWebextBridgeAdapter('background')
  }

  return backgroundAdapterSingleton
}

function createNewBackgroundAdapter(): MessagingAdapter {
  if (!backgroundMessengerSingleton) {
    backgroundMessengerSingleton = createMessenger()
  }

  return createNewMessengerAdapter(backgroundMessengerSingleton, resolveOneShotTarget)
}
