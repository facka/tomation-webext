import type { Pinia } from 'pinia'
import type { Workspace } from '@/logic/workspace/workspace.types'
import type { TomationSession } from '@/runtime/tomation-session/tomation-session.types'
import { useAutomationStore } from '@/composables/automation-store'
import { useActiveTab } from '@/composables/useActiveTab'
import { WorkspaceCmd } from '@/logic/workspace/workspace.handlers'
import { TestRunCmd as TestRunCommands } from '@/runtime/testrun/testrun.handlers'
import { TomationSessionCmd } from '@/runtime/tomation-session/tomation-session.handlers'
import { VIEWS } from '~/logic/views'
import { initializeMessagingClient, onBackgroundToPopup, sendCommandToBackground } from './messaging.client'

let initialized = false
let unsubscribeBackgroundToPopup: (() => void) | null = null

/**
 * Registers sidepanel/popup messaging listeners exactly once per context.
 *
 * Idempotency prevents duplicate listeners when UI roots remount or when
 * bootstrap is accidentally called more than once.
 */
export function bootstrapMessaging(pinia: Pinia) {
  if (initialized) {
    return
  }

  console.log('[tomation-webext][ui] Bootstrapping messaging...')

  initialized = true
  const store = useAutomationStore(pinia)
  initializeMessagingClient()

  void hydrateInitialState(store)

  unsubscribeBackgroundToPopup = onBackgroundToPopup(({ data }: any) => {
    const { cmd, params } = data || {}

    const commands: Record<string, (payload?: any) => void> = {
      'tomation-test-started': (payload: any) => {
        store.setTestRun(payload?.testRun)
        store.goTo(VIEWS.VIEWER)
      },
      'tomation-test-passed': () => {
        store.setTestStatus('passed')
      },
      'tomation-test-failed': () => {
        store.setTestStatus('failed')
      },
      'tomation-test-end': () => {
        store.setTestEndedNow()
      },
      'tomation-action-update': (payload: any) => {
        if (payload?.action) {
          store.updateCurrentAction(payload.action)
        }
      },
      'tomation-test-pause': () => {
        store.setTestStatus('paused')
      },
      'tomation-test-play': () => {
        store.setTestStatus('running')
      },
      'tomationwebext-tab-updated': ({ tabId, status, tabUrl }: any) => {
        store.setTabInfo(tabId, { status, url: tabUrl })
      },
      'tomation-session-created': (payload: TomationSession) => {
        store.setTomationSession(payload)
        store.clearUrlMismatch()
      },
      'tomation-session-connected': () => {
        store.setSessionConnected(true)
      },
      'tomation-url-mismatch': ({ matches, url }: any) => {
        store.setUrlMismatch(matches, url)
      },
      'tomation-register-test': ({ id }: any) => {
        store.registerAutomatedTest(id)
      },
      'tomation-clear-tests': () => {
        store.clearAutomatedTests()
      },
      'tomation-test-loaded': () => {
        store.setTestsLoaded(true)
      },
    }

    if (commands[cmd]) {
      commands[cmd](params)
      return
    }

    console.warn(`[tomation-webext][ui] Unknown cmd received from background: ${cmd}`, params)
  })
}

export function teardownMessagingBootstrap() {
  unsubscribeBackgroundToPopup?.()
  unsubscribeBackgroundToPopup = null
  initialized = false
}

async function hydrateInitialState(store: ReturnType<typeof useAutomationStore>) {
  store.setLoading(true)

  try {
    const { tab } = await useActiveTab().getActiveTab()
    const tabId = tab?.id ?? null
    const tabUrl = tab?.url ?? ''
    const currentTabHost = tabUrl ? new URL(tabUrl).host : ''

    store.setActiveTabId(tabId)
    store.setCurrentTabHost(currentTabHost)

    if (!currentTabHost) {
      store.setWorkspace(null)
      store.resetSession()
      store.setTestRun(null)
      return
    }

    const existentWorkspace = await sendCommandToBackground(WorkspaceCmd.GetForHost, {
      host: currentTabHost,
    }) as Workspace | null
    store.setWorkspace(existentWorkspace)

    if (!existentWorkspace || typeof tab?.id !== 'number') {
      store.resetSession()
      store.setTestRun(null)
      return
    }

    const existentSession = await sendCommandToBackground(TomationSessionCmd.GetByTabId, {
      tabId: tab.id,
    }) as TomationSession | null
    store.setTomationSession(existentSession)

    if (!existentSession) {
      store.setTestRun(null)
      return
    }

    const existentTestRun = await sendCommandToBackground(TestRunCommands.GetByTabId, {
      tabId: tab.id,
    })

    store.setTestRun(existentTestRun)
    if ((existentTestRun as any)?.status === 'running') {
      store.goTo(VIEWS.VIEWER)
    }
  }
  catch (error) {
    console.error('[tomation-webext][ui] Failed to bootstrap initial messaging state', error)
    store.setWorkspace(null)
    store.resetSession()
    store.setTestRun(null)
  }
  finally {
    store.setLoading(false)
  }
}
