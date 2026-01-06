import { onMessage } from 'webext-bridge/popup'
import { defineStore } from 'pinia'
import { ref } from 'vue'
// import { sendChunkedMessage } from 'ext-send-chunked-message'
import { VIEWS } from '~/logic/views'

export const useAutomationStore = defineStore('automationStore', () => {
  const dataError = ref(false)
  const initialAction: any = ref({})
  const actionsById: any = ref({})
  const view = ref(VIEWS.MAIN)
  const viewParams = ref({})
  const testStatus = ref('idle') // idle, running, paused, stopped
  const tabStatus: any = ref({}) // tabId -> status

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
    initialAction,
    view,
    viewParams,
    testStatus,
    tabStatus,
    getActionById,
    setData,
    goTo,
    setTabStatus,
  }
})
