<script setup lang="ts">
import { sendMessage } from 'webext-bridge/popup'
import AutomatedTests from '../components/AutomatedTests.vue'
import TaskExecutionViewer from '../components/TaskExecutionViewer.vue'
import ActionViewer from '../components/ActionViewer.vue'
import History from '../components/History.vue'
import { useAutomationStore } from './automation-store'
import { tomationStorage } from '~/logic/storage'
import { useActiveTab } from '~/composables/useActiveTab'
import UrlStatus from '~/components/UrlStatus.vue'
import { VIEWS } from '~/logic/views'

const sidepanelStore = useAutomationStore()

const isLoading = ref(false)
const activeTabId = ref<any>(null)

async function updateActiveTabId() {
  const res = await useActiveTab().getActiveTab()
  // get id from returned object (it may be res.tab.id)
  activeTabId.value = res?.tab?.id ?? null
  isLoading.value = activeTabId.value != null && sidepanelStore.tabStatus[activeTabId.value] === 'loading'
}

onMounted(() => {
  updateActiveTabId()
})

// Keep isLoading updated when tabStatus changes
watch(
  () => sidepanelStore.tabStatus,
  () => {
    if (activeTabId.value != null) {
      isLoading.value = sidepanelStore.tabStatus[activeTabId.value] === 'loading'
    }
  },
  { deep: true },
)

function openOptionsPage() {
  browser.runtime.openOptionsPage()
}

function closeTaskExecutionViewer() {
  tomationStorage.value.view = VIEWS.MAIN
  sidepanelStore.view = VIEWS.MAIN
}

function goTo(view: VIEWS) {
  tomationStorage.value.view = view
}

async function handleStatusChange(status: 'no-url' | 'checking' | 'ok' | 'error') {
  console.log('URL Status changed: ', status)
  // when status is OK we should refresh the page
  const activeTab = await useActiveTab().getActiveTab()
  sendMessage('sidepanel-to-contentScript', {
    cmd: 'refresh-page',
  }, activeTab.destination)
}
</script>

<template>
  <nav class="w-full">
    <div class="flex items-center justify-between p-2">
      <div>
        <span class="opacity-50">Script URL:</span> {{ tomationStorage.scriptURL }}
        <UrlStatus :url="tomationStorage.scriptURL" class="ml-2" @status="handleStatusChange" />
      </div>
      <button class="btn" title="Options" @click="openOptionsPage">
        <font-awesome-icon icon="fa-solid fa-gear" />
      </button>
    </div>
  </nav>
  <main class="w-full px-2 py-2 text-gray-700">
    <div v-show="isLoading" class="my-2">
      <font-awesome-icon icon="fa-solid fa-spinner" spin /> Loading...
    </div>
    <div v-show="!isLoading" class="mb-2">
      <div v-if="tomationStorage.scriptURL">
        <div v-if="tomationStorage.view === 'VIEWER'">
          <TaskExecutionViewer :action="sidepanelStore.initialAction" @@close="closeTaskExecutionViewer" />
        </div>
        <div v-else-if="tomationStorage.view === 'MAIN'">
          <AutomatedTests :tests="tomationStorage.automatedTests" class="mt-2" />
          <History class="mt-2" />
        </div>
        <div v-else-if="tomationStorage.view === 'TEST'">
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
            <ActionViewer :action="tomationStorage.viewParams?.action" />
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
