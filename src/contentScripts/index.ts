/* eslint-disable no-console */
import { sendMessage } from 'webext-bridge/content-script'

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

// expose helper on window for other scripts/pages
;(window as any).tomation = (window as any).tomation || {}
;(window as any).tomation.sendMessage = sendToBackground;

// Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
(async () => {
  console.info('[tomation-webext] Hello world from content script')

  const tomationStorage = await sendToBackground({ message: 'getStorage' })
  console.log(`[tomation-webext] Storage `, tomationStorage);

  (async () => {
    const injectFromURL = (url: string | undefined) => {
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

    // support both promise-based (browser) and callback-based (chrome) storage APIs
    try {
      const path = (tomationStorage as any)?.scriptURL
      injectFromURL(path)
    }
    catch (err) {
      console.error('[tomation-webext] Failed to read scriptURL from storage', err)
    }
  })()
})()
