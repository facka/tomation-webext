import type { Action } from '../testrun/testrun.store'
import type { TomationSession } from './tomation-session.types'

const sessionById = new Map<string, TomationSession>()

export function createSession(params: {
  sessionId: string
  workspaceId: string
  tabId: number
}): TomationSession {
  const session: TomationSession = {
    id: params.sessionId,
    workspaceId: params.workspaceId,
    tabId: params.tabId,
    connected: false,
    automatedTests: {},
  }
  sessionById.set(session.id, session)
  return session
}

export function getSessionById(sessionId: string): TomationSession | null {
  return sessionById.get(sessionId) ?? null
}

export function getSessionByTabId(tabId: number): TomationSession | null {
  for (const session of sessionById.values()) {
    if (session.tabId === tabId) {
      return session
    }
  }
  return null
}

export function getSessionsByWorkspaceId(workspaceId: string): TomationSession[] {
  const sessions: TomationSession[] = []
  for (const session of sessionById.values()) {
    if (session.workspaceId === workspaceId) {
      sessions.push(session)
    }
  }
  return sessions
}

export function updateSession(sessionId: string, updates: Partial<TomationSession>): TomationSession {
  const session = getSessionById(sessionId)
  if (!session) {
    throw new Error(`Session with id ${sessionId} not found`)
  }
  const updatedSession = {
    ...session,
    ...updates,
  }
  sessionById.set(sessionId, updatedSession)
  return updatedSession
}

export function clearSession(sessionId: string): void {
  sessionById.delete(sessionId)
}

export function registerTestForSession(sessionId: string, testId: string, initialAction: Action) {
  const session = getSessionById(sessionId)
  if (!session) {
    throw new Error(`Session with id ${sessionId} not found`)
  }
  session.automatedTests[testId] = {
    initialAction,
  }
}
