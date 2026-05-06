import { onMessage, sendMessage } from 'webext-bridge/background'
import { WorkspaceCmd, workspaceHandlers } from '@/logic/workspace/workspace.handlers'
import { TestRunCmd, testrunHandlers } from '@/runtime/testrun/testrun.handlers'
import { testRunToJSON } from '@/runtime/testrun/testrun.model'
import { tomationSessionHandlers } from '@/runtime/tomation-session/tomation-session.handlers'
import {
  clearTomationSession,
  createTomationSession,
  getTomationSessionByTabId,
  registerTestForSessionByTabId,
  setTomationSessionConnected,
  setTomationSessionURLMismatch,
  clearTomationSessionTests,
} from '@/runtime/tomation-session/tomation-session.service'
import { useActiveTab } from '~/composables/useActiveTab'
// import { addOnChunkedMessageListener, sendChunkedResponse } from 'ext-send-chunked-message'
import { VIEWS } from '~/logic/views'
import { updateSession } from '@/runtime/tomation-session/tomation-session.store'

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id })

  const tabStatus = new Map() // tabId → "loading" | "complete"

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
        params: { tabId, status: changeInfo.status, tabUrl: tab.url } as any,
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

  browser.tabs.onRemoved.addListener((tabId) => {
    clearTomationSession(tabId)
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

  onMessage('content-to-background', async ({ data, sender }) => {
    // console.info('[tomation-webext][background] got content-to-background', data, sender)
    const { cmd, params } = (data as any) || {}
    const { tabId } = sender
    const paramsWithTabId = { ...params, tabId }
    const commands: Record<string, (params?: any) => void> = {
      'get-workspace': async (params: any) => {
        const { url } = params
        const host = new URL(url ?? '').host
        const workspace = await workspaceHandlers[WorkspaceCmd.GetForHost]({ host: host ?? '' })
        return workspace
      },
      'tomation-session-init': async (params: any) => {
        console.log('[tomation-webext][background] Session init received from content script:', params)
        const tab = await browser.tabs.get(tabId!)

        const host = new URL(tab?.url ?? '').host
        const workspace = await workspaceHandlers[WorkspaceCmd.GetForHost]({ host: host ?? '' })

        if (tab && workspace) {
          const tomationSession = createTomationSession(workspace.id, tab.id as number)
          console.log(`[tomation-webext][background] Created session with id ${tomationSession.id} for workspace ${workspace.name} in tab ${tab.id}`)
          sendMessage('background-to-popup', { cmd: 'tomation-session-created', params: tomationSession }, 'popup')
        }
        else {
          throw new Error(`Cannot initialize session: tab or workspace not found. tabId = ${tabId}, host = ${host}`)
        }
      },
      'tomation-session-connected': async (params: any) => {
        console.log('[tomation-webext][background] Session connected received from content script:', params)
        const session = getTomationSessionByTabId(tabId!)
        if (!session) {
          console.warn(`[tomation-webext][background] No session found for tabId ${tabId} while trying to set session as connected`)
          return
        }
        setTomationSessionConnected(session.id)
        sendMessage('background-to-popup', { cmd: 'tomation-session-connected', params: { sessionId: session.id } }, 'popup')
      },
      'tomation-test-started': async (params: any) => {
        const { action } = params
        const testRun = await testrunHandlers[TestRunCmd.TestStarted]({
          tabId,
          testId: action.description,
          action,
        })
        sendMessage('background-to-popup', { cmd: 'tomation-test-started', params: { testRun: testRunToJSON(testRun) } }, 'popup')
      },
      'tomation-action-update': async (params: any) => {
        console.log('[tomation-webext][background] action-update received in background:', params)
        try {
          await testrunHandlers[TestRunCmd.ActionUpdate]({
            tabId,
            action: params.action,
          })
          sendMessage('background-to-popup', { cmd: 'tomation-action-update', params }, 'popup')
        }
        catch (err) {
          console.error('[tomation-webext][background] Failed to send action-update message to popup', err)
        }
      },
      'tomation-test-stop': async () => {
        console.log('[tomation-webext][background] Test stopped')
        await testrunHandlers[TestRunCmd.TestStop]({
          tabId,
        })
        // await TomationStorage.view.setValue(VIEWS.MAIN)
      },
      'tomation-save-value': async (params: any) => {
        console.log('[tomation-webext][background] save-value', params)
        /* const memory = await TomationStorage.memory.getValue()
        memory[params.memorySlotName] = params.value
        await TomationStorage.memory.setValue(memory)
        */
      },
      'tomation-read-memory': async (params: any) => {
        console.log('[tomation-webext][background] read-memory', params)
        // const activeTab = (await useActiveTab().getActiveTab()).destination
        // const memory = await TomationStorage.memory.getValue()
        // sendMessage('read-memory-response', memory[params.memorySlotName], activeTab)
      },
      'tomation-clear-tests': async (params: any) => {
        console.log('[tomation-webext][background] clear-tests', params)
        const session = getTomationSessionByTabId(tabId!)
        if (!session) {
          console.warn(`[tomation-webext][background] No session found for tabId ${tabId} while trying to clear tests`)
          return
        }
        clearTomationSessionTests(tabId!)
        sendMessage('background-to-popup', { cmd: 'tomation-clear-tests', params: { sessionId: session.id } }, 'popup')
      },
      'tomation-register-test': async (params: any) => {
        console.log('[tomation-webext][background] register-test', params)
        const session = getTomationSessionByTabId(tabId!)
        if (!session) {
          console.warn(`[tomation-webext][background] No session found for tabId ${tabId} while trying to register test`)
          return
        }
        const { id, action } = params
        if (!id) {
          console.warn('[tomation-webext][background] Missing parameters for register-test command', params)
          throw new Error(`Missing parameters for register-test command. Params = ${JSON.stringify(params)} `)
        }
        // get test run and avoid registering test if test run is running
        const testRun = await testrunHandlers[TestRunCmd.GetByTabId]({ tabId })
        if (testRun && testRun.status === 'running') {
          console.warn('[tomation-webext][background] Test run is already running. Cannot register new test.', params)
          return
        }
        try {
          registerTestForSessionByTabId(tabId, id)
          sendMessage('background-to-popup', { cmd: 'tomation-register-test', params: { sessionId: session.id, id } }, 'popup')
        }
        catch (err) {
          console.error('[tomation-webext][background] Error registering test for session', err)
          throw err
        }
      },
      'tomation-tests-loaded': async (params: any) => {
        console.log('[tomation-webext][background] test-loaded', params)
        const session = getTomationSessionByTabId(tabId!)
        if (!session) {
          console.warn(`[tomation-webext][background] No session found for tabId ${tabId} while trying to clear tests`)
          return
        }
        updateSession(session.id, { testsLoaded: true })
        sendMessage('background-to-popup', { cmd: 'tomation-test-loaded', params }, 'popup')
      },
      'tomation-test-passed': async (params: any) => {
        await testrunHandlers[TestRunCmd.TestPassed]({
          tabId,
        })
        sendMessage('background-to-popup', { cmd: 'tomation-test-passed', params }, 'popup')
      },
      'tomation-test-failed': async (params: any) => {
        await testrunHandlers[TestRunCmd.TestFailed]({
          tabId,
        })
        sendMessage('background-to-popup', { cmd: 'tomation-test-failed', params }, 'popup')
      },
      'tomation-test-end': async (params: any) => {
        await testrunHandlers[TestRunCmd.TestEnd]({
          tabId,
        })
        sendMessage('background-to-popup', { cmd: 'tomation-test-end', params }, 'popup')
      },
      'tomation-test-pause': async (params: any) => {
        await testrunHandlers[TestRunCmd.TestPause]({
          tabId,
        })
        sendMessage('background-to-popup', { cmd: 'tomation-test-pause', params }, 'popup')
      },
      'tomation-test-play': async (params: any) => {
        await testrunHandlers[TestRunCmd.TestPlay]({
          tabId,
        })
        sendMessage('background-to-popup', { cmd: 'tomation-test-play', params }, 'popup')
      },
      'tomation-url-mismatch': (params: any) => {
        console.warn(`[tomation-webext][background] URL mismatch detected in content script. Message = `, params)
        const session = getTomationSessionByTabId(tabId!)
        if (!session) {
          console.warn(`[tomation-webext][background] No session found for tabId ${tabId} while trying to set session as connected`)
          return
        }
        setTomationSessionURLMismatch(session.id)
        sendMessage('background-to-popup', { cmd: 'tomation-url-mismatch', params }, 'popup')
      },
    }

    if (commands[cmd]) {
      return await commands[cmd](paramsWithTabId)
    }
    else {
      console.warn(`[tomation-webext][background] Unknown cmd received from content script: ${cmd}`, params)
    }

    // return something serializable
    return { ok: true }
  })

  onMessage('options-to-background', async ({ data }) => {
    const { cmd, params } = (data as any) || {}
    const handlers = {
      ...workspaceHandlers,
      ...tomationSessionHandlers,
      ...testrunHandlers,
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
      ...tomationSessionHandlers,
      ...testrunHandlers,
      'close-test-viewer': async (params: any) => {
        console.log('[tomation-webext][background] close-test-viewer received from side panel:', params)
        const { sessionId, tabId } = params
        const session = getTomationSessionByTabId(tabId)
        if (!session || session.id !== sessionId) {
          console.warn(`[tomation-webext][background] No session found for tabId ${tabId} and sessionId ${sessionId} while trying to close test viewer`)
          return
        }
        testrunHandlers[TestRunCmd.ClearTestRun]({
          tabId,
        })
      },
    }
    const handler = (handlers as any)[cmd]
    if (!handler)
      throw new Error(`Unknown command: ${cmd}`)
    return handler(params)
  })

  // --------------------------------
  console.log('Running background...')

  /*
  async function extractActions(action: any) {
    if (action.steps) {
      action.steps.forEach((action: any) => extractActions(action))
    }
    const actionsById = await TomationStorage.actionsById.getValue() as Record<string, any>
    actionsById[action.id] = action
    await TomationStorage.actionsById.setValue(actionsById)
  }
  */

  onMessage('popup-to-background', ({ data }) => {
    const { cmd, params } = (data as any) || {}
    console.log('[tomation-webext][background] received popup-to-background message:', cmd, params)

    const commands: Record<string, (params?: any) => void> = {
      'close-run-view': async () => {
        console.log('Task viewer closed (popup request)!')
        // await TomationStorage.view.setValue(VIEWS.MAIN)
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
