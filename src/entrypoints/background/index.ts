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
import { updateSession } from '@/runtime/tomation-session/tomation-session.store'

const USE_SIDE_PANEL = true

browser.runtime.onStartup.addListener(async () => {
  console.log("Service Worker has started.");
});

browser.runtime.onSuspend.addListener(() => {
  console.log("Service Worker is being suspended.");
});

export default defineBackground(() => {
  setupBackgroundEnvironment()
  registerBrowserEventHandlers()
  registerMessageHandlers()

  console.log('Running background...')
})

function setupBackgroundEnvironment() {
  console.log('Hello background!', { id: browser.runtime.id })

  // to toggle the sidepanel with the action button in chromium:
  if (USE_SIDE_PANEL) {
    browser.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error: unknown) => console.error(error))
  }

  browser.runtime.onInstalled.addListener((): void => {
    console.log('Extension installed')
  })
}

function registerBrowserEventHandlers() {
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (!changeInfo.status || changeInfo.status !== 'complete') {
      return
    }

    sendTabUpdateToPopup(tabId)
  })

  browser.tabs.onActivated.addListener(({ tabId }) => {
    sendTabUpdateToPopup(tabId)
  })

  browser.tabs.onRemoved.addListener((tabId) => {
    clearTomationSession(tabId)
  })
}

function registerMessageHandlers() {
  registerContentToBackgroundHandler()
  registerOptionsToBackgroundHandler()
  registerSidepanelToBackgroundHandler()
  registerPopupToBackgroundHandler()
}

async function sendMessageToPopup(cmd: string, params?: any) {
  try {
    const contexts = await browser.runtime.getContexts({
      contextTypes: ['POPUP', 'SIDE_PANEL'] // or 'OPTIONS_PAGE'
    });
    console.log(`[tomation-webext][background] Extension Popup Views = ${contexts.length}`, { contexts })
    const popupOpen = contexts.length > 0
    if (popupOpen) {
      await sendMessage('background-to-popup', { cmd, params }, 'popup')
    }
  }
  catch (err) {
    console.error('[tomation-webext][background] Failed to send message to popup', err)
  }
}

async function sendTabUpdateToPopup(tabId: number) {
  try {
    const tab = await browser.tabs.get(tabId)
    if (tab && tab.active) {
      await sendMessageToPopup('tomationwebext-tab-updated',
        { 
          tabId, 
          status: tab.status,
          tabUrl: tab.url
        } as any,
      )
    }
  }
  catch (err) {
    console.warn('[tomation-webext][background] Failed to send tab update message to popup', err)
  }
}

