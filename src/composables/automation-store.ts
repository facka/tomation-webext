import type { Workspace } from '@/logic/workspace/workspace.types'
import type { TestRun } from '@/runtime/testrun/testrun.types'
import type { TomationSession } from '@/runtime/tomation-session/tomation-session.types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
// import { sendChunkedMessage } from 'ext-send-chunked-message'
import { VIEWS } from '~/logic/views'

const DEFAULT_SESSION: TomationSession = {
  id: 'UNKNOWN_SESSION',
  workspaceId: '',
  tabId: -1,
  connected: false,
  automatedTests: {},
  testsLoaded: false,
}

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
  const tomationSession = ref<TomationSession>({ ...DEFAULT_SESSION })

  const testRun = ref<TestRun | null>(null)
  const isLoading = ref(true)
  const activeTabId = ref<any>(null)
  const workspace = ref<Workspace | null>(null)
  const currentTabHost = ref<string>('')
  const currentSelectedTest = ref<any>(null)

  function resetSession() {
    tomationSession.value = { ...DEFAULT_SESSION }
  }

  function setActiveTabId(tabId: number | null) {
    activeTabId.value = tabId
    if (tabId != null) {
      isLoading.value = tabsInfoById.value[tabId]?.status === 'loading' && testRun.value?.status !== 'running'
    }
  }

  function setCurrentTabHost(host: string) {
    currentTabHost.value = host
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading
  }

  function setWorkspace(newWorkspace: Workspace | null) {
    workspace.value = newWorkspace
  }

  function setTomationSession(session: TomationSession | null) {
    tomationSession.value = session
      ? { ...session, automatedTests: session.automatedTests ?? {} }
      : { ...DEFAULT_SESSION }
  }

  function setTestRun(newTestRun: any) {
    if (!newTestRun) {
      testRun.value = null
      return
    }

    if (newTestRun.actionsById) {
      newTestRun.actionsById = new Map(Object.entries(newTestRun.actionsById))
    }

    testRun.value = newTestRun as unknown as TestRun
  }

  function setTestStatus(status: string) {
    if (testRun.value) {
      testRun.value.status = status as any
    }
  }

  function setTabInfo(tabId: number, info: { status: string, url: string }) {
    tabsInfoById.value[tabId] = info
    if (activeTabId.value === tabId) {
      isLoading.value = info.status === 'loading' && testRun.value?.status !== 'running'
    }
  }

  function setTestEndedNow() {
    if (testRun.value) {
      testRun.value.endedAt = Date.now()
    }
  }

  function updateCurrentAction(action: any) {
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
  }

  function setSessionConnected(connected: boolean) {
    tomationSession.value.connected = connected
  }

  function setUrlMismatch(matches: string, url: string) {
    mismatchUrl.value = url
    expectedUrlMatch.value = matches
  }

  function clearUrlMismatch() {
    mismatchUrl.value = ''
    expectedUrlMatch.value = ''
  }

  function registerAutomatedTest(id: string) {
    tomationSession.value.automatedTests[id] = id
  }

  function clearAutomatedTests() {
    tomationSession.value.automatedTests = {}
  }

  function setTestsLoaded(loaded: boolean) {
    tomationSession.value.testsLoaded = loaded
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

  function closeTestViewer() {
    testRun.value = null
    currentActionId.value = null
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
    currentTabHost,
    setLoading,
    setActiveTabId,
    setCurrentTabHost,
    resetSession,
    setWorkspace,
    setTomationSession,
    setTestRun,
    setTestStatus,
    setTestEndedNow,
    updateCurrentAction,
    setSessionConnected,
    setUrlMismatch,
    clearUrlMismatch,
    registerAutomatedTest,
    clearAutomatedTests,
    setTestsLoaded,
    activeTabId,
    currentSelectedTest,
    goTo,
    setTabInfo,
    getTestRun,
    openTest,
    closeTestViewer,
  }
})
