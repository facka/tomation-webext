/**
 * Messaging contracts for the extension.
 *
 * This file defines all one-shot message contracts used throughout the extension.
 * It serves as the single source of truth for message types and is used by both
 * the adapter layer and the new messaging system.
 *
 * Format:
 * - ChannelName: defines the request and response types for that channel
 * - Commands are passed as { cmd, params } in the request payload
 */

import type { Workspace } from '@/logic/workspace/workspace.types'
import type { TestRun } from '@/runtime/testrun/testrun.types'
import type { TomationSession } from '@/runtime/tomation-session/tomation-session.types'

export type CommandMessage = {
  cmd: string
  params?: any
}

export type CommandResponse = {
  ok?: boolean
  [key: string]: any
}

/**
 * Content script → Background
 * Used for all workspace/session/test operations initiated by content script
 */
export type ContentToBackgroundRequest = CommandMessage
export type ContentToBackgroundResponse = CommandResponse

/**
 * Options page → Background
 * Used for configuration and workspace operations from options UI
 */
export type OptionsToBackgroundRequest = CommandMessage
export type OptionsToBackgroundResponse = CommandResponse

/**
 * Sidepanel → Background
 * Used for test execution, workspace queries, and session management
 */
export type SidepanelToBackgroundRequest = CommandMessage
export type SidepanelToBackgroundResponse = CommandResponse

/**
 * Popup → Background
 * Used for test execution and session management from popup
 */
export type PopupToBackgroundRequest = CommandMessage
export type PopupToBackgroundResponse = CommandResponse

/**
 * Background → Popup
 * Bidirectional: popup receives updates and can send commands
 */
export type BackgroundToPopupRequest = CommandMessage
export type BackgroundToPopupResponse = CommandResponse

/**
 * Background → Content script
 * Used for sending session updates and test status changes to content script
 */
export type BackgroundToContentScriptRequest = CommandMessage
export type BackgroundToContentScriptResponse = CommandResponse

/**
 * Sidepanel → Content script
 * Used for forwarding test commands to injected script
 */
export type SidepanelToContentScriptRequest = CommandMessage
export type SidepanelToContentScriptResponse = CommandResponse

/**
 * Complete contract definition for webext-bridge compatibility
 * Each channel maps: channelName → { request: type, response: type }
 */
export type MessagingContracts = {
  'content-to-background': {
    request: ContentToBackgroundRequest
    response: ContentToBackgroundResponse
  }
  'options-to-background': {
    request: OptionsToBackgroundRequest
    response: OptionsToBackgroundResponse
  }
  'sidepanel-to-background': {
    request: SidepanelToBackgroundRequest
    response: SidepanelToBackgroundResponse
  }
  'popup-to-background': {
    request: PopupToBackgroundRequest
    response: PopupToBackgroundResponse
  }
  'background-to-popup': {
    request: BackgroundToPopupRequest
    response: BackgroundToPopupResponse
  }
  'background-to-contentScript': {
    request: BackgroundToContentScriptRequest
    response: BackgroundToContentScriptResponse
  }
  'sidepanel-to-contentScript': {
    request: SidepanelToContentScriptRequest
    response: SidepanelToContentScriptResponse
  }
}

/**
 * Common command payloads used across channels
 */
export type WorkspaceGetForHostParams = { host: string }
export type WorkspaceGetForHostResult = Workspace | null

export type TomationSessionInitParams = { url: string }
export type TomationSessionInitResult = TomationSession | void

export type TomationSessionGetByTabIdParams = { tabId: number }
export type TomationSessionGetByTabIdResult = TomationSession | null

export type TestRunGetByTabIdParams = { tabId: number }
export type TestRunGetByTabIdResult = TestRun | null

export type TestRunStartedParams = { tabId: number; testId: string; action: any }
export type TestRunStartedResult = TestRun

export type TestRunActionUpdateParams = { tabId: number; action: any }
export type TestRunActionUpdateResult = void

export type TestRunTestStopParams = { tabId: number }
export type TestRunTestStopResult = void

export type TestRunTestPausedParams = { tabId: number }
export type TestRunTestPausedResult = void

export type TestRunTestPlayParams = { tabId: number }
export type TestRunTestPlayResult = void

export type TestRunTestPassedParams = { tabId: number }
export type TestRunTestPassedResult = void

export type TestRunTestFailedParams = { tabId: number }
export type TestRunTestFailedResult = void

export type TestRunTestEndParams = { tabId: number }
export type TestRunTestEndResult = void
