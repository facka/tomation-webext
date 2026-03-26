<script setup lang="ts">
import type { Workspace } from '@/logic/workspace/workspace.types'
import { onMounted, ref } from 'vue'
import ActionViewer from '@/components/ActionViewer.vue'
import AutomatedTests from '@/components/AutomatedTests.vue'
import History from '@/components/History.vue'
import TaskExecutionViewer from '@/components/TaskExecutionViewer.vue'
import UrlStatus from '@/components/UrlStatus.vue'
import { useAutomationStore } from '@/composables/automation-store'
import { VIEWS } from '~/logic/views'

const props = defineProps<{
  workspace: Workspace
  tabId: number
  loading: boolean
}>()

const workspace = ref<Workspace>(props.workspace)
const tabId = ref<number>(props.tabId)

const sidepanelStore = useAutomationStore()

const urlStatus = ref<string>('')

onMounted(async () => {
  console.log('Workspace component mounted with workspace:', workspace.value, 'and tabId:', tabId.value)
})

function closeTaskExecutionViewer() {
  sidepanelStore.goTo(VIEWS.MAIN)
}

function goTo(view: VIEWS) {
  sidepanelStore.goTo(view)
}

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
    <div v-if="sidepanelStore.getTomationSession()?.connected ">
      <div v-if="sidepanelStore.view === 'VIEWER'">
        <TaskExecutionViewer :action="sidepanelStore.getTestRun(sidepanelStore.getTomationSession()?.tabId)?.initialAction" @@close="closeTaskExecutionViewer" />
      </div>
      <div v-else-if="sidepanelStore.view === 'MAIN'">
        <UrlStatus :url="workspace?.script" class="mb-2" />
        <AutomatedTests :tests="sidepanelStore.getTomationSession()?.automatedTests" class="mt-2" />
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
          Reload Page
        </button>
      </div>
    </div>
  </main>
</template>
