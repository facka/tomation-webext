import { createMessenger } from '../messages'
import type { MessagingAdapter } from './adapter.types'
import {
  USE_NEW_MESSAGING,
  createNewMessengerAdapter,
  createWebextBridgeAdapter,
  resolveRuntimeTarget,
} from './adapter.shared'

let uiAdapterSingleton: MessagingAdapter | null = null
let uiMessengerSingleton: ReturnType<typeof createMessenger> | null = null

/**
 * Create a popup/sidepanel/options context adapter.
 */
export function createUIAdapter(): MessagingAdapter {
  if (!uiAdapterSingleton) {
    uiAdapterSingleton = USE_NEW_MESSAGING
      ? createNewUIAdapter()
      : createWebextBridgeAdapter('popup')
  }

  return uiAdapterSingleton
}

function createNewUIAdapter(): MessagingAdapter {
  if (!uiMessengerSingleton) {
    uiMessengerSingleton = createMessenger({
      context: 'ui',
    })
  }

  return createNewMessengerAdapter(uiMessengerSingleton, resolveRuntimeTarget)
}
