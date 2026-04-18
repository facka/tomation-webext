// workspaces will store the following info:
// - id: unique identifier for the workspace
// - name: user-friendly name for the workspace
// - host: the host (domain) that this workspace is associated with, e.g. "example.com"
// - script: the URL of the script to inject for this workspace, e.g. "https://example.com/tomation-script.js"
// - createdAt: timestamp of when the workspace was created
// - updatedAt: timestamp of when the workspace was last updated

// WARNING: The execution model should persist in background not in the localStorage because it can be very large and we don't want to block the content script with large data.

export type Workspace = {
  id: string
  name: string
  host: string
  script: string
  createdAt: number
  updatedAt: number
}
