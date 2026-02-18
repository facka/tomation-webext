import { onMessage, sendMessage } from 'webext-bridge/background'
import { WorkspaceCmd, workspaceHandlers } from '@/logic/workspace/workspace.handlers'
import { useActiveTab } from '~/composables/useActiveTab'
// import { addOnChunkedMessageListener, sendChunkedResponse } from 'ext-send-chunked-message'
import TomationStorage from '~/logic/storage'
import { VIEWS } from '~/logic/views'

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id })

  const tabStatus = new Map() // tabId → "loading" | "complete"

  const testsMap = {} as Record<string, any>

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

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status) {
      tabStatus.set(tabId, changeInfo.status)

      sendMessage('background-to-popup', {
        cmd: 'tomationwebext-tab-updated',
        params: { tabId, status: changeInfo.status, tabUrl: tab.url },
      }, 'popup')

      // Only act if the tab is the active one in its window and the update is complete
      if (tab.active && changeInfo.status === 'complete') {
        updateSidePanel(tabId)
      }
    }
  })

  // Listen for when the active tab changes
  browser.tabs.onActivated.addListener((activeInfo) => {
    updateSidePanel(activeInfo.tabId)
  })

  // Function to send a message to the side panel
  function updateSidePanel(tabId: number) {
    // Query the active tab's details
    browser.tabs.get(tabId, (tab) => {
      if (tab && tab.url) {
        sendMessage('background-to-popup', {
          cmd: 'tomationwebext-tab-updated',
          params: { tabId, status: 'unknown', tabUrl: tab.url },
        }, 'popup')
      }
    })
  }

  onMessage('content-to-background', async ({ data }) => {
    // console.info('[tomation-webext][background] got content-to-background', data, sender)
    const { cmd, params } = (data as any) || {}
    const commands: Record<string, (params?: any) => void> = {
      'get-workspace': async () => {
        const activeTab = await useActiveTab().getActiveTab()
        const host = new URL(activeTab.tab?.url ?? '').host
        const workspace = await workspaceHandlers[WorkspaceCmd.GetForHost]({ host: host ?? '' })
        return workspace
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
          action: params.action,
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

  workspaceHandlers[WorkspaceCmd.Create]({
    name: 'Escribehost Stage',
    host: 'ehr.stage.int.aws.lillegroup.com',
    script: 'http://127.0.0.1:8080/tests.bundle.js',
  })

  onMessage('options-to-background', async ({ data }) => {
    const { cmd, params } = (data as any) || {}
    const handlers = {
      ...workspaceHandlers,
    }
    const handler = (handlers as any)[cmd]
    if (!handler)
      throw new Error(`Unknown command: ${cmd}`)
    return handler(params)
  })

  onMessage('sidepanel-to-background', async ({ data }) => {
    const { cmd, params } = (data as any) || {}
    const handlers = {
      ...workspaceHandlers,
      'get-test-by-id': async (params: any) => {
        const automatedTests = await TomationStorage.automatedTests.getValue() as Record<string, any>
        return automatedTests[params.testId]
      },
    }
    const handler = (handlers as any)[cmd]
    if (!handler)
      throw new Error(`Unknown command: ${cmd}`)
    return handler(params)
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
