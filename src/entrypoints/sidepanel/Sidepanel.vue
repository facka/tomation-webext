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
const newWorkspaceForm = {
  name: ref<string>(''),
  scriptURL: ref<string>(''),
}

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
      isLoading.value = sidepanelStore.tabsInfoById[activeTabId.value]?.status === 'loading'
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
  newWorkspaceForm.name.value = currentTabTitle.value || ''
  newWorkspaceForm.scriptURL.value = ''
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
      name: newWorkspaceForm.name.value.trim(),
      host: currentTabHost.value,
      script: newWorkspaceForm.scriptURL.value.trim() || undefined,
    },
  }, 'background')
  workspace.value = newWorkspace as Workspace
  await reloadTests()
}

function openOptionsPage() {
  browser.runtime.openOptionsPage()
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Top Navbar (only for workspace state) -->
    <nav v-if="workspace" class="flex items-center justify-between p-2 bg-gray-100 border-b">
      <div class="flex-1">
        <div class="text-sm font-medium text-gray-700">
          <span class="font-bold">{{ workspace.name }}</span> | <span class="text-gray-500">{{ workspace.host }}</span>
        </div>
      </div>
      <button
        class="flex-none ml-2 p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition"
        title="Open settings and all workspaces"
        @click="openOptionsPage()"
      >
        <font-awesome-icon icon="fa-solid fa-gear" />
      </button>
    </nav>

    <!-- Main Content -->
    <main class="flex-1 w-full px-2 py-2 text-gray-700 relative overflow-y-auto">
      <div v-show="isLoading" class="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="flex flex-col items-center gap-2 bg-white/80 px-4 py-3 rounded-lg shadow-lg">
          <font-awesome-icon icon="fa-solid fa-spinner" spin class="text-lg" />
          <span>Loading...</span>
        </div>
      </div>

      <div v-if="!workspace" class="flex flex-col h-full">
        <!-- Hero Section -->
        <div class="text-center py-6 px-4">
          <h1 class="text-2xl font-bold text-gray-800 mb-2">
            Welcome to Tomation
          </h1>
          <p class="text-gray-600 text-sm">
            Automate and test your web applications directly from your browser
          </p>
        </div>

        <!-- Create Workspace Form -->
        <div class="px-4 py-4 bg-white rounded-lg border border-gray-200 mb-6">
          <h2 class="font-bold text-lg mb-4 text-gray-800">
            Start a New Project
          </h2>
          <form @submit.prevent="startProject">
            <div class="mb-3">
              <label class="block text-sm font-medium mb-1 text-gray-700">
                Workspace name
                <button type="button" class="inline-ml-1 text-gray-500 hover:text-gray-700" title="A descriptive name for your workspace project">
                  <font-awesome-icon icon="fa-solid fa-circle-info" />
                </button>
              </label>
              <input v-model="newWorkspaceForm.name.value" placeholder="e.g., My Project" class="border rounded px-2 py-1 w-full text-sm" title="Give your workspace a descriptive name">
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium mb-1 text-gray-700">
                Script URL
                <button type="button" class="inline-ml-1 text-gray-500 hover:text-gray-700" title="URL pointing to your test automation script file">
                  <font-awesome-icon icon="fa-solid fa-circle-info" />
                </button>
              </label>
              <input v-model="newWorkspaceForm.scriptURL.value" placeholder="https://example.com/script.js" required class="border rounded px-2 py-1 w-full text-sm" title="URL to your test automation script">
              <UrlStatus v-if="newWorkspaceForm.scriptURL.value" :url="newWorkspaceForm.scriptURL.value" />
            </div>
            <button class="btn w-full" @click="startProject">
              Start tomation project
            </button>
          </form>
        </div>

        <!-- Features Section -->
        <div class="flex-1 px-4 pb-4">
          <h3 class="font-bold text-gray-800 mb-3">
            Key Features
          </h3>
          <div class="space-y-2 text-sm text-gray-700">
            <div class="flex items-start gap-2">
              <font-awesome-icon icon="fa-solid fa-check" class="text-green-600 mt-0.5 flex-shrink-0" />
              <span>Run automated tests directly in your browser</span>
            </div>
            <div class="flex items-start gap-2">
              <font-awesome-icon icon="fa-solid fa-check" class="text-green-600 mt-0.5 flex-shrink-0" />
              <span>Record and replay user interactions</span>
            </div>
            <div class="flex items-start gap-2">
              <font-awesome-icon icon="fa-solid fa-check" class="text-green-600 mt-0.5 flex-shrink-0" />
              <span>Track test execution history</span>
            </div>
            <div class="flex items-start gap-2">
              <font-awesome-icon icon="fa-solid fa-check" class="text-green-600 mt-0.5 flex-shrink-0" />
              <span>Manage multiple workspace projects</span>
            </div>
            <div class="flex items-start gap-2">
              <font-awesome-icon icon="fa-solid fa-check" class="text-green-600 mt-0.5 flex-shrink-0" />
              <span>Monitor test status in real-time</span>
            </div>
          </div>
        </div>
      </div>

      <div v-show="workspace" class="mb-2">
        <div v-if="workspace?.script">
          <div v-if="sidepanelStore.view === 'VIEWER'">
            <TaskExecutionViewer :action="sidepanelStore.initialAction" @@close="closeTaskExecutionViewer" />
          </div>
          <div v-else-if="sidepanelStore.view === 'MAIN'">
            <UrlStatus :url="workspace?.script" class="mb-2" />
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
              <h3 class="font-bold mt-2">
                {{ (sidepanelStore.viewParams as any)?.action.description }}
              </h3>
              <div v-for="(step, index) in (sidepanelStore.viewParams as any)?.action.steps" :key="index">
                <ActionViewer :action="step" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
