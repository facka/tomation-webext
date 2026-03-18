import type { Workspace } from './workspace.types'
import { VIEWS } from '../views'

// workspaces are stored in browser storage and injected into content script when requested
// workspaces are created/updated/deleted in the background script and sent to content script when requested

export function createWorkspace(input: {
  id: string
  name: string
  host: string
  script: string
  tests?: any[]
}): Workspace {
  const now = Date.now()

  return {
    id: input.id,
    name: input.name.trim(),
    host: input.host.toLowerCase(),
    script: input.script.trim(),
    tests: input.tests || [],
    currentView: VIEWS.MAIN,
    createdAt: now,
    updatedAt: now,
  }
}
