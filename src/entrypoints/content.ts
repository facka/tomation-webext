import type { Workspace } from '@/logic/workspace/workspace.types'
import { createContentAdapter } from '@/messaging'

const messaging = createContentAdapter()

const FROM_INJECTED_MESSAGE_EVENT = 'injectedScript-to-contentScript'
const TO_INJECTED_MESSAGE_EVENT = 'contentScript-to-injectedScript'

const FORWARDED_SIDEPANEL_COMMANDS = new Set([
  'next-step-request',
  'reload-tests-request',
  'run-test-request',
  'pause-test-request',
  'stop-test-request',
  'continue-test-request',
  'retry-action-request',
  'skip-action-request',
  'user-accept-request',
  'user-reject-request',
  'setup-tests-request',
])

async function sendToBackground(payload: any, event?: MessageEvent) {
  try {
    return await messaging.sendMessage('content-to-background', payload, 'background')
  }
  catch (err) {
    console.error('[tomation-webext] SendMessageToBackground ERROR', { err, payload, event })
  }
}

function injectFromURL(url: string) {
  const s = document.createElement('script')
  s.src = url
  s.async = false
  s.onload = () => {
    // remove the tag after execution to keep DOM clean
    s.remove()
    console.info(`[tomation-webext] Injected script from URL: ${url}`)
  }

  const parent = document.head || document.documentElement
  parent.appendChild(s)
}

async function getWorkspaceForCurrentPage() {
  return await sendToBackground({
    cmd: 'get-workspace',
    params: {
      url: window.location.href,
    }
  }) as Workspace
}

function isBridgeMessageFromInjectedScript(event: MessageEvent) {
  const { message, sender } = (event.data || {}) as any
  return sender === 'tomation' && message === FROM_INJECTED_MESSAGE_EVENT
}

function registerInjectedToContentBridge() {
  const handleWindowMessage = (event: MessageEvent) => {
    console.info('[tomation-webext] Received message in content script. Event = ', event)
    if (!isBridgeMessageFromInjectedScript(event)) {
      return
    }

    const { cmd, params } = ((event.data || {}) as any).payload || {}
    console.info('[tomation-webext] Injected script send => ',{ cmd, params })

    sendToBackground({
      cmd,
      params,
    }, event)
  }

  window.addEventListener('message', handleWindowMessage)
}

function forwardMessageToInjectedScript(cmd: string, params: any) {
  window.postMessage({
    message: TO_INJECTED_MESSAGE_EVENT,
    sender: 'web-extension',
    payload: {
      cmd,
      params,
    },
  })
}

function registerSidepanelToContentBridge() {
  messaging.onMessage('sidepanel-to-contentScript', ({ data }: any) => {
    const { cmd, params } = data

    if (FORWARDED_SIDEPANEL_COMMANDS.has(cmd)) {
      console.log('[tomation-webext] forwarding message to injected script:', cmd, params)
      forwardMessageToInjectedScript(cmd, params)
      return
    }

    if (cmd === 'refresh-page') {
      console.log('[tomation-webext] Reloading page as requested...')
      window.location.reload()
      return
    }

    console.log('[tomation-webext] Ignored message that is not for injected script')
  })
}

function registerBackgroundToContentBridge() {
  messaging.onMessage('background-to-contentScript', ({ data }: any) => {
    const { cmd, params } = data
    console.log('[tomation-webext] Received message from background:', cmd, params)

    if (cmd === 'setup-tests-request') {
      forwardMessageToInjectedScript(cmd, params)
      return
    }

    console.log('[tomation-webext] Ignored message from background that is not for injected script')
  })
}

function tryInjectWorkspaceScript(workspace: Workspace | undefined) {
  if (!workspace?.script) {
    console.info('[tomation-webext] No script defined for this workspace, skipping injection')
    return
  }

  try {
    console.info(`[tomation-webext] Injecting script for host ${workspace.host} from URL: ${workspace.script}`)
    injectFromURL(workspace.script)
    window.__TOMATION_SCRIPT_INJECTED__ = true
  }
  catch (err) {
    console.error('[tomation-webext] Failed to read scriptURL from workspace', err)
  }
}

// Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
async function bootstrapContentScript() {
  console.info('[tomation-webext] Running content script...')

  const workspace = await getWorkspaceForCurrentPage()
  console.log('[tomation-webext] Current workspace: ', workspace)
  console.log(`[tomation-webext] Script: `, workspace?.script)

  console.log('Tomation script injected: ', window.__TOMATION_SCRIPT_INJECTED__)

  if (window.__TOMATION_SCRIPT_INJECTED__ === true) {
    console.info('[tomation-webext] Script already injected, skipping injection')
    return
  }

  registerInjectedToContentBridge()
  registerSidepanelToContentBridge()
  registerBackgroundToContentBridge()
  tryInjectWorkspaceScript(workspace)
}

export default defineContentScript({
  matches: ['*://*/*'],
  main() {
    bootstrapContentScript().catch((err) => {
      console.error('[tomation-webext] Failed to initialize content script', err)
    })
  },
})
