import type { Workspace } from './workspace.types'

// workspaces are stored in browser storage and injected into content script when requested
// workspaces are created/updated/deleted in the background script and sent to content script when requested

export function createWorkspace(input: {
  id: string
  name: string
  host: string
  script: string
}): Workspace {
  const now = Date.now()

  return {
    id: input.id,
    name: input.name.trim(),
    host: input.host.toLowerCase(),
    script: input.script.trim(),
    createdAt: now,
    updatedAt: now,
  }
}
