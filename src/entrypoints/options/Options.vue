<script setup lang="ts">
import type { Workspace } from '@/logic/workspace/workspace.types'
import type { TomationSession } from '@/runtime/tomation-session/tomation-session.types'
import { onMounted, ref } from 'vue'
import { sendMessage } from 'webext-bridge/options'
import logo from '@/assets/icon.png'
import { WorkspaceCmd } from '@/logic/workspace/workspace.handlers'
import { TomationSessionCmd } from '@/runtime/tomation-session/tomation-session.handlers'

const allWorkspaces = ref<Workspace[]>([])

const selectedWorkspace = ref<Workspace | null>(null)
const sessionsForSelectedWorkspace = ref<TomationSession[]>([])
const loadingSessionsForSelectedWorkspace = ref(false)
const sessionToDelete = ref<TomationSession | null>(null)
const closeTabWhenDeletingSession = ref(false)
const deletingSession = ref(false)
const deletingSessionError = ref<string | null>(null)

onMounted(async () => {
  console.info('[tomation-webext] Options mounted')
  allWorkspaces.value = await sendMessage('options-to-background', {
    cmd: WorkspaceCmd.GetAll,
  }, 'background')

  if (allWorkspaces.value.length > 0) {
    await selectWorkspace(allWorkspaces.value[0])
  }
})

async function selectWorkspace(workspace: Workspace) {
  selectedWorkspace.value = workspace
  loadingSessionsForSelectedWorkspace.value = true
  sessionsForSelectedWorkspace.value = await sendMessage('options-to-background', {
    cmd: 'tomation-session-get-by-workspace-id',
    params: { workspaceId: workspace.id },
  }, 'background')
  loadingSessionsForSelectedWorkspace.value = false
}

async function deleteWorkspace(id: string) {
  await sendMessage('options-to-background', {
    cmd: WorkspaceCmd.Delete,
    params: { id },
  }, 'background')
  allWorkspaces.value = allWorkspaces.value.filter(ws => ws.id !== id)

  if (selectedWorkspace.value?.id === id) {
    selectedWorkspace.value = null
    sessionsForSelectedWorkspace.value = []
    if (allWorkspaces.value.length > 0) {
      await selectWorkspace(allWorkspaces.value[0])
    }
  }
}

function testsCount(session: TomationSession): number {
  return Object.keys(session.automatedTests ?? {}).length
}

function goToTab(tabId: number) {
  browser.tabs.update(tabId, { active: true })
}

function openDeleteSessionDialog(session: TomationSession) {
  sessionToDelete.value = session
  deletingSessionError.value = null
  closeTabWhenDeletingSession.value = false
}

function cancelDeleteSessionDialog() {
  sessionToDelete.value = null
  closeTabWhenDeletingSession.value = false
}

async function confirmDeleteSession() {
  if (!sessionToDelete.value) {
    return
  }

  deletingSession.value = true
  deletingSessionError.value = null
  const sessionId = sessionToDelete.value.id
  try {
    await sendMessage('options-to-background', {
      cmd: TomationSessionCmd.Remove,
      params: {
        sessionId,
        closeTab: closeTabWhenDeletingSession.value,
      },
    }, 'background')

    sessionsForSelectedWorkspace.value = sessionsForSelectedWorkspace.value.filter(s => s.id !== sessionId)
    cancelDeleteSessionDialog()
  }
  catch (error) {
    console.error('Error deleting session:', error)
    deletingSessionError.value = 'An error occurred while deleting the session. Please try again.'
  }
  finally {
    deletingSession.value = false
  }
}

function getMinifiedStep(step: any) {
  if (step.steps && step.steps.length > 0) {
    return {
      [step.description]: step.steps.map((s: any) => getMinifiedStep(s)),
    }
  }
  else {
    return step.description
  }
}

function getMinifiedTestsFromSession(session: TomationSession) {
  const minifiedTests: Record<string, any> = {}
  for (const [testId, test] of Object.entries(session.automatedTests ?? {})) {
    minifiedTests[testId] = {
      name: test.name,
      initialAction: getMinifiedStep(test.initialAction),
    }
  }
  return minifiedTests
}
</script>

