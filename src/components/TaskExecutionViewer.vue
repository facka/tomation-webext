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
    <div class="p-1 mt-1 border border-1 flex flex-row-reverse space-x-1">
      <pre>{{ sidepanelStore.testRun?.status }}</pre>
      <button
        class="flex-none rounded w-6 ring-1 px-1 disabled:text-gray-500 disabled:cursor-not-allowed"
        title="Play"
        :disabled="sidepanelStore.testRun?.status === 'running'"
        @click="runAction('continue-test-request')"
      >
        <font-awesome-icon icon="fa-solid fa-play" />
      </button>
      <button
        class="flex-none rounded w-6 ring-1 px-1 disabled:text-gray-500 disabled:cursor-not-allowed"
        title="Next"
        :disabled="sidepanelStore.testRun?.status === 'running'"
        @click="runAction('next-step-request')"
      >
        <font-awesome-icon icon="fa-solid fa-forward-step" />
      </button>
      <button
        class="flex-none rounded w-6 ring-1 px-1 disabled:text-gray-500 disabled:cursor-not-allowed"
        title="Pause"
        :disabled="sidepanelStore.testRun?.status === 'paused'"
        @click="runAction('pause-test-request')"
      >
        <font-awesome-icon icon="fa-solid fa-pause" />
      </button>
      <button
        class="flex-none rounded w-6 ring-1 px-1"
        title="Stop"
        @click="runAction('stop-test-request')"
      >
        <font-awesome-icon icon="fa-solid fa-stop" />
      </button>
      <button
        class="flex-none rounded w-6 ring-1 px-1"
        :disabled="true" title="Forward Fast"
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
