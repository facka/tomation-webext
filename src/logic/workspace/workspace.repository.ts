import type { Workspace } from './workspace.types'

export type WorkspaceRepository = {
  getAll: () => Promise<Workspace[]>
  getById: (id: string) => Promise<Workspace | null>
  getByHost: (host: string) => Promise<Workspace | null>
  create: (workspace: Workspace) => Promise<void>
  update: (workspace: Workspace) => Promise<void>
  delete: (id: string) => Promise<void>
}

const KEY = 'tomation.workspaces'

export class BrowserWorkspaceRepository implements WorkspaceRepository {
  async getAll(): Promise<Workspace[]> {
    const result = await browser.storage.local.get(KEY)
    const map: Record<string, Workspace> = result[KEY] || {} as any
    return Object.values(map)
  }

  async getById(id: string) {
    const all = await this.getAll()
    return all.find(w => w.id === id) || null
  }

  async getByHost(host: string) {
    const all = await this.getAll()
    return all.find(w => w.host === host) || null
  }

  async create(workspace: Workspace) {
    const result = await browser.storage.local.get(KEY)
    const map: any = result[KEY] || {}
    map[workspace.id] = workspace
    await browser.storage.local.set({ [KEY]: map })
  }

  async update(workspace: Workspace) {
    return this.create(workspace)
  }

  async delete(id: string) {
    const result = await browser.storage.local.get(KEY)
    const map: any = result[KEY] || {}
    delete map[id]
    await browser.storage.local.set({ [KEY]: map })
  }
}
