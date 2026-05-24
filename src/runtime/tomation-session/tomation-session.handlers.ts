import type { TomationSession } from './tomation-session.types'
import {
  clearTomationSessionByTabId,
  clearTomationSessionTests,
  createTomationSession,
  getTestById,
  getTomationSessionByTabId,
  getTomationSessionsByWorkspaceId,
  registerTestForSessionByTabId,
  setTomationSessionConnected,
  setTomationSessionURLMismatch,
  setupTests,
} from './tomation-session.service'

export const TomationSessionCmd = {
  Init: 'tomation-session-init',
  Connected: 'tomation-session-connected',
  UrlMismatch: 'tomation-url-mismatch',
  ClearForTab: 'tomation-session-clear-for-tab',
  Remove: 'tomation-session-remove',
  GetByTabId: 'tomation-session-get-by-tab-id',
  GetByWorkspaceId: 'tomation-session-get-by-workspace-id',
  RegisterTest: 'tomation-register-test',
  GetTestById: 'tomation-session-get-test-by-id',
  SetupTests: 'tomation-session-setup-tests',
} as const

export type TomationSessionCmdType = (typeof TomationSessionCmd)[keyof typeof TomationSessionCmd]

export type TomationSessionMessages = {
  [TomationSessionCmd.Init]: {
    params: { workspaceId: string, tabId: number }
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
    params: { tabId: number, closeTab?: boolean }
    result: void
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
    params: { tabId: number, testId: string, initialAction: any }
    result: void
  }

  [TomationSessionCmd.GetTestById]: {
    params: { testId: string, tabId: number }
    result: any | null
  },

  [TomationSessionCmd.SetupTests]: {
    params: { tabId: number }
    result: void
  }
}

type Handler<K extends TomationSessionCmdType> = (params: TomationSessionMessages[K]['params']) => Promise<TomationSessionMessages[K]['result']>

const handlers: { [K in TomationSessionCmdType]: Handler<K> } = {
  async [TomationSessionCmd.Init](params) {
    return createTomationSession(params.workspaceId, params.tabId)
  },

  async [TomationSessionCmd.Connected](params) {
    return setTomationSessionConnected(params.sessionId)
  },

  async [TomationSessionCmd.UrlMismatch](params) {
    return setTomationSessionURLMismatch(params.sessionId)
  },

  async [TomationSessionCmd.ClearForTab](params) {
    clearTomationSessionTests(params.tabId)
  },

  async [TomationSessionCmd.Remove](params) {
    const session = getTomationSessionByTabId(params.tabId)
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

    clearTomationSessionByTabId(params.tabId)
  },

  async [TomationSessionCmd.GetByTabId](params) {
    return getTomationSessionByTabId(params.tabId)
  },

  async [TomationSessionCmd.RegisterTest](params) {
    registerTestForSessionByTabId(params.tabId, params.testId)
  },

  async [TomationSessionCmd.GetByWorkspaceId](params) {
    return getTomationSessionsByWorkspaceId(params.workspaceId)
  },

  async [TomationSessionCmd.GetTestById](params) {
    return getTestById(params.testId, params.tabId)
  },
  
  async [TomationSessionCmd.SetupTests](params) {
    return setupTests(params.tabId)
  }
}

export const tomationSessionHandlers = handlers
