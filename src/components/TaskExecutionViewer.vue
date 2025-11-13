<script setup lang="ts">
import { computed } from 'vue'
import { sendMessage } from 'webext-bridge/popup'
import ActionViewer from './ActionViewer.vue'
import { useActiveTab } from '~/composables/useActiveTab'

const props = defineProps<{
  action: any
}>()
const emit = defineEmits<{
  (e: '@close'): void
}>()

const action = computed(() => props.action)

function closeRunView() {
  // eslint-disable-next-line vue/custom-event-name-casing
  emit('@close')
}

async function runAction(action: string) {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  sendMessage(action, {}, activeTab)
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
      <button
        class="flex-none rounded w-6 ring-1 px-1"
        title="Play"
        @click="runAction('continue-test')"
      >
        <font-awesome-icon icon="fa-solid fa-play" />
      </button>
      <button
        class="flex-none rounded w-6 ring-1 px-1"
        title="Next"
        @click="runAction('next-test')"
      >
        <font-awesome-icon icon="fa-solid fa-forward-step" />
      </button>
      <button
        class="flex-none rounded w-6 ring-1 px-1"
        title="Pause"
        @click="runAction('pause-test')"
      >
        <font-awesome-icon icon="fa-solid fa-pause" />
      </button>
      <button
        class="flex-none rounded w-6 ring-1 px-1"
        title="Stop"
        @click="runAction('stop-test')"
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
    <ActionViewer :action="action" />
  </main>
</template>
