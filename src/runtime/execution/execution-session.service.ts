import type { Action } from './execution-session.types'
import { createSession, getSession } from './execution-session.store'

export function startExecution(workspaceId: string, tabId: number, initialAction: Action) {
  return createSession({ workspaceId, tabId, initialAction })
}

export function getExecutionState(tabId: number) {
  return getSession(tabId)
}
