export type TomationSession = {
  id: string
  workspaceId: string
  tabId: number
  connected: boolean
  automatedTests: Record<string, any>
  testsLoaded: boolean
}
