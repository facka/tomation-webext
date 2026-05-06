import type { Action } from '../testrun/testrun.store'
import type { TomationSession } from './tomation-session.types'

const sessionById = new Map<string, TomationSession>()

export function createSession(params: {
  workspaceId: string
  tabId: number
}): TomationSession {
  const session: TomationSession = {
    id: `${params.tabId}-${params.workspaceId}-${Date.now()}`,
    workspaceId: params.workspaceId,
    tabId: params.tabId,
    connected: false,
    automatedTests: {},
    testsLoaded: false,
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
  if (sessionId !== updatedSession.id) {
    // if sessionId is being updated, we need to delete the old entry and create a new one with the new id
    sessionById.delete(sessionId)
    sessionById.set(updatedSession.id, updatedSession)
  }
  else {
    sessionById.set(sessionId, updatedSession)
  }
  return updatedSession
}

export function clearSession(sessionId: string): void {
  sessionById.delete(sessionId)
}

export function registerTestForSessionByTabId(tabId: number, testId: string, initialAction: Action) {
  const session = getSessionByTabId(tabId)
  if (!session) {
    throw new Error(`Session for tabId ${tabId} not found`)
  }
  session.automatedTests[testId] = {
    initialAction,
  }
}
