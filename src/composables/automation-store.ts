import type { TestRun } from '@/runtime/testrun/testrun.types'
import type { TomationSession } from '@/runtime/tomation-session/tomation-session.types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { onMessage } from 'webext-bridge/popup'
// import { sendChunkedMessage } from 'ext-send-chunked-message'
import { VIEWS } from '~/logic/views'

function loadStoredValue<T>(prop: string, defaultValue: T) {
  // It should create the vue ref load from useStoredValue and add watch logic to update the value
  const { state: storedValue } = useStoredValue<T>(`local:${prop}`, defaultValue)

  console.log(`Loaded stored value for ${prop}:`, storedValue.value)

  const reference = ref<T>(storedValue.value ?? defaultValue)

  // Watch for changes in storedValue and update value accordingly
  watch(storedValue, (newVal) => {
    console.log(`Stored value for ${prop} changed:`, newVal)
    if (newVal) { // Looks like sometimes newVal is null when localStorage is empty, so we skip this null value
      reference.value = newVal
    }
  }, {
    deep: true,
  })

  return reference
}

export const useAutomationStore = defineStore('automationStore', () => {
  const dataError = ref(false)
  // const initialAction: any = ref({})
  const currentActionId: any = ref({})
  // const actionsById = loadStoredValue<any>('actionsById', {})
  const view = loadStoredValue<VIEWS>('view', VIEWS.MAIN)
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
        if (tomationSession.value.id === sessionId) {
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
    goTo,
    setTabInfo,
    getTomationSession,
  }
})
