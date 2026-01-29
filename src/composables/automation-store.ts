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
    if (prop === 'view') {
      console.error(`Updating view to:`, newVal)
    }
    if (newVal) { // Looks like sometimes newVal is null when localStorage is empty, so we skip this null value
      reference.value = newVal
    }
  })

  return reference
}

export const useAutomationStore = defineStore('automationStore', () => {
  const dataError = ref(false)
  const initialAction: any = ref({})
  const currentActionId: any = ref({})
  const actionsById = loadStoredValue<any>('actionsById', {})
  const view = loadStoredValue<VIEWS>('view', VIEWS.MAIN)
  const viewParams = ref({})
  const testStatus = ref('idle') // idle, running, paused, stopped
  const tabStatus: any = ref({}) // tabId -> status
  const automatedTests = loadStoredValue<Record<string, any>>('automatedTests', {})
  const scriptURL = loadStoredValue<string>('scriptURL', '') // URL of the automation script being executed
  const history = ref<Array<object>>([])

  function setTabStatus(tabId: number, status: string) {
    tabStatus.value[tabId] = status
  }

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

  function setData(data: any) {
    console.log('Store.setData(): Automated Tests: ', data.automatedTests)
    automatedTests.value = data.automatedTests
    actionsById.value = data.actionsById
  }

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
      'tomation-test-started': ({ action }: any) => {
        initialAction.value = action
        extractActions(initialAction.value)
        testStatus.value = 'running'
      },
      'tomation-action-update': ({ action }: any) => {
        const existingAction = actionsById.value[action.id]
        if (!existingAction) {
          actionsById.value[action.id] = action
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
        testStatus.value = 'paused'
      },
      'tomation-test-play': () => {
        testStatus.value = 'running'
      },
      'tomationwebext-tab-status-updated': ({ tabId, status }: any) => {
        setTabStatus(tabId, status)
      },
      'set-script-url': ({ url }: any) => {
        scriptURL.value = url
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
    automatedTests,
    initialAction,
    currentActionId,
    view,
    viewParams,
    testStatus,
    tabStatus,
    scriptURL,
    history,
    getActionById,
    setData,
    goTo,
    setTabStatus,
  }
})
