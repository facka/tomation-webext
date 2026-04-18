<script setup lang="ts">
import { computed } from 'vue'
import ActionViewer from '@/components/ActionViewer.vue'
import { useAutomationStore } from '@/composables/automation-store'
import { VIEWS } from '~/logic/views'

const sidepanelStore = useAutomationStore()

const actionsByIdEntries = computed(() => {
  if (!sidepanelStore.currentSelectedTest) {
    return []
  }

  // extract actions from current selected test (not the test run)
  const actionsById = new Map<string, any>()
  const queue = [sidepanelStore.currentSelectedTest.initialAction]

  while (queue.length > 0) {
    const action = queue.shift()
    if (action) {
      actionsById.set(action.id, action)
      if (action.steps) {
        queue.push(...action.steps)
      }
    }
  }

  return Array.from(actionsById.entries()).map(([id, action]) => ({
    id,
    description: action?.description ?? '',
    status: action?.status ?? '',
    tries: action?.tries ?? 0,
    error: action?.error ?? null,
  }))
})

function goTo(view: VIEWS) {
  sidepanelStore.goTo(view)
}
</script>

<template>
  <div>
    <div class="flex">
      <div class="w-11/12 font-bold">
        <h3>Test</h3>
      </div>

      <div class="grow flex flex-row-reverse">
        <button class="flex-none rounded w-6 ring-1 px-1" title="Close" @click="goTo(VIEWS.MAIN)">
          <font-awesome-icon icon="fa-solid fa-times" />
        </button>
      </div>
    </div>

    <h3 class="font-bold mt-2">
      {{ sidepanelStore.currentSelectedTest?.initialAction.description }}
    </h3>

    <div v-for="(step, index) in sidepanelStore.currentSelectedTest?.initialAction.steps" :key="index">
      <ActionViewer :action="step" />
    </div>

    <details class="mt-4 rounded border border-amber-200 bg-amber-50 p-2">
      <summary class="cursor-pointer text-xs font-semibold text-amber-800">
        Debug: current test run actionsById ({{ actionsByIdEntries.length }})
      </summary>
      <pre class="mt-2 max-h-56 overflow-auto rounded bg-white p-2 text-xs text-slate-700">{{ JSON.stringify(actionsByIdEntries, null, 2) }}</pre>
    </details>
  </div>
</template>
