<script setup lang="ts">
import { onMounted } from 'vue'
import AutomatedTests from '../components/AutomatedTests.vue'
import TaskExecutionViewer from '../components/TaskExecutionViewer.vue'
import ActionViewer from '../components/ActionViewer.vue'
import History from '../components/History.vue'
import { useAutomationStore } from './automation-store'
import { tomationStorage } from '~/logic/storage'

const store = useAutomationStore()

onMounted(() => {
  store.refreshData()
})

function openOptionsPage() {
  browser.runtime.openOptionsPage()
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
    </div>
    <div v-if="!store.loading" class="mt-2">
      <div v-if="store.runningTask || !store.closedRunView">
        <TaskExecutionViewer :action="store.initialAction" @@close="store.closeTaskExecutionViewer" />
      </div>
      <div v-else-if="store.view === 'MAIN'">
        <AutomatedTests :tests="store.automatedTests" class="mt-2" />
        <History class="mt-2" />
      </div>
      <div v-else-if="store.view === 'TEST'">
        <div class="flex">
          <div class="w-11/12 font-bold">
            <div>Test inspector</div>
          </div>
          <div class="grow flex flex-row-reverse">
            <button class="flex-none rounded w-6 ring-1 px-1" title="Close" @click="store.goTo('MAIN')">
              <font-awesome-icon icon="fa-solid fa-times" />
            </button>
          </div>
        </div>
        <div>
          <ActionViewer :action="store.viewParams?.action" />
        </div>
      </div>
    </div>
    <div v-else-if="!store.dataError">
      Loading...
    </div>
    <div v-else>
      No data
    </div>
  </main>
</template>
