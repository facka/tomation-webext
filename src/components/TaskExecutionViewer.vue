<script setup lang="ts">
import { sendMessage } from 'webext-bridge/popup'
import ActionViewer from '@/components/ActionViewer.vue'

const props = defineProps<{
  action: any
}>()

const action = computed(() => props.action)

const sidepanelStore = useAutomationStore()

const testStatus = computed(() => sidepanelStore.testRun?.status || '')
const isFinished = computed(() => ['passed', 'failed'].includes(testStatus.value))
const headerTitle = computed(() => sidepanelStore.testRun?.initialAction?.description || 'No initial action defined')

const statusIcon = computed(() => {
  if (testStatus.value === 'passed') {
    return 'fa-solid fa-circle-check'
  }
  if (testStatus.value === 'failed') {
    return 'fa-solid fa-circle-xmark'
  }
  if (testStatus.value === 'running') {
    return 'fa-solid fa-circle-play'
  }
  if (testStatus.value === 'paused') {
    return 'fa-solid fa-circle-pause'
  }
  return 'fa-solid fa-circle'
})

const statusClass = computed(() => {
  if (testStatus.value === 'passed') {
    return 'text-green-600'
  }
  if (testStatus.value === 'failed') {
    return 'text-red-600'
  }
  if (testStatus.value === 'running') {
    return 'text-blue-600'
  }
  if (testStatus.value === 'paused') {
    return 'text-amber-600'
  }
  return 'text-gray-400'
})

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
  <header class="sticky top-0 z-50 border border-gray-200 bg-gray-50 p-1.5 shadow-sm">
    <div class="flex items-center gap-2">
      <div class="min-w-0 flex items-center gap-2">
        <h2 class="truncate text-base font-semibold">
          {{ headerTitle }}
        </h2>
        <font-awesome-icon :icon="statusIcon" :class="statusClass" />
      </div>

      <div class="ml-auto flex items-center gap-1.5">
        <template v-if="isFinished">
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-700 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
            title="Close"
            @click="closeRunView()"
          >
            <font-awesome-icon icon="fa-solid fa-times" />
          </button>
        </template>
        <template v-else>
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-700 transition hover:bg-green-50 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700"
            title="Play"
            :disabled="['running', 'cancelled', 'passed', 'failed'].includes(testStatus)"
            @click="runAction('continue-test-request')"
          >
            <font-awesome-icon icon="fa-solid fa-play" />
          </button>

          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-700 transition hover:bg-amber-50 hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700"
            title="Pause"
            :disabled="['paused', 'cancelled', 'passed', 'failed'].includes(testStatus)"
            @click="runAction('pause-test-request')"
          >
            <font-awesome-icon icon="fa-solid fa-pause" />
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
            class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-700 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700"
            title="Stop"
            :disabled="['paused', 'cancelled', 'passed', 'failed'].includes(sidepanelStore.testRun?.status || '')"
            @click="runAction('stop-test-request')"
          >
            <font-awesome-icon icon="fa-solid fa-stop" />
          </button>
        </template>
      </div>
    </div>
  </header>
  <main class="relative mt-1">
    <div v-if="sidepanelStore.testRun && sidepanelStore.testRun.initialAction && action" class="mt-2">
      <div v-for="step in action.steps" :key="step.id" class="mb-2">
        <ActionViewer v-if="action" :action="step" />
      </div>
    </div>
    <div v-else>
      No initial action defined
    </div>
  </main>
</template>
