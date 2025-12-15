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
  <main class="w-full px-4 py-5 text-center text-gray-700">
    <h3>Tomation Web Extension</h3>
    <button class="btn mt-2" @click="openOptionsPage">
      Open Options
    </button>
    <div class="mt-2">
      <span class="opacity-50">Script URL:</span> {{ tomationStorage.scriptURL }}
      <UrlStatus :url="tomationStorage.scriptURL" class="ml-2" @status="handleStatusChange" />
    </div>
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
  </main>
</template>
