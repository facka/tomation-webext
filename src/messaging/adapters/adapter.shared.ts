import { createMessenger, type OneShotTarget } from '../messages'
import type { MessagingAdapter } from './adapter.types'

export type BridgeModuleName = 'background' | 'content-script' | 'popup'

// Detect feature flag at module load time.
export const USE_NEW_MESSAGING = true

type MessengerInstance = ReturnType<typeof createMessenger>

export function resolveOneShotTarget(target: string): OneShotTarget {
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

export function resolveRuntimeTarget(_target: string): OneShotTarget {
  return { type: 'runtime' }
}

export function createWebextBridgeAdapter(moduleName: BridgeModuleName): MessagingAdapter {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { sendMessage, onMessage } = require(`webext-bridge/${moduleName}`)

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

export function createNewMessengerAdapter(
  messenger: MessengerInstance,
  resolveTarget: (target: string) => OneShotTarget,
): MessagingAdapter {
  return {
    async sendMessage(channel: any, payload: any, target: string) {
      const oneShotTarget = resolveTarget(target)

      try {
        const response = await messenger.send(oneShotTarget, channel, payload)
        return response as any
      }
      catch (error: unknown) {
        const context = {
          channel,
          target,
          oneShotTarget,
          payload,
        }

        throw new Error(
          `[messaging-adapter] Failed to send message with context: ${JSON.stringify({
            ...context,
            originalError: error instanceof Error ? error.message : String(error),
          })}`
        )
      }
    },

    onMessage(channel: any, handler: any) {
      return messenger.on(channel, async (payload: any, meta: any) => {
        return handler({ data: payload, sender: meta.sender })
      })
    },

    getCurrentSystem: () => 'new-messenger',
  }
}
