import { onMessage, sendMessage } from 'webext-bridge/popup'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { sendChunkedMessage } from 'ext-send-chunked-message'
import { useActiveTab } from '~/composables/useActiveTab'

export const useAutomationStore = defineStore('automationStore', () => {
  const loading = ref(true)
  const dataError = ref(false)
  const runningTask = ref(false)
  const closedRunView = ref(true)
  const initialAction: any = ref({})
  const actionsById: any = ref({})
  const automatedTests: any = ref({})
  const history: any = ref([])
  const view = ref('MAIN')
  const viewParams = ref({})

  function closeTaskExecutionViewer() {
    sendMessage('close-run-view', {}, 'background')
    closedRunView.value = true
    runningTask.value = false
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

  function getHistory() {
    return history.value
  }

  function clearHistory() {
    history.value.length = 0
  }

  function setData(data: any) {
    console.log('Store.setData(): Automated Tests: ', data.automatedTests)
    loading.value = false
    runningTask.value = data.runningTask
    closedRunView.value = data.closedRunView
    initialAction.value = data.initialAction
    actionsById.value = data.actionsById
    automatedTests.value = data.automatedTests
    history.value = data.history
  }

  async function getLargeDataFromBackground() {
    try {
      const largeData = await sendChunkedMessage('get-large-data')
      return largeData && JSON.parse(largeData)
    }
    catch (error) {
      console.error('Error fetching large data:', error)
      return null
    }
  }

  async function refreshData() {
    console.log('Refreshing data...')
    const data = await getLargeDataFromBackground()
    console.log('Data fetched:', data)
    if (data) {
      setData(data)
    }
    else {
      loading.value = false
      dataError.value = true
    }
  }

  refreshData()

  async function reloadTests() {
    console.log('Reload tests')
    const activeTab = (await useActiveTab().getActiveTab()).destination
    try {
      await sendMessage('reload-tests', {}, activeTab)
      await refreshData()
    }
    catch (error) {
      console.error('Error reloading tests:', error)
    }
  }

  function goTo(viewName: string, params?: any) {
    view.value = viewName
    viewParams.value = params
  }

  onMessage('start', ({ data }: any) => {
    runningTask.value = true
    closedRunView.value = false
    initialAction.value = data.action
    extractActions(initialAction.value)
  })

  onMessage('end', ({ data }: any) => {
    runningTask.value = false
    if (data.action.error.includes('Test stopped manually')) {
      closedRunView.value = true
    }
  })

  onMessage('action-update', ({ data }: any) => {
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

  onMessage('test-end', () => {
    refreshData()
  })

  onMessage('test-failed', () => {
    refreshData()
  })

  onMessage('test-passed', () => {
    refreshData()
  })

  onMessage('test-started', () => {
    refreshData()
  })

  onMessage('save-value', () => {
    // do nothing
  })

  onMessage('register-test', () => {
    // do nothing
  })

  return {
    loading,
    dataError,
    runningTask,
    closedRunView,
    initialAction,
    automatedTests,
    view,
    viewParams,
    closeTaskExecutionViewer,
    getActionById,
    getHistory,
    clearHistory,
    setData,
    goTo,
    refreshData,
    reloadTests,
  }
})
