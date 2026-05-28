import { createUIAdapter } from '@/messaging'

let initialized = false
let messaging: ReturnType<typeof createUIAdapter> | null = null

/**
 * Options-context bootstrap.
 *
 * Idempotent by design to avoid duplicate initialization when called twice.
 */
export function bootstrapMessaging() {
  if (initialized) {
    return
  }

  messaging = createUIAdapter()
  initialized = true
}

function getMessaging() {
  if (!messaging) {
    throw new Error('[tomation-webext][options] Messaging not initialized. Call bootstrapMessaging() in main.ts first.')
  }

  return messaging
}

export async function sendOptionsToBackground(cmd: string, params: Record<string, any> = {}) {
  return await getMessaging().sendMessage('options-to-background', {
    cmd,
    params,
  }, 'background')
}
