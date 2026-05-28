import type { Workspace } from '@/logic/workspace/workspace.types'
import type { TestRun } from '@/runtime/testrun/testrun.types'
import type { TomationSession } from '@/runtime/tomation-session/tomation-session.types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createUIAdapter } from '@/messaging'
import { WorkspaceCmd } from '@/logic/workspace/workspace.handlers'
import { TestRunCmd } from '@/runtime/testrun/testrun.handlers'
import { TomationSessionCmd } from '@/runtime/tomation-session/tomation-session.handlers'
// import { sendChunkedMessage } from 'ext-send-chunked-message'
import { VIEWS } from '~/logic/views'

const messaging = createUIAdapter()

export const useAutomationStore = defineStore('automationStore', () => {
  const dataError = ref(false)
  // const initialAction: any = ref({})
  const currentActionId: any = ref({})
  // const actionsById = loadStoredValue<any>('actionsById', {})
  const view = ref(VIEWS.MAIN)
  const viewParams = ref({})
  // const testStatus = ref('idle') // idle, running, paused, stopped
  const tabsInfoById: Ref<Record<number, any>> = ref({}) // tabId -> { status, url, ... }
  // const automatedTests = loadStoredValue<Record<string, any>>('automatedTests', {})
  const history = ref<Array<object>>([])
  const expectedUrlMatch = ref<string>('')
  const mismatchUrl = ref<string>('')
  const tomationSession = ref<TomationSession>({
    id: 'UNKNOWN_SESSION',
    workspaceId: '',
    tabId: -1,
    connected: false,
    automatedTests: {},
    testsLoaded: false,
  })

  const testRun = ref<TestRun | null>(null)
  const isLoading = ref(true)
  const activeTabId = ref<any>(null)
  const workspace = ref<Workspace | null>(null)
  const currentTabHost = ref<string>('')
  const currentSelectedTest = ref<any>(null)

  async function updateActiveTabId() {
    const res = await useActiveTab().getActiveTab()
    activeTabId.value = res?.tab?.id ?? null
    isLoading.value = activeTabId.value != null && tabsInfoById.value[activeTabId.value]?.status === 'loading' && testRun.value?.status !== 'running'
  }

  // Keep isLoading updated when tabInfo changes
  watch(
    () => tabsInfoById.value,
    () => {
      if (activeTabId.value != null) {
        isLoading.value = tabsInfoById.value[activeTabId.value]?.status === 'loading' && testRun.value?.status !== 'running'
        initializeStore()
      }
    },
    { deep: true },
  )

  async function initializeStore() {
    console.log('Initializing automation store...')
    updateActiveTabId()
    const { tab } = await useActiveTab().getActiveTab()
    const url = tab.url
    // extract host from url
    currentTabHost.value = url ? new URL(url).host : ''
    const existentWorkspace: Workspace | null = await messaging.sendMessage('sidepanel-to-background', {
      cmd: WorkspaceCmd.GetForHost,
      params: { host: currentTabHost.value },
    }, 'background')
    workspace.value = existentWorkspace
    if (existentWorkspace) {
      const existentSession: TomationSession = await messaging.sendMessage('sidepanel-to-background', {
        cmd: TomationSessionCmd.GetByTabId,
        params: { tabId: tab.id },
      }, 'background')
      tomationSession.value = existentSession
      // get test run for this tab if session exists
      if (existentSession) {
        const existentTestRun = await messaging.sendMessage('sidepanel-to-background', {
          cmd: TestRunCmd.GetByTabId,
          params: { tabId: tab.id },
        }, 'background') as any
        // convert json prop actionsById to map
        if (existentTestRun && existentTestRun.actionsById) {
          existentTestRun.actionsById = new Map(Object.entries(existentTestRun.actionsById))
        }

        // TODO here is when actionsIds are renewed from the new script loaded in the content script

        testRun.value = existentTestRun as unknown as TestRun
        console.log('Existing session found for tab. Session:', existentSession, 'Test run:', existentTestRun)
        if (existentTestRun && existentTestRun.status === 'running') {
          goTo(VIEWS.VIEWER)
        }
      }
    }

    isLoading.value = false
  }

  function setTabInfo(tabId: number, info: { status: string, url: string }) {
    tabsInfoById.value[tabId] = info
  }
  /*
  function extractActions(action: any) {
    if (action.steps) {
      action.steps.forEach((action: any) => extractActions(action))
      actionsById.value[action.id] = action
    }
    else {
      actionsById.value[action.id] = action
    }
  }

  function getActionById(actionId: string) {
    return actionsById.value[actionId]
  }
  */
  function getTestRun(tabId: number): TestRun | null {
    if (!tomationSession.value || tomationSession.value.tabId !== tabId) {
      console.warn(`No session found for tabId ${tabId}. Cannot get test run.`)
      return null
    }
    console.log(`Getting test run for session ${tomationSession.value.id} and tabId ${tabId}:`, testRun.value)
    return testRun.value
  }

  function setWorkspace(newWorkspace: Workspace) {
    console.log('Setting workspace in store:', newWorkspace)
    workspace.value = newWorkspace
  }

  function closeTestViewer() {
    testRun.value = null
    currentActionId.value = null
    messaging.sendMessage('sidepanel-to-background', {
      cmd: 'close-test-viewer',
      params: {
        sessionId: tomationSession.value.id,
        tabId: tomationSession.value.tabId,
      },
    }, 'background')
    goTo(VIEWS.MAIN)
  }

  // refreshData()

  function goTo(viewName: VIEWS, params?: any) {
    view.value = viewName
    viewParams.value = params
  }

  function openTest(testId: string) {
    currentSelectedTest.value = tomationSession.value && tomationSession.value.automatedTests[testId] && (tomationSession.value.automatedTests[testId])
    goTo(VIEWS.TEST, { testId })
  }

  console.log('Setting up message listeners in automation store...')

  messaging.onMessage('background-to-popup', ({ data }: any) => {
    const { cmd, params } = data || {}
    console.log('[tomation-webext][popup] received background-to-popup message:', cmd, params)

    const commands: Record<string, (params?: any) => void> = {
      'tomation-test-started': (params: any) => {
        const newTestRun = params.testRun
        // initialAction.value = action
        // extractActions(initialAction.value)
        // testRun.value && (testRun.value.status = 'running')
        console.log(`[tomation-webext][popup] Test started with test run:`, newTestRun)
        if (newTestRun && newTestRun.actionsById) {
          newTestRun.actionsById = new Map(Object.entries(newTestRun.actionsById))
        }
        testRun.value = newTestRun as unknown as TestRun
        goTo(VIEWS.VIEWER)
      },
      'tomation-test-passed': () => {
        testRun.value && (testRun.value.status = 'passed')
      },
      'tomation-test-failed': () => {
        testRun.value && (testRun.value.status = 'failed')
      },
      'tomation-test-end': () => {
        testRun.value && (testRun.value.endedAt = Date.now())
      },
      'tomation-action-update': ({ action }: any) => {
        console.log(`[tomation-webext][popup] Received action update for action ${action.id}:`, action)
        console.log('Current test run before update:', testRun.value)
        const existingAction = testRun.value?.actionsById.get(action.id)
        console.log('Existing action in test run:', existingAction)
        if (!existingAction) {
          testRun.value?.actionsById.set(action.id, action)
        }
        else {
          existingAction.status = action.status
          existingAction.error = action.error
          existingAction.value = action.context
          existingAction.tries = action.tries
        }
        currentActionId.value = action.id
      },
      'tomation-test-pause': () => {
        testRun.value && (testRun.value.status = 'paused')
      },
      'tomation-test-play': () => {
        testRun.value && (testRun.value.status = 'running')
      },
      'tomationwebext-tab-updated': ({ tabId, status, tabUrl }: any) => {
        setTabInfo(tabId, { status, url: tabUrl })
      },
      'tomation-session-created': (params: any) => {
        const newTomationSession = params
        tomationSession.value = newTomationSession
        console.log(`[tomation-webext][popup] Session initialized with session:`, tomationSession.value)
        mismatchUrl.value = ''
        expectedUrlMatch.value = ''
        // Optionally, you can store the sessionId in the store if needed for future use
      },
      'tomation-session-connected': ({ sessionId }: any) => {
        tomationSession.value.connected = true
        console.log(`[tomation-webext][popup] Session ${sessionId} is now connected`)
      },
      'tomation-url-mismatch': ({ matches, url }: any) => {
        console.warn(`[tomation-webext][popup] URL mismatch detected. Expected: ${matches}, Actual: ${url}`)
        // Optionally, you can set some state here to show a warning in the UI about the URL mismatch
        mismatchUrl.value = url
        expectedUrlMatch.value = matches
      },
      'tomation-register-test': ({ sessionId, id }: any) => {
        tomationSession.value.automatedTests[id] = id
        console.log(`[tomation-webext][popup] Registered test ${id} for session ${sessionId}`)
      },
      'tomation-clear-tests': ({ sessionId }: any) => {
        console.log(`[tomation-webext][popup] Received clear tests event for session ${sessionId}`)
        console.log('Current session before clearing tests:', tomationSession.value.id)
        tomationSession.value.automatedTests = {}
        console.log(`[tomation-webext][popup] Cleared tests for session ${sessionId}`)
      },
      'tomation-test-loaded': ({ sessionId }: any) => {
        console.log(`[tomation-webext][popup] Received test loaded event for session ${sessionId}`)
        console.log('Current session before setting testsLoaded to true:', tomationSession.value.id)
        tomationSession.value.testsLoaded = true
      },
    }

    if (commands[cmd]) {
      commands[cmd](params)
    }
    else {
      console.warn(`[tomation-webext][popup] Unknown cmd received from background: ${cmd}`, params)
    }
  })

  initializeStore()

  return {
    dataError,
    currentActionId,
    view,
    viewParams,
    tabsInfoById,
    history,
    isLoading,
    expectedUrlMatch,
    mismatchUrl,
    tomationSession,
    testRun,
    workspace,
    setWorkspace,
    activeTabId,
    currentSelectedTest,
    goTo,
    setTabInfo,
    getTestRun,
    openTest,
    closeTestViewer,
  }
})
