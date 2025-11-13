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
(async () => {
  console.info('[tomation-webext] Running content script...')

  const tomationStorage = await sendToBackground({ message: 'getStorage' })
  console.log(`[tomation-webext] Storage `, tomationStorage)

  try {
    const path = (tomationStorage as any)?.scriptURL
    injectFromURL(path)
  }
  catch (err) {
    console.error('[tomation-webext] Failed to read scriptURL from storage', err)
  }
})()

window.addEventListener('message', (event: any) => {
  if (event.data.sender !== 'web-extension') {
    const { eventId, data } = event.data || {}
    console.info('[tomation-webext][content-script] received window message', eventId, data)

    sendMessage(eventId, data, 'background')
    // sendMessage(eventId, data, 'sidepanel');
    // sendMessage(eventId, data, 'popup');
  }
})

onMessage('reload-tests', () => window.postMessage({ sender: 'web-extension', cmd: 'reload-test', args: {} }))
onMessage('pause-test', () => window.postMessage({ sender: 'web-extension', cmd: 'pause-test', args: {} }))
onMessage('stop-test', () => window.postMessage({ sender: 'web-extension', cmd: 'stop-test', args: {} }))
onMessage('continue-test', () => window.postMessage({ sender: 'web-extension', cmd: 'continue-test', args: {} }))
onMessage('next-test', () => window.postMessage({ sender: 'web-extension', cmd: 'next-test', args: {} }))
onMessage('retry-action', () => window.postMessage({ sender: 'web-extension', cmd: 'retry-action', args: {} }))
onMessage('skip-action', () => window.postMessage({ sender: 'web-extension', cmd: 'skip-action', args: {} }))
onMessage('run-test', ({ data }: any) => window.postMessage({ sender: 'web-extension', cmd: 'run-test', args: { id: data.id } }))
onMessage('user-accept', () => window.postMessage({ sender: 'web-extension', cmd: 'user-accept', args: {} }))
onMessage('user-reject', () => window.postMessage({ sender: 'web-extension', cmd: 'user-reject', args: {} }))
