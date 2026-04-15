import type { TestRun } from './testrun.types'
import { createTestRun } from './testrun.model'
import { testrunStore } from './testrun.store'

export const TestRunCmd = {
  TestStarted: 'test-started',
  ActionUpdate: 'action-update',
  TestStop: 'test-stop',
  TestPassed: 'test-passed',
  TestFailed: 'test-failed',
  TestEnd: 'test-end',
  TestPause: 'test-pause',
  TestPlay: 'test-play',
  GetByTabId: 'get-by-tab-id',
} as const

export type TestRunCmdType = (typeof TestRunCmd)[keyof typeof TestRunCmd]

export type TestRunMessages = {
  [TestRunCmd.TestStarted]: {
    params: { tabId: number, testId: string, action: any }
    result: TestRun | null
  }

  [TestRunCmd.ActionUpdate]: {
    params: { action: any, tabId: number }
    result: TestRun | null
  }

  [TestRunCmd.TestStop]: {
    params: { tabId: number }
    result: TestRun | null
  }

  [TestRunCmd.TestPassed]: {
    params: { tabId: number }
    result: TestRun | null
  }

  [TestRunCmd.TestFailed]: {
    params: { tabId: number }
    result: TestRun | null
  }

  [TestRunCmd.TestEnd]: {
    params: { tabId: number }
    result: TestRun | null
  }

  [TestRunCmd.TestPause]: {
    params: { tabId: number }
    result: TestRun | null
  }

  [TestRunCmd.TestPlay]: {
    params: { tabId: number }
    result: TestRun | null
  }

  [TestRunCmd.GetByTabId]: {
    params: { tabId: number }
    result: TestRun | null
  }
}

type Handler<K extends TestRunCmdType> = (params: TestRunMessages[K]['params']) => Promise<TestRunMessages[K]['result']>

const handlers: { [K in TestRunCmdType]: Handler<K> } = {
  async [TestRunCmd.TestStarted](params) {
    const { tabId, testId, action } = params

    browser.action.setBadgeText({ text: 'ON' })
    browser.action.setBadgeBackgroundColor({ color: '#33BB33' })

    const testRun = createTestRun({
      tabId,
      testId,
      initialAction: action,
    })
    testrunStore.save(testRun)
    return testRun
  },

  async [TestRunCmd.ActionUpdate](params) {
    const { tabId, action } = params

    return testrunStore.updateAction(tabId, action)
  },

  async [TestRunCmd.TestStop](params) {
    const { tabId } = params
    browser.action.setBadgeText({ text: '' })
    return testrunStore.stopTestRun(tabId)
  },

  async [TestRunCmd.TestPassed](params) {
    const { tabId } = params
    return testrunStore.markTestPassed(tabId)
  },

  async [TestRunCmd.TestFailed](params) {
    const { tabId } = params
    return testrunStore.markTestFailed(tabId)
  },

  async [TestRunCmd.TestEnd](params) {
    const { tabId } = params
    return testrunStore.endTestRun(tabId)
  },

  async [TestRunCmd.TestPause](params) {
    const { tabId } = params
    return testrunStore.pauseTestRun(tabId)
  },

  async [TestRunCmd.TestPlay](params) {
    const { tabId } = params
    return testrunStore.playTestRun(tabId)
  },

  async [TestRunCmd.GetByTabId](params) {
    const { tabId } = params
    return testrunStore.getByTabId(tabId)
  },
}

export const testrunHandlers = handlers
