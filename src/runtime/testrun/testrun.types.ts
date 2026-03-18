export type TestRun = {
  id: string
  sessionId: string
  testId: string
  status: 'idle' | 'running' | 'passed' | 'failed' | 'cancelled' | 'paused'
  startedAt: number
  endedAt: number
  initialAction: any
  actionsById: Map<string, any>
  logs: string[]
}
