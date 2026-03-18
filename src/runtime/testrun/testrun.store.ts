import type { TestRun } from './testrun.types'

export type TestRunStore = {
  getAll: () => TestRun[]
  getById: (id: string) => TestRun | null
  getBySessionId: (sessionId: string) => TestRun
  save: (testRun: TestRun) => TestRun
  delete: (id: string) => void
  clear: () => void
  updateAction: (testRunId: string, action: any) => TestRun
}

export type Action = {
  id: string
  description: string
  context: string
  status: string
  error?: string
  value?: any
  tries: number
}

export class InMemoryTestRunStore implements TestRunStore {
  private readonly testRunsById = new Map<string, TestRun>()

  getAll(): TestRun[] {
    return [...this.testRunsById.values()]
  }

  getById(id: string): TestRun | null {
    return this.testRunsById.get(id) ?? null
  }

  getBySessionId(sessionId: string): TestRun {
    const testRun = this.getAll().find(testRun => testRun.sessionId === sessionId)
    if (!testRun) {
      throw new Error('Test run not found')
    }

    return testRun
  }

  save(testRun: TestRun): TestRun {
    this.testRunsById.set(testRun.id, testRun)
    return testRun
  }

  delete(id: string): void {
    this.testRunsById.delete(id)
  }

  clear(): void {
    this.testRunsById.clear()
  }

  updateAction(sessionId: string, action: Action): TestRun {
    const testRun = this.getBySessionId(sessionId)

    const existingAction = testRun.actionsById.get(action.id)
    if (!existingAction) {
      throw new Error('Action not found in test run')
    }

    existingAction.error = action.error ?? existingAction.error
    existingAction.value = action.context ?? action.value ?? existingAction.value
    existingAction.tries = action.tries ?? existingAction.tries
    existingAction.status = action.status ?? existingAction.status
    return testRun
  }

  stopTestRun(sessionId: string): TestRun {
    const testRun = this.getBySessionId(sessionId)
    testRun.status = 'cancelled'
    testRun.endedAt = Date.now()
    return testRun
  }

  markTestPassed(sessionId: string): TestRun {
    const testRun = this.getBySessionId(sessionId)
    testRun.status = 'passed'
    return testRun
  }

  markTestFailed(sessionId: string): TestRun {
    const testRun = this.getBySessionId(sessionId)
    testRun.status = 'failed'
    return testRun
  }

  endTestRun(sessionId: string): TestRun {
    const testRun = this.getBySessionId(sessionId)
    testRun.status = 'idle'
    testRun.endedAt = Date.now()
    return testRun
  }

  pauseTestRun(sessionId: string): TestRun {
    const testRun = this.getBySessionId(sessionId)
    testRun.status = 'paused'
    return testRun
  }

  playTestRun(sessionId: string): TestRun {
    const testRun = this.getBySessionId(sessionId)
    testRun.status = 'running'
    return testRun
  }
}

export const testrunStore = new InMemoryTestRunStore()
