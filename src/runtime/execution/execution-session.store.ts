import type { Action, ExecutionLog, ExecutionSession, ExecutionStatus } from './execution-session.types'

const sessionsByTab = new Map<number, ExecutionSession>()

export function createSession(params: {
  workspaceId: string
  tabId: number
  initialAction: Action
}): ExecutionSession {
  const session: ExecutionSession = {
    id: crypto.randomUUID(),
    workspaceId: params.workspaceId,
    tabId: params.tabId,

    status: 'running',

    startedAt: Date.now(),
    updatedAt: Date.now(),

    currentStepIndex: 0,
    initialAction: params.initialAction,

    logs: [],
  }

  sessionsByTab.set(params.tabId, session)
  return session
}

export function getSession(tabId: number): ExecutionSession | null {
  return sessionsByTab.get(tabId) ?? null
}

export function advanceStep(tabId: number) {
  const session = sessionsByTab.get(tabId)
  if (!session)
    return

  session.currentStepIndex++
  session.updatedAt = Date.now()
}

export function appendLog(
  tabId: number,
  log: Omit<ExecutionLog, 'id' | 'timestamp'>,
) {
  const session = sessionsByTab.get(tabId)
  if (!session)
    return

  session.logs.push({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...log,
  })

  session.updatedAt = Date.now()
}

export function stopSession(tabId: number, status: ExecutionStatus = 'stopped') {
  const session = sessionsByTab.get(tabId)
  if (!session)
    return

  session.status = status
  session.updatedAt = Date.now()
}

export function clearSession(tabId: number) {
  sessionsByTab.delete(tabId)
}
