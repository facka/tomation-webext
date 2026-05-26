import { createBackgroundAdapter, logMessagingSystem } from '@/messaging'
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
const FORWARDED_UI_TO_CONTENT_COMMANDS = new Set([
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
  'setup-tests-request',
  'refresh-page',
])

// Create messaging adapter (switches between webext-bridge and new system based on feature flag)
const messaging = createBackgroundAdapter()

// Register message handlers synchronously at module top-level.
// This is intentionally OUTSIDE defineBackground so handlers are available
// the instant the service worker module evaluates — even before defineBackground
// runs — preventing the race where a content-script message arrives while the
// service worker is waking up from dormancy.
registerMessageHandlers()
console.log('[tomation-webext][background] Service worker module evaluated — message handlers registered.')

browser.runtime.onStartup.addListener(() => {
  console.log('[tomation-webext][background] onStartup fired — service worker started fresh.')
});

browser.runtime.onSuspend.addListener(() => {
  console.log('[tomation-webext][background] onSuspend fired — service worker is being terminated.')
});

export default defineBackground(() => {
  logMessagingSystem('background')
  setupBackgroundEnvironment()
  registerBrowserEventHandlers()

  console.log('[tomation-webext][background] defineBackground callback executed.')
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
    const popupOpen = contexts.length > 0
    if (popupOpen) {
      await messaging.sendMessage('background-to-popup', { cmd, params }, 'popup')
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
  messaging.onMessage('content-to-background', async ({ data, sender }) => {
    const { cmd, params } = (data as any) || {}
    const tabId = resolveSenderTabId(sender)
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
  messaging.onMessage('options-to-background', async ({ data }) => {
    const { cmd, params } = (data as any) || {}

    return runSharedBackgroundCommand(cmd, params)
  })
}

function registerSidepanelToBackgroundHandler() {
  messaging.onMessage('sidepanel-to-background', async ({ data }) => {
    const { cmd, params } = (data as any) || {}

    if (FORWARDED_UI_TO_CONTENT_COMMANDS.has(cmd)) {
      return forwardUiCommandToContentScript(cmd, params)
    }

    if (cmd === 'close-test-viewer') {
      return handleCloseTestViewer(params)
    }

    return runSharedBackgroundCommand(cmd, params)
  })
}

async function forwardUiCommandToContentScript(cmd: string, params: any) {
  const tabId = Number(params?.tabId)
  if (!Number.isInteger(tabId) || tabId <= 0) {
    throw new Error(`[tomation-webext][background] Missing valid tabId for UI->content command ${cmd}`)
  }

  const forwardedParams = { ...(params || {}) }
  delete (forwardedParams as any).tabId

  return messaging.sendMessage(
    'background-to-contentScript',
    {
      cmd,
      params: forwardedParams,
    },
    `content-script@${tabId}`,
  )
}

function registerPopupToBackgroundHandler() {
  messaging.onMessage('popup-to-background', ({ data }) => {
    const { cmd, params } = (data as any) || {}

    if (FORWARDED_UI_TO_CONTENT_COMMANDS.has(cmd)) {
      return forwardUiCommandToContentScript(cmd, params)
    }

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

function resolveSenderTabId(sender: any): number {
  const fromNativeSender = sender?.tab?.id
  const fromBridgeSender = sender?.tabId
  const tabId = typeof fromNativeSender === 'number'
    ? fromNativeSender
    : typeof fromBridgeSender === 'number'
      ? fromBridgeSender
      : undefined

  if (typeof tabId !== 'number' || Number.isNaN(tabId)) {
    throw new Error('[tomation-webext][background] Missing tab id in message sender. Expected sender.tab.id or sender.tabId.')
  }

  return tabId
}