function registerContentToBackgroundHandler() {
  onMessage('content-to-background', async ({ data, sender }) => {
    const { cmd, params } = (data as any) || {}
    const { tabId } = sender
    const paramsWithTabId = { ...params, tabId }

    const commands: Record<string, (params?: any) => void> = {
      'get-workspace': async (payload: any) => {
        const { url } = payload
        const host = new URL(url ?? '').host
        try {
          const workspace = await workspaceHandlers[WorkspaceCmd.GetForHost]({ host: host ?? '' })
          return workspace
        }
        catch (err) {
          console.error('[tomation-webext][background] Failed to get workspace for host:', host, err)
        }
      },
      'tomation-session-init': async () => {
        console.log('[tomation-webext][background] Session init received from content script:', params)
        const tab = await browser.tabs.get(tabId!)

        const host = new URL(tab?.url ?? '').host
        const workspace = await workspaceHandlers[WorkspaceCmd.GetForHost]({ host: host ?? '' })

        if (tab && workspace) {
          const tomationSession = createTomationSession(workspace.id, tab.id as number)
          console.log(`[tomation-webext][background] Created session with id ${tomationSession.id} for workspace ${workspace.name} in tab ${tab.id}`)
          await sendMessageToPopup('tomation-session-created', tomationSession)
        }
        else {
          throw new Error(`Cannot initialize session: tab or workspace not found. tabId = ${tabId}, host = ${host}`)
        }
      },
      'tomation-session-connected': async () => {
        console.log('[tomation-webext][background] Session connected received from content script:', params)
        const session = getTomationSessionByTabId(tabId!)
        if (!session) {
          console.warn(`[tomation-webext][background] No session found for tabId ${tabId} while trying to set session as connected`)
          return
        }
        setTomationSessionConnected(session.id)
        await sendMessageToPopup('tomation-session-connected', { sessionId: session.id })
      },
      'tomation-test-started': async (payload: any) => {
        const { action } = payload
        const testRun = await testrunHandlers[TestRunCmd.TestStarted]({
          tabId,
          testId: action.description,
          action,
        })
        await sendMessageToPopup('tomation-test-started', { testRun: testRunToJSON(testRun) })
      },
      'tomation-action-update': async (payload: any) => {
        console.log('[tomation-webext][background] action-update received in background:', payload)
        try {
          await testrunHandlers[TestRunCmd.ActionUpdate]({
            tabId,
            action: payload.action,
          })
          await sendMessageToPopup('tomation-action-update', payload)
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
      },
      'tomation-save-value': async (payload: any) => {
        console.log('[tomation-webext][background] save-value', payload)
      },
      'tomation-read-memory': async (payload: any) => {
        console.log('[tomation-webext][background] read-memory', payload)
      },
      'tomation-clear-tests': async () => {
        console.log('[tomation-webext][background] clear-tests', params)
        const session = getTomationSessionByTabId(tabId!)
        if (!session) {
          console.warn(`[tomation-webext][background] No session found for tabId ${tabId} while trying to clear tests`)
          return
        }
        clearTomationSessionTests(tabId!)
        await sendMessageToPopup('tomation-clear-tests', { sessionId: session.id })
      },
      'tomation-register-test': async (payload: any) => {
        console.log('[tomation-webext][background] register-test', payload)
        const session = getTomationSessionByTabId(tabId!)
        if (!session) {
          console.warn(`[tomation-webext][background] No session found for tabId ${tabId} while trying to register test`)
          return
        }
        const { id } = payload
        if (!id) {
          console.warn('[tomation-webext][background] Missing parameters for register-test command', payload)
          throw new Error(`Missing parameters for register-test command. Params = ${JSON.stringify(payload)} `)
        }

        const testRun = await testrunHandlers[TestRunCmd.GetByTabId]({ tabId })
        if (testRun && testRun.status === 'running') {
          console.warn('[tomation-webext][background] Test run is already running. Cannot register new test.', payload)
          return
        }

        try {
          registerTestForSessionByTabId(tabId, id)
          await sendMessageToPopup('tomation-register-test', { sessionId: session.id, id })
        }
        catch (err) {
          console.error('[tomation-webext][background] Error registering test for session', err)
          throw err
        }
      },
      'tomation-tests-loaded': async (payload: any) => {
        console.log('[tomation-webext][background] test-loaded', payload)
        const session = getTomationSessionByTabId(tabId!)
        if (!session) {
          console.warn(`[tomation-webext][background] No session found for tabId ${tabId} while trying to clear tests`)
          return
        }
        updateSession(session.id, { testsLoaded: true })
        await sendMessageToPopup('tomation-test-loaded', payload)
      },
      'tomation-test-passed': async (payload: any) => {
        await testrunHandlers[TestRunCmd.TestPassed]({
          tabId,
        })
        await sendMessageToPopup('tomation-test-passed', payload)
      },
      'tomation-test-failed': async (payload: any) => {
        await testrunHandlers[TestRunCmd.TestFailed]({
          tabId,
        })
        await sendMessageToPopup('tomation-test-failed', payload)
      },
      'tomation-test-end': async (payload: any) => {
        await testrunHandlers[TestRunCmd.TestEnd]({
          tabId,
        })
        await sendMessageToPopup('tomation-test-end', payload)
      },
      'tomation-test-pause': async (payload: any) => {
        await testrunHandlers[TestRunCmd.TestPause]({
          tabId,
        })
        await sendMessageToPopup('tomation-test-pause', payload)
      },
      'tomation-test-play': async (payload: any) => {
        await testrunHandlers[TestRunCmd.TestPlay]({
          tabId,
        })
        await sendMessageToPopup('tomation-test-play', payload)
      },
      'tomation-url-mismatch': async (payload: any) => {
        console.warn(`[tomation-webext][background] URL mismatch detected in content script. Message = `, payload)
        const session = getTomationSessionByTabId(tabId!)
        if (!session) {
          console.warn(`[tomation-webext][background] No session found for tabId ${tabId} while trying to set session as connected`)
          return
        }
        setTomationSessionURLMismatch(session.id)
        await sendMessageToPopup('tomation-url-mismatch', payload)
      },
    }

    if (commands[cmd]) {
      return await commands[cmd](paramsWithTabId)
    }

    console.warn(`[tomation-webext][background] Unknown cmd received from content script: ${cmd}`, params)

    return { ok: true }
  })
}

function registerOptionsToBackgroundHandler() {
  onMessage('options-to-background', async ({ data }) => {
    const { cmd, params } = (data as any) || {}

    return runSharedBackgroundCommand(cmd, params)
  })
}

function registerSidepanelToBackgroundHandler() {
  onMessage('sidepanel-to-background', async ({ data }) => {
    const { cmd, params } = (data as any) || {}

    if (cmd === 'close-test-viewer') {
      return handleCloseTestViewer(params)
    }

    return runSharedBackgroundCommand(cmd, params)
  })
}

function registerPopupToBackgroundHandler() {
  onMessage('popup-to-background', ({ data }) => {
    const { cmd, params } = (data as any) || {}

    if (cmd === 'close-run-view') {
      console.log('Task viewer closed (popup request)!')
    }

    return runSharedBackgroundCommand(cmd, params)
  })
}

function runSharedBackgroundCommand(cmd: string, params: any) {
  const handlers = {
    ...workspaceHandlers,
    ...tomationSessionHandlers,
    ...testrunHandlers,
  }

  const handler = (handlers as any)[cmd]
  if (!handler) {
    throw new Error(`Unknown command: ${cmd}`)
  }

  try {
    return handler(params)
  }
  catch (err) {
    console.error(`[tomation-webext][background] Error running command ${cmd} with params ${JSON.stringify(params)}`, err)
    throw err
  }
}

async function handleCloseTestViewer(params: any) {
  console.log('[tomation-webext][background] close-test-viewer received from side panel:', params)
  const { sessionId, tabId } = params
  const session = getTomationSessionByTabId(tabId)
  if (!session || session.id !== sessionId) {
    console.warn(`[tomation-webext][background] No session found for tabId ${tabId} and sessionId ${sessionId} while trying to close test viewer`)
    return
  }

  return testrunHandlers[TestRunCmd.ClearTestRun]({
    tabId,
  })
}
