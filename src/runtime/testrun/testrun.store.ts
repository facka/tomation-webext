import type { TestRun } from './testrun.types'

export type TestRunStore = {
  getAll: () => TestRun[]
  getById: (id: string) => TestRun | null
  getByTabId: (tabId: number) => TestRun | null
  save: (testRun: TestRun) => TestRun
  delete: (id: string) => void
  clear: () => void
  updateAction: (tabId: number, action: any) => TestRun | null
  stopTestRun: (tabId: number) => TestRun | null
  markTestPassed: (tabId: number) => TestRun | null
  markTestFailed: (tabId: number) => TestRun | null
  endTestRun: (tabId: number) => TestRun | null
  pauseTestRun: (tabId: number) => TestRun | null
  playTestRun: (tabId: number) => TestRun | null
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

  getByTabId(tabId: number): TestRun | null {
    const testRun = this.getAll().find(testRun => testRun.tabId === tabId)
    if (!testRun) {
      return null
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

  updateAction(tabId: number, action: Action): TestRun | null {
    const testRun = this.getByTabId(tabId)

    if (!testRun) {
      return null
    }

    console.log('Updating action in test run', { tabId, action, testRun })
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

  stopTestRun(tabId: number): TestRun | null {
    const testRun = this.getByTabId(tabId)
    if (!testRun) {
      return null
    }
    testRun.status = 'cancelled'
    testRun.endedAt = Date.now()
    return testRun
  }

  markTestPassed(tabId: number): TestRun | null {
    const testRun = this.getByTabId(tabId)
    if (!testRun) {
      return null
    }
    testRun.status = 'passed'
    return testRun
  }

  markTestFailed(tabId: number): TestRun | null {
    const testRun = this.getByTabId(tabId)
    if (!testRun) {
      return null
    }
    testRun.status = 'failed'
    return testRun
  }

  endTestRun(tabId: number): TestRun | null {
    const testRun = this.getByTabId(tabId)
    if (!testRun) {
      return null
    }
    testRun.endedAt = Date.now()
    return testRun
  }

  pauseTestRun(tabId: number): TestRun | null {
    const testRun = this.getByTabId(tabId)
    if (!testRun) {
      return null
    }
    testRun.status = 'paused'
    return testRun
  }

  playTestRun(tabId: number): TestRun | null {
    const testRun = this.getByTabId(tabId)
    if (!testRun) {
      return null
    }
    testRun.status = 'running'
    return testRun
  }
}

export const testrunStore = new InMemoryTestRunStore()
