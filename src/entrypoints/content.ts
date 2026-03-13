import type { Workspace } from '@/logic/workspace/workspace.types'
import { onMessage, sendMessage } from 'webext-bridge/content-script'

async function sendToBackground(payload: any = { hello: 'background' }) {
  try {
    const resp = await sendMessage('content-to-background', payload)
    console.info('[tomation-webext] Sent message to background', resp)
    return resp
  }
  catch (err) {
    console.error('[tomation-webext] Failed to send message to background', err)
  }
}

function injectFromURL(url: string | undefined) {
  if (!url) {
    console.info('[tomation-webext] No URL defined')
    return
  }
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

// Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
async function init() {
  console.info('[tomation-webext] Running content script...')

  const workspace = await sendToBackground({ cmd: 'get-workspace' }) as Workspace
  console.log(`[tomation-webext] Script: `, workspace?.script)

  window.addEventListener('message', (event: any) => {
    // console.log('[tomation-webext] window message event', event)
    // console.log('[tomation-webext] Sender: ', event.data.sender)
    const { message, sender, payload } = event.data || {}
    if (sender === 'tomation' && message === 'injectedScript-to-contentScript') {
      const { cmd, params } = payload || {}
      console.info('[tomation-webext] received message from injected script. cmd = ', cmd, ' params = ', params)

      sendToBackground({
        cmd,
        params,
      })
    }
    else {
      // console.log('[tomation-webext] Ignored message that is not from injected script')
    }
  })

  if (workspace?.script) {
    try {
      console.info(`[tomation-webext] Injecting script for host ${workspace.host} from URL: ${workspace.script}`)
      injectFromURL(workspace.script)
    }
    catch (err) {
      console.error('[tomation-webext] Failed to read scriptURL from workspace', err)
    }
  }
  else {
    console.info('[tomation-webext] No script defined for this workspace, skipping injection')
  }

  onMessage('sidepanel-to-contentScript', ({ data }: any) => {
    // if the message is handled by the injected script, forward it
    const { cmd, params } = data
    if ([
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
    ].includes(cmd)) {
      console.log('[tomation-webext] forwarding message to injected script:', cmd, params)
      window.postMessage({
        message: 'contentScript-to-injectedScript',
        sender: 'web-extension',
        payload: {
          cmd,
          params,
        },
      })
    }
    else {
      console.log('[tomation-webext] Ignored message that is not for injected script')
    }
    if (cmd === 'refresh-page') {
      console.log('[tomation-webext] Reloading page as requested...')
      window.location.reload()
    }
  })
}

export default defineContentScript({
  matches: ['*://*/*'],
  main(ctx) {
    console.log({ ctx })
    init()
  },
})
