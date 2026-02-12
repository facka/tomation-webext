import { onMessage, sendMessage } from 'webext-bridge/background'
import { useActiveTab } from '~/composables/useActiveTab'
// import { addOnChunkedMessageListener, sendChunkedResponse } from 'ext-send-chunked-message'
import TomationStorage from '~/logic/storage'
import { VIEWS } from '~/logic/views'

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id })

  const tabStatus = new Map() // tabId → "loading" | "complete"

  const testsMap = {} as Record<string, { lastResult: string }>

  // remove or turn this off if you don't use side panel
  const USE_SIDE_PANEL = true

  // to toggle the sidepanel with the action button in chromium:
  if (USE_SIDE_PANEL) {
    browser.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error: unknown) => console.error(error))
  }

  browser.runtime.onInstalled.addListener((): void => {
    console.log('Extension installed')
  })

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status) {
      tabStatus.set(tabId, changeInfo.status)

      sendMessage('background-to-popup', {
        cmd: 'tomationwebext-tab-status-updated',
        params: { tabId, status: changeInfo.status },
      }, 'popup')
    }
  })

  onMessage('content-to-background', async ({ data }) => {
    // console.info('[tomation-webext][background] got content-to-background', data, sender)
    const { cmd, params } = (data as any) || {}
    const commands: Record<string, (params?: any) => void> = {
      'get-script-url': async () => {
        return await TomationStorage.scriptURL.getValue()
      },
      'tomation-session-init': async (params: any) => {
        console.log('[tomation-webext][background] Session init received from content script:', params)
        await TomationStorage.sessionId.setValue(params.sessionId)

        const automatedTests = await TomationStorage.automatedTests.getValue() as Record<string, any>

        // clear automatedTests Record and add new values from testsMap
        Object.keys(automatedTests).forEach(key => delete automatedTests[key])
        Object.keys(testsMap).forEach((key: string) => {
          automatedTests[key] = testsMap[key]
        })
        await TomationStorage.automatedTests.setValue(automatedTests)
      },
      'tomation-test-started': async (params: any) => {
        browser.action.setBadgeText({ text: 'ON' })
        browser.action.setBadgeBackgroundColor({ color: '#33BB33' })

        console.log('[tomation-webext][background] Test started:', params.action)
        const initialAction = params.action

        await TomationStorage.actionsById.setValue({})
        //  Clear actionsById
        // Object.keys(actionsById).forEach(id => delete actionsById[id])

        await TomationStorage.initialAction.setValue(params.action)
        extractActions(await TomationStorage.initialAction.getValue())

        await TomationStorage.view.setValue(VIEWS.VIEWER)
        await TomationStorage.memory.setValue([])

        await TomationStorage.currentRunningTest.setValue({
          result: null,
          startedAt: new Date(),
          finishedAt: null,
          action: { ...initialAction },
        })
        const currentHistory = await TomationStorage.history.getValue()
        const currentRunningTest = await TomationStorage.currentRunningTest.getValue()
        await TomationStorage.history.setValue([
          ...currentHistory,
          currentRunningTest,
        ])
        // sendMessage('tomation-test-started', params, 'sidepanel')
        sendMessage('background-to-popup', { cmd: 'tomation-test-started', params }, 'popup')
      },
      'tomation-action-update': async (params: any) => {
        console.log('[tomation-webext][background] action-update received in background:', params)
        const actionsById = (await TomationStorage.actionsById.getValue()) as Record<string, any>
        const existing = actionsById[params.action.id]
        if (!existing) {
          // store a shallow clone to ensure reactivity tracks the new object
          actionsById[params.action.id] = { ...params.action }
        }
        else {
          // replace the whole action object to trigger reactivity instead of mutating it in place
          actionsById[params.action.id] = {
            ...existing,
            status: params.action.status,
            error: params.action.errors ?? params.action.error ?? existing.error,
            value: params.action.context ?? existing.value,
            tries: params.action.tries ?? existing.tries,
          }
        }
        await TomationStorage.actionsById.setValue(actionsById)
        // forward update to sidepanel and popup
        // sendMessage('tomation-action-updated', params, 'sidepanel')
        sendMessage('background-to-popup', { cmd: 'tomation-action-update', params }, 'popup')
      },
      'tomation-test-stop': async () => {
        console.log('[tomation-webext][background] Test stopped')
        browser.action.setBadgeText({ text: '' })
        await TomationStorage.view.setValue(VIEWS.MAIN)
      },
      'tomation-save-value': async (params: any) => {
        console.log('[tomation-webext][background] save-value', params)
        const memory = await TomationStorage.memory.getValue()
        memory[params.memorySlotName] = params.value
        await TomationStorage.memory.setValue(memory)
      },
      'tomation-read-memory': async (params: any) => {
        console.log('[tomation-webext][background] read-memory', params)
        const activeTab = (await useActiveTab().getActiveTab()).destination
        const memory = await TomationStorage.memory.getValue()
        sendMessage('read-memory-response', memory[params.memorySlotName], activeTab)
      },
      'tomation-register-test': async (params: any) => {
        testsMap[params.id] = {
          lastResult: 'UNDEFINED',
        }
      },
      'tomation-test-passed': async (params: any) => {
        console.log(`Marking test as PASSED. Message = `, params)
        const automatedTests = await TomationStorage.automatedTests.getValue() as Record<string, any>
        automatedTests[params.id].lastResult = 'PASSED'
        await TomationStorage.automatedTests.setValue(automatedTests)

        const currentRunningTest = await TomationStorage.currentRunningTest.getValue() as Record<string, any>
        currentRunningTest.result = 'PASSED'
        await TomationStorage.currentRunningTest.setValue(currentRunningTest)
      },
      'tomation-test-failed': async (params: any) => {
        console.log(`Marking test as FAILED. Message = `, params)
        const automatedTests = await TomationStorage.automatedTests.getValue() as Record<string, any>
        automatedTests[params.id].lastResult = 'FAILED'
        await TomationStorage.automatedTests.setValue(automatedTests)

        const currentRunningTest = await TomationStorage.currentRunningTest.getValue() as Record<string, any>
        currentRunningTest.result = 'FAILED'
        await TomationStorage.currentRunningTest.setValue(currentRunningTest)
      },
      'tomation-test-end': async (params: any) => {
        console.log(`Test ended. Message = `, params)
        const currentRunningTest = await TomationStorage.currentRunningTest.getValue() as Record<string, any>
        currentRunningTest.finishedAt = new Date()
        await TomationStorage.currentRunningTest.setValue(currentRunningTest)
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
      'save-script-url': async (params: any) => {
        await TomationStorage.scriptURL.setValue(params.url)
        console.log('[tomation-webext][background] Saved script URL to storage:', TomationStorage.scriptURL.getValue())
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

  async function extractActions(action: any) {
    if (action.steps) {
      action.steps.forEach((action: any) => extractActions(action))
    }
    const actionsById = await TomationStorage.actionsById.getValue() as Record<string, any>
    actionsById[action.id] = action
    await TomationStorage.actionsById.setValue(actionsById)
  }

  onMessage('popup-to-background', ({ data }) => {
    const { cmd, params } = (data as any) || {}
    console.log('[tomation-webext][background] received popup-to-background message:', cmd, params)

    const commands: Record<string, (params?: any) => void> = {
      'get-script-url': async () => {
        console.log('Storage ready in background (popup request):', TomationStorage)
        return await TomationStorage.scriptURL.getValue()
      },
      'close-run-view': async () => {
        console.log('Task viewer closed (popup request)!')
        await TomationStorage.view.setValue(VIEWS.MAIN)
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
        initialAction: TomationStorage.value.initialAction,
        actionsById: TomationStorage.value.actionsById,
        automatedTests: TomationStorage.value.automatedTests,
        history: TomationStorage.value.history,
      })

      sendChunkedResponse({
        sendMessageFn: (message: string) => browser.runtime.sendMessage(message),
      })(largeResponse, sendResponse)
    }

    return true // async listener
  })
  */
})
