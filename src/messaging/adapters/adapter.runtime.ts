import { USE_NEW_MESSAGING } from './adapter.shared'

if (USE_NEW_MESSAGING) {
  console.info('[messaging-adapter] New messaging system is ENABLED (via VITE_USE_NEW_MESSAGING)')
}
else {
  console.info('[messaging-adapter] Using webext-bridge (VITE_USE_NEW_MESSAGING not set)')
}

/**
 * Global feature flag check for runtime conditionals.
 */
export function isNewMessagingEnabled(): boolean {
  return USE_NEW_MESSAGING
}

/**
 * Helper to log which system is being used (useful for debugging migration).
 */
export function logMessagingSystem(context: string): void {
  const system = USE_NEW_MESSAGING ? 'new-messenger' : 'webext-bridge'
  console.log(`[messaging-adapter] Using ${system} in ${context}`)
}
