<script setup lang="ts">
import type { Workspace } from '@/logic/workspace/workspace.types'
import { onMounted, ref, watch } from 'vue'
import { sendMessage } from 'webext-bridge/popup'
import ActionViewer from '@/components/ActionViewer.vue'
import AutomatedTests from '@/components/AutomatedTests.vue'
import History from '@/components/History.vue'
import TaskExecutionViewer from '@/components/TaskExecutionViewer.vue'
import UrlStatus from '@/components/UrlStatus.vue'
import { useAutomationStore } from '@/composables/automation-store'
import { useActiveTab } from '@/composables/useActiveTab'
import { WorkspaceCmd } from '@/logic/workspace/workspace.handlers'
import { VIEWS } from '~/logic/views'

const sidepanelStore = useAutomationStore()

const isLoading = ref(false)
const activeTabId = ref<any>(null)
const existingWorkspaces = ref<Workspace[]>([])
const workspace = ref<Workspace | null>(null)
const currentTabHost = ref<string>('')
const currentTabTitle = ref<string>('')
const workspaceName = ref('')
const workspaceScriptURL = ref('')

async function updateActiveTabId() {
  const res = await useActiveTab().getActiveTab()
  // get id from returned object (it may be res.tab.id)
  activeTabId.value = res?.tab?.id ?? null
  isLoading.value = activeTabId.value != null && sidepanelStore.tabsInfoById[activeTabId.value]?.status === 'loading'
}

onMounted(async () => {
  await refresh()
})

// Keep isLoading updated when tabInfo changes
watch(
  () => sidepanelStore.tabsInfoById,
  () => {
    if (activeTabId.value != null) {
      isLoading.value = sidepanelStore.tabsInfoById[activeTabId.value].status === 'loading'
      refresh()
    }
  },
  { deep: true },
)

async function refresh() {
  updateActiveTabId()
  const { tab } = await useActiveTab().getActiveTab()
  const url = tab.url
  // extract host from url
  currentTabHost.value = url ? new URL(url).host : ''
  currentTabTitle.value = tab.title || ''
  workspaceName.value = currentTabTitle.value || ''
  const existentWorkspace: Workspace | null = await sendMessage('sidepanel-to-background', {
    cmd: WorkspaceCmd.GetForHost,
    params: { host: currentTabHost.value },
  }, 'background')
  console.log({ workspace })
  workspace.value = existentWorkspace
  const allWorkspaces: Workspace[] = await sendMessage('sidepanel-to-background', {
    cmd: WorkspaceCmd.GetAll,
  }, 'background')
  existingWorkspaces.value = allWorkspaces.filter(ws => ws.host !== currentTabHost.value)
}

function closeTaskExecutionViewer() {
  sidepanelStore.goTo(VIEWS.MAIN)
}

function goTo(view: VIEWS) {
  sidepanelStore.goTo(view)
}

async function handleStatusChange(status: 'no-url' | 'checking' | 'ok' | 'error') {
  console.log('URL Status changed: ', status)
  if (status === 'ok') { // when status is OK we should refresh the page
    const activeTab = await useActiveTab().getActiveTab()

    sendMessage('sidepanel-to-contentScript', {
      cmd: 'refresh-page',
    }, activeTab.destination)
  }
}

async function reloadTests() {
  console.log('Reload tests')
  const activeTab = (await useActiveTab().getActiveTab()).destination
  try {
    await sendMessage('sidepanel-to-contentScript', {
      cmd: 'reload-tests-request',
      params: {},
    }, activeTab)
  }
  catch (error) {
    console.error('Error reloading tests:', error)
  }
}

async function startProject() {
  // create a new workspace with the current host and a default name
  const newWorkspace = await sendMessage('sidepanel-to-background', {
    cmd: WorkspaceCmd.Create,
    params: {
      name: workspaceName.value.trim(),
      host: currentTabHost.value,
      script: workspaceScriptURL.value.trim() || undefined,
    },
  }, 'background')
  workspace.value = newWorkspace as Workspace
  await reloadTests()
}