<template>
  <main class="min-h-screen px-6 py-8 text-gray-700 bg-slate-50">
    <header class="mb-6 flex items-center gap-4">
      <img :src="logo" width="32" height="32" class="icon-btn" alt="extension icon">
      <h1 class="text-xl font-semibold text-slate-800">
        Tomation Web Extension Options
      </h1>
    </header>

    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="grid min-h-[32rem] grid-cols-1 lg:grid-cols-[22rem_1fr]">
        <aside class="border-b lg:border-b-0 lg:border-r border-slate-200">
          <div class="px-4 py-3 text-xs font-semibold tracking-wide uppercase text-slate-500 bg-slate-100">
            Workspaces
          </div>

          <div v-if="allWorkspaces.length === 0" class="p-4 text-sm text-slate-500">
            No workspaces found.
          </div>

          <ul v-else class="divide-y divide-slate-100">
            <li
              v-for="ws in allWorkspaces"
              :key="ws.id"
              class="flex items-center justify-between gap-2 p-3"
              :class="selectedWorkspace?.id === ws.id ? 'bg-teal-50' : 'hover:bg-slate-50'"
            >
              <button class="flex-1 text-left" @click="selectWorkspace(ws)">
                <div class="text-sm font-semibold text-slate-800">
                  {{ ws.name }}
                </div>
                <div class="text-xs text-slate-500 truncate">
                  {{ ws.host }}
                </div>
              </button>
              <button class="text-red-500" title="Delete workspace" @click="deleteWorkspace(ws.id)">
                <font-awesome-icon icon="fa-solid fa-trash" />
              </button>
            </li>
          </ul>
        </aside>

        <section class="p-5">
          <div v-if="selectedWorkspace" class="space-y-4">
            <div class="border-b border-slate-200 pb-3">
              <h2 class="text-lg font-semibold text-slate-800">
                {{ selectedWorkspace.name }}
              </h2>
              <p class="text-sm text-slate-500">
                Host: {{ selectedWorkspace.host }}
              </p>
              <p class="text-sm text-slate-500 break-all">
                Script: {{ selectedWorkspace.script }}
              </p>
            </div>

            <div>
              <h3 class="text-sm font-semibold tracking-wide uppercase text-slate-600 mb-3">
                Sessions
              </h3>

              <div v-if="loadingSessionsForSelectedWorkspace" class="text-sm text-slate-500">
                Loading sessions...
              </div>

              <div v-else-if="sessionsForSelectedWorkspace.length === 0" class="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                No sessions found for this workspace.
              </div>

              <ul v-else class="space-y-2">
                <li
                  v-for="session in sessionsForSelectedWorkspace"
                  :key="session.id"
                  class="rounded-md border border-slate-200 bg-slate-50 p-3"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm font-medium text-slate-700">
                      Session {{ session.id }}
                    </div>
                    <div class="flex items-center gap-3">
                      <span
                        class="rounded-full px-2 py-0.5 text-xs font-medium"
                        :class="session.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'"
                      >
                        {{ session.connected ? 'Connected' : 'Disconnected' }}
                      </span>
                      <button
                        class="text-xs text-rose-700 underline decoration-transparent underline-offset-2 transition hover:text-rose-800 hover:decoration-current"
                        @click="openDeleteSessionDialog(session)"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <button
                    class="mt-2 text-xs text-teal-700 underline decoration-transparent underline-offset-2 transition hover:text-teal-800 hover:decoration-current"
                    @click="goToTab(session.tabId)"
                  >
                    Tab ID: {{ session.tabId }}
                  </button>
                  <div>
                    <div class="mt-2 text-xs font-semibold text-slate-600">
                      Automated Tests ({{ testsCount(session) }}):
                    </div>
                    <pre class="mt-2 max-h-40 overflow-auto rounded bg-slate-100 p-2 text-xs text-slate-700">{{ JSON.stringify(getMinifiedTestsFromSession(session), null, 2) }}</pre>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div v-else class="h-full flex items-center justify-center text-sm text-slate-500">
            Select a workspace to view its sessions.
          </div>
        </section>
      </div>
    </div>

    <div v-if="sessionToDelete" class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
      <div class="w-full max-w-md rounded-lg bg-white border border-slate-200 p-5 shadow-lg">
        <h3 class="text-base font-semibold text-slate-800">
          Remove Session
        </h3>
        <p class="mt-2 text-sm text-slate-600">
          Are you sure you want to remove session {{ sessionToDelete.id }}?
        </p>

        <label class="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input v-model="closeTabWhenDeletingSession" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500">
          Also close the browser tab (ID: {{ sessionToDelete.tabId }})
        </label>

        <div v-if="deletingSessionError" class="mt-4 rounded bg-rose-50 p-3 text-sm text-rose-700">
          {{ deletingSessionError }}
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button class="px-3 py-1.5 text-sm rounded border border-slate-300 text-slate-700 hover:bg-slate-50" :disabled="deletingSession" @click="cancelDeleteSessionDialog">
            Cancel
          </button>
          <button class="px-3 py-1.5 text-sm rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60" :disabled="deletingSession" @click="confirmDeleteSession">
            {{ deletingSession ? 'Removing...' : 'Remove Session' }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
