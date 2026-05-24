<script setup lang="ts">
import type { Workspace } from '@/logic/workspace/workspace.types'
import { computed, onMounted, ref } from 'vue'
import AutomatedTests from '@/components/AutomatedTests.vue'
import TaskExecutionViewer from '@/components/TaskExecutionViewer.vue'
import Test from '@/components/Test.vue'
import UrlStatus from '@/components/UrlStatus.vue'
import { useAutomationStore } from '@/composables/automation-store'
import { sendMessage } from 'webext-bridge/popup'
import { TomationSessionCmd } from '@/runtime/tomation-session/tomation-session.handlers'

const props = defineProps<{
  workspace: Workspace
  tabId: number
  loading: boolean
}>()

const workspace = computed<Workspace>(() => props.workspace)
const tabId = computed<number>(() => props.tabId)
const loading = computed<boolean>(() => props.loading)

const sidepanelStore = useAutomationStore()

const urlStatus = ref<string>('')

onMounted(async () => {
  console.log('Workspace component mounted with workspace:', workspace.value, 'and tabId:', tabId.value)
})

function openOptionsPage() {
  browser.runtime.openOptionsPage()
}

function updateURLStatus(value: string) {
  urlStatus.value = value
}

function reloadPage() {
  if (tabId.value != null) {
    browser.tabs.reload(tabId.value)
  }
}

async function setupTests() {
  const activeTab = (await useActiveTab().getActiveTab())
  try {
    await sendMessage('sidepanel-to-background', {
      cmd: TomationSessionCmd.SetupTests,
      params: {
        tabId: activeTab.tab.id || 0,
      },
    }, 'background')
  }
  catch (error) {
    console.error('Error setting up tests:', error)
  }
}
</script>

<template>
  <nav class="flex items-center justify-between p-2 bg-gray-100 border-b">
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
  <main v-if="!loading" class="flex-1 w-full px-2 py-2 text-gray-700 relative overflow-y-auto">
    <div v-if="sidepanelStore.tomationSession?.connected ">
      <div v-if="sidepanelStore.view === 'VIEWER'">
        <TaskExecutionViewer :action="sidepanelStore.testRun?.initialAction" />
      </div>
      <div v-else-if="sidepanelStore.view === 'MAIN'">
        <UrlStatus :url="workspace?.script" class="mb-2" @status="updateURLStatus($event)" />
        <div v-if="urlStatus === 'ok'">
          <div v-if="!sidepanelStore.tomationSession?.testsLoaded">
            <button
              class="mb-4 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              @click="setupTests()"
            >
              <font-awesome-icon icon="fa-solid fa-gears" />
              Setup tests
            </button>
            <!-- Tomation Session info -->
            <div v-if="sidepanelStore.tomationSession" class="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              Tomation session: <pre class="font-mono">{{ JSON.stringify(sidepanelStore.tomationSession, null, 2) }}</pre>
            </div>
          </div>
          <div v-else>
            <AutomatedTests :tests="sidepanelStore.tomationSession?.automatedTests" />
          </div>
        </div>
        <div v-if="urlStatus === 'error'" class="flex flex-col items-center gap-4 py-10">
          <font-awesome-icon icon="fa-solid fa-plug-circle-bolt" class="text-gray-400 text-6xl" />
          <div class="text-gray-500 text-sm">
            The script URL is not connected. Please make sure the URL is correct and the server hosting the script is running.
          </div>
        </div>
      </div>
      <div v-else-if="sidepanelStore.view === 'TEST'">
        <Test />
      </div>
    </div>
    <div v-else>
      <UrlStatus :url="workspace?.script" class="mb-2" @status="updateURLStatus($event)" />
      <div v-if="urlStatus === 'no-url'" class="flex flex-col items-center gap-4 py-10">
        <font-awesome-icon icon="fa-solid fa-exclamation-triangle" class="text-gray-400 text-6xl" />
        <div class="text-gray-500 text-sm">
          The script URL is not connected. Missing script URL.
        </div>
      </div>
      <div v-if="urlStatus === 'error'" class="flex flex-col items-center gap-4 py-10">
        <font-awesome-icon icon="fa-solid fa-plug-circle-bolt" class="text-gray-400 text-6xl" />
        <div class="text-gray-500 text-sm">
          The script URL is not connected. Please make sure the URL is correct and the server hosting the script is running.
        </div>
      </div>
      <div v-if="urlStatus === 'ok'" class="flex flex-col items-center gap-4 py-10">
        <font-awesome-icon icon="fa-solid a-check-circle" class="text-gray-400 text-6xl" />
        <div class="text-gray-500 text-sm">
          The server hosting the script is running but the session is not connected.
        </div>
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          @click="reloadPage()"
        >
          Reload Page to Connect
        </button>
      </div>
    </div>
  </main>
</template>