async function deleteWorkspace(id: string) {
  await sendMessage('sidepanel-to-background', {
    cmd: WorkspaceCmd.Delete,
    params: { id },
  }, 'background')
  existingWorkspaces.value = existingWorkspaces.value.filter(ws => ws.id !== id)
}
</script>

<template>
  <nav class="w-full">
    <div v-if="!workspace">
      <div class="p-2 bg-gray-100 font-bold">
        No workspace found locally for this page {{ currentTabTitle }} ({{ currentTabHost }})
      </div>
      <div class="p-2 bg-yellow-100 text-yellow-800">
        <div class="font-bold">
          Start a tomation project to run tests directly from the page
        </div>
      </div>
      <form class="p-2" @submit.prevent="startProject">
        <div class="mb-3">
          <label class="block text-sm font-medium mb-1">Workspace name</label>
          <input v-model="workspaceName" placeholder="e.g., My Project" class="border rounded px-2 py-1 w-full" title="Give your workspace a descriptive name">
        </div>
        <div class="mb-3">
          <label class="block text-sm font-medium mb-1">Script URL</label>
          <input v-model="workspaceScriptURL" placeholder="https://example.com/script.js" required class="border rounded px-2 py-1 w-full" title="URL to your test automation script">
          <UrlStatus :url="workspaceScriptURL" class="ml-2" @status="handleStatusChange" />
        </div>
        <button class="btn mt-2" @click="startProject">
          Start tomation project
        </button>
      </form>
    </div>
    <div v-else class="p-2 bg-gray-100">
      <div class="font-bold">
        {{ workspace.name }}
      </div>
      <div class="text-sm text-gray-500">
        {{ workspace.host }}
      </div>
    </div>
    <div v-if="workspace" class="flex items-center justify-between p-2">
      <div>
        <span class="opacity-50">Script URL:</span> {{ workspace?.script }}
        <UrlStatus :url="workspace?.script" class="ml-2" @status="handleStatusChange" />
      </div>
    </div>
  </nav>
  <main class="w-full px-2 py-2 text-gray-700">
    <div v-show="isLoading" class="my-2">
      <font-awesome-icon icon="fa-solid fa-spinner" spin /> Loading...
    </div>
    <div v-show="!isLoading && workspace" class="mb-2">
      <div v-if="workspace?.script">
        <div v-if="sidepanelStore.view === 'VIEWER'">
          <TaskExecutionViewer :action="sidepanelStore.initialAction" @@close="closeTaskExecutionViewer" />
        </div>
        <div v-else-if="sidepanelStore.view === 'MAIN'">
          <AutomatedTests :tests="sidepanelStore.automatedTests" class="mt-2" />
          <History class="mt-2" />
        </div>
        <div v-else-if="sidepanelStore.view === 'TEST'">
          <div class="flex">
            <div class="w-11/12 font-bold">
              <div>Test inspector</div>
            </div>
            <div class="grow flex flex-row-reverse">
              <button class="flex-none rounded w-6 ring-1 px-1" title="Close" @click="goTo(VIEWS.MAIN)">
                <font-awesome-icon icon="fa-solid fa-times" />
              </button>
            </div>
          </div>
          <div>
            <ActionViewer :action="(sidepanelStore.viewParams as any)?.action" />
          </div>
        </div>
      </div>
    </div>
    <div>
      <div v-if="existingWorkspaces.length > 0" class="p-2 bg-blue-100 text-blue-800">
        <div class="font-bold">
          Existing workspaces for other hosts:
        </div>
        <div class="flex flex-col">
          <div v-for="ws in existingWorkspaces" :key="ws.id" class="flex justify-between items-center p-2">
            <span>{{ ws.name }} ({{ ws.host }})</span>
            <button class="text-red-500" title="Delete" @click="deleteWorkspace(ws.id)">
              <font-awesome-icon icon="fa-solid fa-trash" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
