import { onMessage, sendMessage } from 'webext-bridge/background'
import browser from 'webextension-polyfill'
import { addOnChunkedMessageListener, sendChunkedResponse } from 'ext-send-chunked-message'
import { tomationStorage, tomationStorageReady } from '~/logic/storage'
import { useActiveTab } from '~/composables/useActiveTab'

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

// --------------------------------

interface ObjectLiteral {
  [key: string]: any
}

console.log('Running background...')

let runningTask = false
let closedRunView = true
let initialAction: any = null
const actionsById: ObjectLiteral = {}
const memory: ObjectLiteral = {}
const automatedTests: ObjectLiteral = {}
const history: any[] = []
let currentRunningTest: any = {}

function extractActions(action: any) {
  if (action.steps) {
    action.steps.forEach((action: any) => extractActions(action))
    actionsById[action.id] = action
  }
  else {
    actionsById[action.id] = action
  }
}

onMessage('start', async ({ data }: any) => {
  browser.action.setBadgeText({ text: 'ON' })
  browser.action.setBadgeBackgroundColor({ color: '#33BB33' })

  /* Sidepanel only open with user actions
  const activeTab = await useActiveTab().getActiveTab()
  browser.sidePanel.setOptions({
    tabId: activeTab.tab.id,
    path: './dist/popup/index.html',
    enabled: true,
  })
  browser.sidePanel.open({ tabId: activeTab.tab.id })
  */

  //  Clear actionsById
  Object.keys(actionsById).forEach(id => delete actionsById[id])
  runningTask = true
  closedRunView = false
  Object.keys(memory).forEach(id => delete memory[id])
  initialAction = data.action
  extractActions(initialAction)
})

onMessage('end', ({ data }: any) => {
  browser.action.setBadgeText({ text: '' })
  runningTask = false
  if (data.action.error.includes('Test stopped manually')) {
    closedRunView = true
  }
})

onMessage('stop-test', () => {
  browser.action.setBadgeText({ text: '' })
  runningTask = false
  closedRunView = true
})

onMessage('action-update', ({ data }: any) => {
  const action = actionsById[data.action.id]
  if (!action) {
    actionsById[data.action.id] = data.action
  }
  else {
    action.status = data.action.status
    action.error = data.action.errors
    action.tries = data.action.tries
  }
})

onMessage('save-value', ({ data }: any) => {
  memory[data.memorySlotName] = data.value
})

onMessage('read-memory', async ({ data }: any) => {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  sendMessage('read-memory-response', memory[data.memorySlotName], activeTab)
})

onMessage('close-run-view', () => {
  console.log('Task viewer closed!')
  closedRunView = true
  runningTask = false
})

addOnChunkedMessageListener(async (message: string, sender: any, sendResponse: any) => {
  if (message === 'get-large-data') {
    const largeResponse = JSON.stringify({
      closedRunView,
      initialAction,
      actionsById,
      runningTask,
      automatedTests,
      history,
    })

    sendChunkedResponse({
      sendMessageFn: (message: string) => browser.runtime.sendMessage(message),
    })(largeResponse, sendResponse)
  }

  return true // async listener
})

onMessage('register-test', ({ data }: any) => {
  console.log(`Registering test. Message = `, data)
  automatedTests[data.id] = {
    lastResult: 'UNDEFINED',
    action: data.action,
  }
})

onMessage('test-started', ({ data }: any) => {
  const initialAction = data.action
  currentRunningTest = {
    result: null,
    startedAt: new Date(),
    finishedAt: null,
    action: { ...initialAction },
  }
  history.push(currentRunningTest)
})

onMessage('test-passed', ({ data }: any) => {
  automatedTests[data.id].lastResult = 'PASSED'
  currentRunningTest.result = 'PASSED'
})

onMessage('test-failed', ({ data }: any) => {
  automatedTests[data.id].lastResult = 'FAILED'
  currentRunningTest.result = 'FAILED'
})

onMessage('test-end', () => {
  currentRunningTest.finishedAt = new Date()
})

onMessage('reload-test', async () => {
  /* if (data.action === 'reload-test') {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    browser.tabs.sendMessage(tab.id || browser.tabs.TAB_ID_NONE, {
      action: 'reload-tests',
      params: {},
    })
  } */
})
