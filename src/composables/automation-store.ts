import type { Workspace } from '@/logic/workspace/workspace.types'
import type { TestRun } from '@/runtime/testrun/testrun.types'
import type { TomationSession } from '@/runtime/tomation-session/tomation-session.types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { onMessage, sendMessage } from 'webext-bridge/popup'
import { WorkspaceCmd } from '@/logic/workspace/workspace.handlers'
import { TestRunCmd } from '@/runtime/testrun/testrun.handlers'
import { TomationSessionCmd } from '@/runtime/tomation-session/tomation-session.handlers'
// import { sendChunkedMessage } from 'ext-send-chunked-message'
import { VIEWS } from '~/logic/views'

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
  })

  const testRun = ref<TestRun | null>(null)
  const isLoading = ref(true)
  const activeTabId = ref<any>(null)
  const workspace = ref<Workspace | null>(null)
  const currentTabHost = ref<string>('')

  initializeStore()

  async function updateActiveTabId() {
    const res = await useActiveTab().getActiveTab()
    activeTabId.value = res?.tab?.id ?? null
    isLoading.value = activeTabId.value != null && tabsInfoById.value[activeTabId.value]?.status === 'loading'
  }

  // Keep isLoading updated when tabInfo changes
  watch(
    () => tabsInfoById.value,
    () => {
      if (activeTabId.value != null) {
        isLoading.value = tabsInfoById.value[activeTabId.value]?.status === 'loading'
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
    const existentWorkspace: Workspace | null = await sendMessage('sidepanel-to-background', {
      cmd: WorkspaceCmd.GetForHost,
      params: { host: currentTabHost.value },
    }, 'background')
    workspace.value = existentWorkspace
    if (existentWorkspace) {
      const existentSession: TomationSession = await sendMessage('sidepanel-to-background', {
        cmd: TomationSessionCmd.GetByTabId,
        params: { tabId: tab.id },
      }, 'background')
      tomationSession.value = existentSession
      // get test run for this tab if session exists
      if (existentSession) {
        const existentTestRun = await sendMessage('sidepanel-to-background', {
          cmd: TestRunCmd.GetBySessionId,
          params: { sessionId: existentSession.id },
        }, 'background')
        testRun.value = existentTestRun as unknown as TestRun
        if (existentTestRun) {
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
  function getTomationSession() {
    return tomationSession.value
  }

  function getTestRun(tabId: number): TestRun | null {
    if (!tomationSession.value || tomationSession.value.tabId !== tabId) {
      console.warn(`No session found for tabId ${tabId}. Cannot get test run.`)
      return null
    }
    return testRun.value
  }

  /*
  function setData(data: any) {
    console.log('Store.setData(): Automated Tests: ', data.automatedTests)
    automatedTests.value = data.automatedTests
    actionsById.value = data.actionsById
  } */

  /*
  async function getLargeDataFromBackground() {
    try {
      const largeData = await sendChunkedMessage('get-large-data')
      return JSON.parse(largeData)
    }
    catch (error) {
      console.error('Error fetching large data:', error)
      return null
    }
  }
*/

  /*
  async function refreshData() {
    console.log('Refreshing data...')
    const data = await getLargeDataFromBackground()
    console.log('Data fetched:', data)
    if (data) {
      setData(data)
    }
    else {
      dataError.value = true
    }
  }
*/
  // refreshData()

  function goTo(viewName: VIEWS, params?: any) {
    view.value = viewName
    viewParams.value = params
  }

  console.log('Setting up message listeners in automation store...')

  onMessage('background-to-popup', ({ data }: any) => {
    const { cmd, params } = data || {}
    console.log('[tomation-webext][popup] received background-to-popup message:', cmd, params)

    const commands: Record<string, (params?: any) => void> = {
      'tomation-test-started': (params: any) => {
        testRun.value = params.testRun
        goTo(VIEWS.VIEWER)
        // initialAction.value = action
        // extractActions(initialAction.value)
        testRun.value && (testRun.value.status = 'running')
      },
      'tomation-action-update': ({ action }: any) => {
        const existingAction = testRun.value?.actionsById.get(action.id)
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
        console.log(`[tomation-webext][popup] Session initialized with session:`, tomationSession)
        mismatchUrl.value = ''
        expectedUrlMatch.value = ''
        // Optionally, you can store the sessionId in the store if needed for future use
      },
      'tomation-session-connected': ({ sessionId }: any) => {
        if (tomationSession.value?.id === sessionId) {
          tomationSession.value.connected = true
          console.log(`[tomation-webext][popup] Session ${sessionId} is now connected`)
        }
        else {
          console.warn(`[tomation-webext][popup] Received connection event for unknown sessionId ${sessionId}`)
        }
      },
      'tomation-url-mismatch': ({ matches, url }: any) => {
        console.warn(`[tomation-webext][popup] URL mismatch detected. Expected: ${matches}, Actual: ${url}`)
        // Optionally, you can set some state here to show a warning in the UI about the URL mismatch
        mismatchUrl.value = url
        expectedUrlMatch.value = matches
      },
      'tomation-register-test': ({ sessionId, id, action }: any) => {
        if (tomationSession.value.id === sessionId) {
          tomationSession.value.automatedTests[id] = {
            initialAction: action,
          }
          console.log(`[tomation-webext][popup] Registered test ${id} for session ${sessionId}`)
        }
        else {
          console.warn(`[tomation-webext][popup] Received register test event for unknown sessionId ${sessionId}`)
        }
      },
    }

    if (commands[cmd]) {
      commands[cmd](params)
    }
    else {
      console.warn(`[tomation-webext][popup] Unknown cmd received from background: ${cmd}`, params)
    }
  })

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
    activeTabId,
    goTo,
    setTabInfo,
    getTomationSession,
    getTestRun,
  }
})
