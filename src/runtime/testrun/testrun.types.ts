export type TestRun = {
  id: string
  tabId: number
  testId: string
  status: 'idle' | 'running' | 'passed' | 'failed' | 'cancelled' | 'paused'
  startedAt: number
  endedAt: number
  initialAction: any
  actionsById: Map<string, any>
  logs: string[]
}
