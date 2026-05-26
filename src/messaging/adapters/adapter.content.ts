import { createMessenger } from '../messages'
import type { MessagingAdapter } from './adapter.types'
import {
  USE_NEW_MESSAGING,
  createNewMessengerAdapter,
  createWebextBridgeAdapter,
  resolveRuntimeTarget,
} from './adapter.shared'

let contentAdapterSingleton: MessagingAdapter | null = null
let contentMessengerSingleton: ReturnType<typeof createMessenger> | null = null

/**
 * Create a content script context adapter.
 */
export function createContentAdapter(): MessagingAdapter {
  if (!contentAdapterSingleton) {
    contentAdapterSingleton = USE_NEW_MESSAGING
      ? createNewContentAdapter()
      : createWebextBridgeAdapter('content-script')
  }

  return contentAdapterSingleton
}

function createNewContentAdapter(): MessagingAdapter {
  if (!contentMessengerSingleton) {
    contentMessengerSingleton = createMessenger()
  }

  return createNewMessengerAdapter(contentMessengerSingleton, resolveRuntimeTarget)
}
