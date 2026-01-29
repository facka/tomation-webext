<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { sendMessage } from 'webext-bridge/popup'
import ActionViewer from '@/components/ActionViewer.vue'
import AutomatedTests from '@/components/AutomatedTests.vue'
import History from '@/components/History.vue'
import TaskExecutionViewer from '@/components/TaskExecutionViewer.vue'
import UrlStatus from '@/components/UrlStatus.vue'
import { useAutomationStore } from '@/composables/automation-store'
import { useActiveTab } from '@/composables/useActiveTab'
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
  sidepanelStore.goTo(VIEWS.MAIN)
}

function goTo(view: VIEWS) {
  sidepanelStore.goTo(view)
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
        <span class="opacity-50">Script URL:</span> {{ sidepanelStore.scriptURL }}
        <UrlStatus :url="sidepanelStore.scriptURL" class="ml-2" @status="handleStatusChange" />
      </div>
      <button class="btn" title="Options" @click="openOptionsPage">
        <font-awesome-icon icon="fa-solid fa-gear" />
      </button>
    </div>
  </nav>
  <main class="w-full px-2 py-2 text-gray-700">
    <pre>VIEW: {{ sidepanelStore.view }}</pre>
    <div v-show="isLoading" class="my-2">
      <font-awesome-icon icon="fa-solid fa-spinner" spin /> Loading...
    </div>
    <div v-show="!isLoading" class="mb-2">
      <div v-if="sidepanelStore.scriptURL">
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
  </main>
</template>
