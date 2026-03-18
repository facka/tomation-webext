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
} as const

export type TestRunCmdType = (typeof TestRunCmd)[keyof typeof TestRunCmd]

export type TestRunMessages = {
  [TestRunCmd.TestStarted]: {
    params: { sessionId: string, testId: string, action: any }
    result: TestRun
  }

  [TestRunCmd.ActionUpdate]: {
    params: { action: any, sessionId: string }
    result: TestRun
  }

  [TestRunCmd.TestStop]: {
    params: { sessionId: string }
    result: TestRun
  }

  [TestRunCmd.TestPassed]: {
    params: { sessionId: string }
    result: TestRun
  }

  [TestRunCmd.TestFailed]: {
    params: { sessionId: string }
    result: TestRun
  }

  [TestRunCmd.TestEnd]: {
    params: { sessionId: string }
    result: TestRun
  }

  [TestRunCmd.TestPause]: {
    params: { sessionId: string }
    result: TestRun
  }

  [TestRunCmd.TestPlay]: {
    params: { sessionId: string }
    result: TestRun
  }
}

type Handler<K extends TestRunCmdType> = (params: TestRunMessages[K]['params']) => Promise<TestRunMessages[K]['result']>

const handlers: { [K in TestRunCmdType]: Handler<K> } = {
  async [TestRunCmd.TestStarted](params) {
    const { sessionId, testId, action } = params

    browser.action.setBadgeText({ text: 'ON' })
    browser.action.setBadgeBackgroundColor({ color: '#33BB33' })

    return createTestRun({
      sessionId,
      testId,
      initialAction: action,
    })
  },

  async [TestRunCmd.ActionUpdate](params) {
    const { sessionId, action } = params

    return testrunStore.updateAction(sessionId, action)
  },

  async [TestRunCmd.TestStop](params) {
    const { sessionId } = params
    browser.action.setBadgeText({ text: '' })
    return testrunStore.stopTestRun(sessionId)
  },

  async [TestRunCmd.TestPassed](params) {
    const { sessionId } = params
    return testrunStore.markTestPassed(sessionId)
  },

  async [TestRunCmd.TestFailed](params) {
    const { sessionId } = params
    return testrunStore.markTestFailed(sessionId)
  },

  async [TestRunCmd.TestEnd](params) {
    const { sessionId } = params
    return testrunStore.endTestRun(sessionId)
  },

  async [TestRunCmd.TestPause](params) {
    const { sessionId } = params
    return testrunStore.pauseTestRun(sessionId)
  },

  async [TestRunCmd.TestPlay](params) {
    const { sessionId } = params
    return testrunStore.playTestRun(sessionId)
  },
}

export const testrunHandlers = handlers
