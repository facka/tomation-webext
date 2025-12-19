import { onMessage, sendMessage } from 'webext-bridge/background'
import browser from 'webextension-polyfill'
// import { addOnChunkedMessageListener, sendChunkedResponse } from 'ext-send-chunked-message'
import { tomationStorage, tomationStorageReady } from '~/logic/storage'
import { useActiveTab } from '~/composables/useActiveTab'
import { VIEWS } from '~/logic/views'

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

onMessage('content-to-background', async ({ data }) => {
  // console.info('[tomation-webext][background] got content-to-background', data, sender)

  const { cmd, params } = (data as any) || {}
  const commands: Record<string, (params?: any) => void> = {
    'get-storage': async () => {
      return await tomationStorageReady.then(async () => {
        console.log('Storage ready in background (content script request):', tomationStorage.value)
        return tomationStorage.value
      })
    },
    'tomation-test-started': async (params: any) => {
      return await tomationStorageReady.then(async () => {
        browser.action.setBadgeText({ text: 'ON' })
        browser.action.setBadgeBackgroundColor({ color: '#33BB33' })

        console.log('[tomation-webext][background] Test started:', params.action)
        const initialAction = params.action

        tomationStorage.value.actionsById = {}
        //  Clear actionsById
        // Object.keys(actionsById).forEach(id => delete actionsById[id])

        tomationStorage.value.initialAction = params.action
        extractActions(tomationStorage.value.initialAction)

        tomationStorage.value.view = 'VIEWER'
        Object.keys(tomationStorage.value.memory).forEach(id => delete tomationStorage.value.memory[id])

        tomationStorage.value.currentRunningTest = {
          result: null,
          startedAt: new Date(),
          finishedAt: null,
          action: { ...initialAction },
        }
        tomationStorage.value.history.push(tomationStorage.value.currentRunningTest)
        // sendMessage('tomation-test-started', params, 'sidepanel')
        sendMessage('background-to-popup', { cmd: 'tomation-test-started', params }, 'popup')
      })
    },
    'tomation-action-update': async (params: any) => {
      return await tomationStorageReady.then(async () => {
        console.log('[tomation-webext][background] action-update received in background:', params)
        const existing = tomationStorage.value.actionsById[params.action.id]
        if (!existing) {
          // store a shallow clone to ensure reactivity tracks the new object
          tomationStorage.value.actionsById[params.action.id] = { ...params.action }
        }
        else {
          // replace the whole action object to trigger reactivity instead of mutating it in place
          tomationStorage.value.actionsById[params.action.id] = {
            ...existing,
            status: params.action.status,
            error: params.action.errors ?? params.action.error ?? existing.error,
            value: params.action.context ?? existing.value,
            tries: params.action.tries ?? existing.tries,
          }
        }
        // forward update to sidepanel and popup
        // sendMessage('tomation-action-updated', params, 'sidepanel')
        sendMessage('background-to-popup', { cmd: 'tomation-action-update', params }, 'popup')
      })
    },
    'tomation-test-stop': () => {
      console.log('[tomation-webext][background] Test stopped')
      browser.action.setBadgeText({ text: '' })
      tomationStorage.value.view = 'MAIN'
    },
    'tomation-save-value': (params: any) => {
      console.log('[tomation-webext][background] save-value', params)
      tomationStorage.value.memory[params.memorySlotName] = params.value
    },
    'tomation-read-memory': async (params: any) => {
      console.log('[tomation-webext][background] read-memory', params)
      const activeTab = (await useActiveTab().getActiveTab()).destination
      sendMessage('read-memory-response', tomationStorage.value.memory[params.memorySlotName], activeTab)
    },
    'tomation-register-test': async (params: any) => {
      return await tomationStorageReady.then(async () => {
        console.log(`Registering test. Message = `, params)
        tomationStorage.value.automatedTests[params.id] = {
          lastResult: 'UNDEFINED',
          action: params.action,
        }
      })
    },
    'tomation-test-passed': (params: any) => {
      console.log(`Marking test as PASSED. Message = `, params)
      tomationStorage.value.automatedTests[params.id].lastResult = 'PASSED'
      tomationStorage.value.currentRunningTest.result = 'PASSED'
    },
    'tomation-test-failed': (params: any) => {
      console.log(`Marking test as FAILED. Message = `, params)
      tomationStorage.value.automatedTests[params.id].lastResult = 'FAILED'
      tomationStorage.value.currentRunningTest.result = 'FAILED'
    },
    'tomation-test-end': (params: any) => {
      console.log(`Test ended. Message = `, params)
      tomationStorage.value.currentRunningTest.finishedAt = new Date()
    },
    'tomation-test-pause': (params: any) => {
      console.log(`Test paused. Message = `, params)
      sendMessage('background-to-popup', { cmd: 'tomation-test-pause', params }, 'popup')
    },
    'tomation-test-play': (params: any) => {
      console.log(`Test continued. Message = `, params)
      sendMessage('background-to-popup', { cmd: 'tomation-test-play', params }, 'popup')
    },
  }

  if (commands[cmd]) {
    return await commands[cmd](params)
  }
  else {
    console.warn(`[tomation-webext][background] Unknown cmd received from content script: ${cmd}`, params)
  }

  // return something serializable
  return { ok: true }
})

onMessage('options-to-background', async ({ data, sender }) => {
  console.info('[tomation-webext][background] got options-to-background', data, sender)
  const { cmd, params } = (data as any) || {}
  const commands: Record<string, (params?: any) => void> = {
    'save-script-URL': (params: any) => {
      tomationStorage.value.scriptURL = params.url
      console.log('[tomation-webext][background] Saved script URL to storage:', tomationStorage.value.scriptURL)
    },
  }
  if (commands[cmd]) {
    commands[cmd](params)
  }
  else {
    console.warn(`[tomation-webext][background] Unknown cmd received from options: ${cmd}`, params)
  }
  // return something serializable
  return { ok: true }
})

// --------------------------------

console.log('Running background...')

function extractActions(action: any) {
  if (action.steps) {
    action.steps.forEach((action: any) => extractActions(action))
  }
  tomationStorage.value.actionsById[action.id] = action
}

onMessage('popup-to-background', ({ data }) => {
  const { cmd, params } = (data as any) || {}
  console.log('[tomation-webext][background] received popup-to-background message:', cmd, params)

  const commands: Record<string, (params?: any) => void> = {
    'get-storage': async () => {
      return await tomationStorageReady.then(async () => {
        console.log('Storage ready in background (popup request):', tomationStorage.value)
        return tomationStorage.value
      })
    },
    'close-run-view': () => {
      console.log('Task viewer closed (popup request)!')
      tomationStorage.value.view = VIEWS.MAIN
    },
  }

  if (commands[cmd]) {
    commands[cmd](params)
  }
  else {
    console.warn(`[tomation-webext][background] Unknown cmd received from popup: ${cmd}`, params)
  }
})
/*
addOnChunkedMessageListener(async (message: string, sender: any, sendResponse: any) => {
  if (message === 'get-large-data') {
    const largeResponse = JSON.stringify({
      initialAction: tomationStorage.value.initialAction,
      actionsById: tomationStorage.value.actionsById,
      automatedTests: tomationStorage.value.automatedTests,
      history: tomationStorage.value.history,
    })

    sendChunkedResponse({
      sendMessageFn: (message: string) => browser.runtime.sendMessage(message),
    })(largeResponse, sendResponse)
  }

  return true // async listener
})
*/
