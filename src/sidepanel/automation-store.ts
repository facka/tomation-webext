import { onMessage } from 'webext-bridge/popup'
import { defineStore } from 'pinia'
import { ref } from 'vue'
// import { sendChunkedMessage } from 'ext-send-chunked-message'

export const useAutomationStore = defineStore('automationStore', () => {
  const dataError = ref(false)
  const initialAction: any = ref({})
  const actionsById: any = ref({})
  const view = ref('MAIN')
  const viewParams = ref({})

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

  function goTo(viewName: string, params?: any) {
    view.value = viewName
    viewParams.value = params
  }

  console.log('Setting up message listeners in automation store...')
  onMessage('tomation-test-started', ({ data }: any) => {
    initialAction.value = data.action
    extractActions(initialAction.value)
  })

  onMessage('tomation-action-update', ({ data }: any) => {
    const action = actionsById.value[data.action.id]
    if (!action) {
      actionsById.value[data.action.id] = data.action
    }
    else {
      action.status = data.action.status
      action.error = data.action.error
      action.value = data.action.context
      action.tries = data.action.tries
    }
  })

  return {
    dataError,
    initialAction,
    view,
    viewParams,
    getActionById,
    setData,
    goTo,
  }
})
