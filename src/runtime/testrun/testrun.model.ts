import type { TestRun } from './testrun.types'

export function createTestRun(input: {
  sessionId: string
  testId: string
  initialAction: any
}): TestRun {
  const now = Date.now()

  const actionsById = new Map<string, any>()

  function extractActions(action: any) {
    if (action.steps) {
      action.steps.forEach((action: any) => extractActions(action))
    }
    actionsById.set(action.id, action)
  }

  extractActions(input.initialAction)

  return {
    id: `${input.sessionId}-${input.testId}-${now}`,
    sessionId: input.sessionId,
    testId: input.testId,
    status: 'running',
    startedAt: Date.now(),
    endedAt: 0,
    initialAction: input.initialAction,
    actionsById,
    logs: [],
  }
}

export function startTestRun(testRun: TestRun): TestRun {
  return {
    ...testRun,
    status: 'running',
    startedAt: Date.now(),
  }
}

export function endTestRun(testRun: TestRun, status: 'passed' | 'failed' | 'cancelled' | 'paused'): TestRun {
  return {
    ...testRun,
    status,
    endedAt: Date.now(),
  }
}

export function testRunToJSON(testRun: TestRun): any {
  return {
    ...testRun,
    actionsById: Object.fromEntries(testRun.actionsById),
  }
}

export function testRunFromJSON(json: any): TestRun {
  return {
    ...json,
    actionsById: new Map<string, any>(Object.entries(json.actionsById)),
  }
}
