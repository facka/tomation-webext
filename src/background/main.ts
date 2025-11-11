/* eslint-disable no-console */
import { onMessage } from 'webext-bridge/background'
import { tomationStorage, tomationStorageReady } from '~/logic/storage'

// only on dev mode
if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import('/@vite/client')
  // load latest content script
  import('./contentScriptHMR')
}

// remove or turn this off if you don't use side panel
const USE_SIDE_PANEL = true

// to toggle the sidepanel with the action button in chromium:
if (USE_SIDE_PANEL) {
  // @ts-expect-error missing types
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => console.error(error))
}

browser.runtime.onInstalled.addListener((): void => {
  console.log('Extension installed')
})

onMessage('content-to-background', async ({ data, sender }) => {
  console.info('[tomation-webext][background] got content-to-background', data, sender)

  if ((data as any).message === 'getStorage') {
    return await tomationStorageReady.then(async () => {
      console.log('Storage ready in background:', tomationStorage.value)
      return tomationStorage.value
    })
  }

  // return something serializable
  return { ok: true }
})

onMessage('options-to-background', async ({ data, sender }) => {
  console.info('[tomation-webext][background] got options-to-background', data, sender)

  if ((data as any).message === 'saveScriptURL') {
    tomationStorage.value.scriptURL = (data as any).url

    console.log('[tomation-webext][background] Saved script URL to storage:', tomationStorage.value.scriptURL)
  }
  // return something serializable
  return { ok: true }
})
