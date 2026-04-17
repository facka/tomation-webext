<script setup lang="ts">
import { sendMessage } from 'webext-bridge/popup'
import ActionViewer from '@/components/ActionViewer.vue'

const props = defineProps<{
  action: any
}>()

const action = computed(() => props.action)

const sidepanelStore = useAutomationStore()

function closeRunView() {
  sidepanelStore.closeTestViewer()
}

async function runAction(action: string) {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  // sendMessage(action, {}, activeTab)
  sendMessage('sidepanel-to-contentScript', {
    cmd: action,
    params: {},
  }, activeTab)
}
</script>

<template>
  <header class="bg-white sticky top-0 z-50 pt-1">
    <div class="flex">
      <div class="w-11/12 font-bold">
        <div>Automation console</div>
      </div>
      <div class="grow flex flex-row-reverse">
        <button class="flex-none rounded w-6 ring-1 px-1" title="Close" @click="closeRunView()">
          <font-awesome-icon icon="fa-solid fa-times" />
        </button>
      </div>
    </div>
    <div class="mt-2 flex flex-row-reverse gap-1.5 rounded-md border border-gray-200 bg-gray-50 p-1.5 shadow-sm">
      <button
        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-700 transition hover:bg-green-50 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700"
        title="Play"
        :disabled="['running', 'paused', 'cancelled', 'passed', 'failed'].includes(sidepanelStore.testRun?.status || '')"
        @click="runAction('continue-test-request')"
      >
        <font-awesome-icon icon="fa-solid fa-play" />
      </button>

      <button
        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-700 transition hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700"
        title="Next"
        :disabled="['running', 'paused', 'cancelled', 'passed', 'failed'].includes(sidepanelStore.testRun?.status || '')"
        @click="runAction('next-step-request')"
      >
        <font-awesome-icon icon="fa-solid fa-forward-step" />
      </button>

      <button
        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-700 transition hover:bg-amber-50 hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700"
        title="Pause"
        :disabled="['paused', 'cancelled', 'passed', 'failed'].includes(sidepanelStore.testRun?.status || '')"
        @click="runAction('pause-test-request')"
      >
        <font-awesome-icon icon="fa-solid fa-pause" />
      </button>

      <button
        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-700 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700"
        title="Stop"
        :disabled="['paused', 'cancelled', 'passed', 'failed'].includes(sidepanelStore.testRun?.status || '')"
        @click="runAction('stop-test-request')"
      >
        <font-awesome-icon icon="fa-solid fa-stop" />
      </button>

      <button
        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-400 opacity-50"
        :disabled="true"
        title="Forward Fast"
      >
        <font-awesome-icon icon="fa-solid fa-forward-fast" />
      </button>
    </div>
  </header>
  <main class="relative mt-1">
    <div v-if="sidepanelStore.testRun && sidepanelStore.testRun.initialAction && action" class="mt-2">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">
          {{ sidepanelStore.testRun.initialAction.description }}
        </h2>
        <div class="flex items-center gap-2">
          <font-awesome-icon
            :icon="sidepanelStore.testRun.status === 'passed' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'"
            :class="sidepanelStore.testRun.status === 'passed' ? 'text-green-600' : 'text-red-600'"
          />
          <span :class="sidepanelStore.testRun.status === 'passed' ? 'text-green-600' : 'text-red-600'">
            {{ sidepanelStore.testRun.status === 'passed' ? 'Passed' : 'Failed' }}
          </span>
        </div>
      </div>
      <div v-for="step in action.steps" :key="step.id" class="mb-2">
        <ActionViewer v-if="action" :action="step" />
      </div>
    </div>
    <div v-else>
      No initial action defined
    </div>
  </main>
</template>
