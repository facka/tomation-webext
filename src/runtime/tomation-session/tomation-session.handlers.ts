import type { TomationSession } from './tomation-session.types'
import {
  clearTomationSession,
  clearTomationSessionById,
  createTomationSession,
  getTomationSessionById,
  getTomationSessionByTabId,
  getTomationSessionsByWorkspaceId,
  registerTestForSession,
  setTomationSessionConnected,
  setTomationSessionURLMismatch,
} from './tomation-session.service'

export const TomationSessionCmd = {
  Init: 'tomation-session-init',
  Connected: 'tomation-session-connected',
  UrlMismatch: 'tomation-url-mismatch',
  ClearForTab: 'tomation-session-clear-for-tab',
  Remove: 'tomation-session-remove',
  GetById: 'tomation-session-get-by-id',
  GetByTabId: 'tomation-session-get-by-tab-id',
  GetByWorkspaceId: 'tomation-session-get-by-workspace-id',
  RegisterTest: 'tomation-register-test',
} as const

export type TomationSessionCmdType = (typeof TomationSessionCmd)[keyof typeof TomationSessionCmd]

export type TomationSessionMessages = {
  [TomationSessionCmd.Init]: {
    params: { sessionId: string, workspaceId: string, tabId: number }
    result: TomationSession
  }

  [TomationSessionCmd.Connected]: {
    params: { sessionId: string }
    result: TomationSession
  }

  [TomationSessionCmd.UrlMismatch]: {
    params: { sessionId: string }
    result: TomationSession
  }

  [TomationSessionCmd.ClearForTab]: {
    params: { tabId: number }
    result: void
  }

  [TomationSessionCmd.Remove]: {
    params: { sessionId: string, closeTab?: boolean }
    result: void
  }

  [TomationSessionCmd.GetById]: {
    params: { sessionId: string }
    result: TomationSession | null
  }

  [TomationSessionCmd.GetByTabId]: {
    params: { tabId: number }
    result: TomationSession | null
  }

  [TomationSessionCmd.GetByWorkspaceId]: {
    params: { workspaceId: string }
    result: TomationSession[]
  }

  [TomationSessionCmd.RegisterTest]: {
    params: { sessionId: string, testId: string, initialAction: any }
    result: void
  }
}

type Handler<K extends TomationSessionCmdType> = (params: TomationSessionMessages[K]['params']) => Promise<TomationSessionMessages[K]['result']>

const handlers: { [K in TomationSessionCmdType]: Handler<K> } = {
  async [TomationSessionCmd.Init](params) {
    return createTomationSession(params.sessionId, params.workspaceId, params.tabId)
  },

  async [TomationSessionCmd.Connected](params) {
    return setTomationSessionConnected(params.sessionId)
  },

  async [TomationSessionCmd.UrlMismatch](params) {
    return setTomationSessionURLMismatch(params.sessionId)
  },

  async [TomationSessionCmd.ClearForTab](params) {
    clearTomationSession(params.tabId)
  },

  async [TomationSessionCmd.Remove](params) {
    const session = getTomationSessionById(params.sessionId)
    if (!session) {
      return
    }

    if (params.closeTab) {
      try {
        await browser.tabs.remove(session.tabId)
      }
      catch (error) {
        console.warn(`[tomation-webext] Failed to close tab ${session.tabId} while removing session ${session.id}`, error)
      }
    }

    clearTomationSessionById(params.sessionId)
  },

  async [TomationSessionCmd.GetById](params) {
    return getTomationSessionById(params.sessionId)
  },

  async [TomationSessionCmd.GetByTabId](params) {
    return getTomationSessionByTabId(params.tabId)
  },

  async [TomationSessionCmd.RegisterTest](params) {
    registerTestForSession(params.sessionId, params.testId, params.initialAction)
  },

  async [TomationSessionCmd.GetByWorkspaceId](params) {
    return getTomationSessionsByWorkspaceId(params.workspaceId)
  },
}

export const tomationSessionHandlers = handlers
