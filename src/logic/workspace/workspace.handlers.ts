import type { Workspace } from './workspace.types'
import { createWorkspace } from './workspace.model'

import { BrowserWorkspaceRepository } from './workspace.repository'

const repo = new BrowserWorkspaceRepository()

export const WorkspaceCmd = {
  GetAll: 'workspace:get-all',
  GetForHost: 'workspace:get-for-host',
  Create: 'workspace:create',
  Update: 'workspace:update',
  Delete: 'workspace:delete',
} as const

export type WorkspaceCmdType = (typeof WorkspaceCmd)[keyof typeof WorkspaceCmd]

export type WorkspaceMessages = {
  [WorkspaceCmd.GetAll]: {
    params: void
    result: Workspace[]
  }

  [WorkspaceCmd.GetForHost]: {
    params: { host: string }
    result: Workspace | null
  }

  [WorkspaceCmd.Create]: {
    params: { name: string, host: string, script?: string }
    result: Workspace
  }

  [WorkspaceCmd.Update]: {
    params: { id: string, patch: Partial<Workspace> }
    result: Workspace
  }

  [WorkspaceCmd.Delete]: {
    params: { id: string }
    result: void
  }
}

type Handler<K extends WorkspaceCmdType> = (params: WorkspaceMessages[K]['params']) => Promise<WorkspaceMessages[K]['result']>

const handlers: { [K in WorkspaceCmdType]: Handler<K> } = {
  async [WorkspaceCmd.GetAll]() {
    return repo.getAll()
  },

  async [WorkspaceCmd.Create](params: any) {
    const workspace = createWorkspace({
      id: crypto.randomUUID(),
      name: params.name,
      host: params.host,
      script: params.script,
    })

    await repo.create(workspace)
    return workspace
  },

  async [WorkspaceCmd.Update](params: any) {
    const existing = await repo.getById(params.id)
    if (!existing) {
      throw new Error('Workspace not found')
    }

    const updated = {
      ...existing,
      name: params.name,
      host: params.host,
      script: params.script,
      updatedAt: Date.now(),
    }

    await repo.update(updated)
    return updated
  },

  async [WorkspaceCmd.GetForHost](params: any) {
    return repo.getByHost(params.host)
  },

  async [WorkspaceCmd.Delete](params: any) {
    await repo.delete(params.id)
  },
}

export const workspaceHandlers = handlers
