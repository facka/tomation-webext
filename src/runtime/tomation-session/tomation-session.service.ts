import { clearSession, createSession, getSessionById, getSessionByTabId, updateSession } from './tomation-session.store'

export function createTomationSession(sessionId: string, workspaceId: string, tabId: number) {
  return createSession({ sessionId, workspaceId, tabId })
}

export function setTomationSessionConnected(sessionId: string) {
  return updateSession(sessionId, { connected: true })
}

export function setTomationSessionURLMismatch(sessionId: string) {
  return updateSession(sessionId, { connected: false })
}

export function clearTomationSession(tabId: number) {
  const session = getSessionByTabId(tabId)
  if (!session) {
    console.warn(`No session found for tabId ${tabId}. Cannot clear session.`)
    return
  }
  return clearSession(session.id)
}

export function getTomationSessionByTabId(tabId: number) {
  return getSessionByTabId(tabId)
}

export function getTomationSessionById(sessionId: string) {
  return getSessionById(sessionId)
}

export function registerTestForSession(sessionId: string, testId: string, initialAction: any) {
  const session = getSessionById(sessionId)
  if (!session) {
    throw new Error(`Session with id ${sessionId} not found`)
  }
  session.automatedTests[testId] = {
    initialAction,
  }
  updateSession(sessionId, { automatedTests: session.automatedTests })
}
