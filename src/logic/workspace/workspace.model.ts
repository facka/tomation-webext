import type { Workspace } from './workspace.types'

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
