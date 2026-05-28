import { WorkspaceCmd } from '@/logic/workspace/workspace.handlers'
import { createUIAdapter } from '@/messaging'
import { TomationSessionCmd } from '@/runtime/tomation-session/tomation-session.handlers'
import { useActiveTab } from '@/composables/useActiveTab'

let initialized = false
let messaging: ReturnType<typeof createUIAdapter> | null = null

const SIDE_PANEL_CHANNEL = 'sidepanel-to-background'

export function initializeMessagingClient() {
  if (initialized) {
    return
  }

  messaging = createUIAdapter()
  initialized = true
}

function getMessaging() {
  if (!messaging) {
    throw new Error('[tomation-webext][ui] Messaging client not initialized. Call bootstrapMessaging() in main.ts first.')
  }

  return messaging
}

export function onBackgroundToPopup(handler: (message: { data: any, sender: any }) => any) {
  return getMessaging().onMessage('background-to-popup', handler)
}

/**
 * Small command client for sidepanel/popup UI contexts.
 *
 * Keeping transport here prevents messaging side effects from leaking into stores.
 */
export async function sendCommandToBackground(cmd: string, params: Record<string, any> = {}) {
  return await getMessaging().sendMessage(SIDE_PANEL_CHANNEL, {
    cmd,
    params,
  }, 'background')
}

export async function sendCommandForActiveTab(cmd: string, params: Record<string, any> = {}) {
  const { tab } = await useActiveTab().getActiveTab()
  return await sendCommandToBackground(cmd, {
    ...params,
    tabId: tab?.id,
  })
}

export async function createWorkspace(params: { name: string, host: string, script: string }) {
  return await sendCommandToBackground(WorkspaceCmd.Create, {
    name: params.name,
    host: params.host,
    script: params.script,
  })
}

export async function setupTestsForActiveTab() {
  return await sendCommandForActiveTab(TomationSessionCmd.SetupTests)
}

export async function reloadTestsForActiveTab() {
  return await sendCommandForActiveTab('reload-tests-request')
}

export async function runTestForActiveTab(testId: string) {
  return await sendCommandForActiveTab('run-test-request', { testId })
}

export async function closeTestViewer(params: { sessionId: string, tabId: number }) {
  return await sendCommandToBackground('close-test-viewer', params)
}
