import type { VIEWS } from '../views'

// workspaces will store the following info:
// - id: unique identifier for the workspace
// - name: user-friendly name for the workspace
// - host: the host (domain) that this workspace is associated with, e.g. "example.com"
// - script: the URL of the script to inject for this workspace, e.g. "https://example.com/tomation-script.js"
// - createdAt: timestamp of when the workspace was created
// - updatedAt: timestamp of when the workspace was last updated
// - tests: an array of test cases associated with this workspace (optional, can be added later)
// - currentView: the current view in the UI for this workspace, e.g. "test-runner", "test-editor" (optional, can be added later)
// - currentExecution: object with info about the current test execution, e.g. status, start time, end time, etc. (optional, can be added later)
//   - status: "running", "passed", "failed"
//   - startTime: timestamp of when the test execution started
//   - endTime: timestamp of when the test execution ended
//   - currentTestId: the id of the test case currently being executed
//   - initialAction: the initial action to be executed
//   - logs: array of log messages during execution

// WARNING: The execution model should persist in background not in the localStorage because it can be very large and we don't want to block the content script with large data.

export type Workspace = {
  id: string
  name: string
  host: string
  script: string
  tests: any[]
  currentView: VIEWS
  currentExecution?: {
    status: 'running' | 'passed' | 'failed'
    startedAt: number
    endedAt: number
    currentTestId: string
    initialAction: any
    actionsById: Record<string, any>
    logs: string[]
  }
  createdAt: number
  updatedAt: number
}
