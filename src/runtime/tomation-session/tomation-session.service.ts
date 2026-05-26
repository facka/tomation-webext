import { clearSession, createSession, getSessionById, getSessionByTabId, getSessionsByWorkspaceId, updateSession } from './tomation-session.store'
import { createBackgroundAdapter } from '@/messaging'

const messaging = createBackgroundAdapter()

export function createTomationSession(workspaceId: string, tabId: number) {
  const existingSession = getSessionByTabId(tabId)
  if (!existingSession) {
    return createSession({ workspaceId, tabId })
  }
  else {
    return existingSession
  }
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

export function clearTomationSessionByTabId(tabId: number) {
  const session = getSessionByTabId(tabId)
  if (!session) {
    console.warn(`No session found for tabId ${tabId}. Cannot clear session.`)
    return
  }
  return clearSession(session.id)
}

export function clearTomationSessionTests(tabId: number) {
  const session = getSessionByTabId(tabId)
  if (!session) {
    console.warn(`No session found for tabId ${tabId}. Cannot clear session tests.`)
    return
  }
  return updateSession(session.id, { automatedTests: {} })
}

export function getTomationSessionByTabId(tabId: number) {
  return getSessionByTabId(tabId)
}

export function getTomationSessionById(sessionId: string) {
  return getSessionById(sessionId)
}

export function getTomationSessionsByWorkspaceId(workspaceId: string) {
  return getSessionsByWorkspaceId(workspaceId)
}

export function registerTestForSessionByTabId(tabId: number, testId: string) {
  const session = getSessionByTabId(tabId)
  if (!session) {
    throw new Error(`Session for tabId ${tabId} not found`)
  }
  session.automatedTests[testId] = testId
  updateSession(session.id, { automatedTests: session.automatedTests })
}

export function getTestById(testId: string, tabId: number) {
  const session = getSessionByTabId(tabId)
  if (session && session.automatedTests[testId]) {
    return session.automatedTests[testId]
  }
  return null
}

export async function setupTests(tabId: number) {
  const session = getSessionByTabId(tabId)
  if (!session) {
    throw new Error(`Session for tabId ${tabId} not found`)
  }
  clearTomationSessionTests(tabId)
  console.log(`[tomation-webext][background] Setting up tests for session ${session.id} in tab ${tabId}`)
  try {
    await messaging.sendMessage('background-to-contentScript', {
      cmd: 'setup-tests-request',
      params: {},
    }, `content-script@${tabId}`)
  } catch (error) {
    console.error(`[tomation-webext][background] Failed to send setup-tests-request to content script in tab ${tabId}`, error)
  }
}
