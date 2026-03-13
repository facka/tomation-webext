export type ExecutionStatus
  = | 'idle'
    | 'running'
    | 'paused'
    | 'completed'
    | 'failed'
    | 'stopped'

export type Action = {
  id: string
  description: string
  steps: Action[]
}

export type ExecutionSession = {
  id: string
  workspaceId: string
  tabId: number

  status: ExecutionStatus

  startedAt: number
  updatedAt: number

  currentStepIndex: number
  initialAction: Action

  logs: ExecutionLog[]
}

export type ExecutionLog = {
  id: string
  timestamp: number
  level: 'info' | 'warn' | 'error'
  message: string
}
