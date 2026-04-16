<script setup lang="ts">
import { sendMessage } from 'webext-bridge/popup'
import ActionViewer from '@/components/ActionViewer.vue'

const props = defineProps<{
  action: any
}>()
const emit = defineEmits<{
  (e: '@close'): void
}>()

const action = computed(() => props.action)

const sidepanelStore = useAutomationStore()

function closeRunView() {
  // eslint-disable-next-line vue/custom-event-name-casing
  emit('@close')
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
        :disabled="sidepanelStore.testRun?.status === 'running'"
        @click="runAction('continue-test-request')"
      >
        <font-awesome-icon icon="fa-solid fa-play" />
      </button>

      <button
        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-700 transition hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700"
        title="Next"
        :disabled="sidepanelStore.testRun?.status === 'running'"
        @click="runAction('next-step-request')"
      >
        <font-awesome-icon icon="fa-solid fa-forward-step" />
      </button>

      <button
        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-700 transition hover:bg-amber-50 hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700"
        title="Pause"
        :disabled="sidepanelStore.testRun?.status === 'paused'"
        @click="runAction('pause-test-request')"
      >
        <font-awesome-icon icon="fa-solid fa-pause" />
      </button>

      <button
        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-700 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
        title="Stop"
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
    <ActionViewer v-if="action" :action="action" />
    <div v-else>
      No initial action defined
    </div>
  </main>
</template>
