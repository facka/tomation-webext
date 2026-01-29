<script setup lang="ts">
import dayjs from 'dayjs'
import ExpandableSection from '@/components/design-system/ExpandableSection.vue'
import { VIEWS } from '@/logic/views'

const sidepanelStore = useAutomationStore()

function clearHistory() {
  sidepanelStore.history.length = 0
}

function goTo(view: VIEWS, viewParams: any = {}) {
  sidepanelStore.goTo(view, viewParams)
}

function openTest(action: any) {
  goTo(VIEWS.TEST, {
    action,
  })
}
</script>

<template>
  <ExpandableSection title="History" :loading="false">
    <template #summary>
      <div v-show="sidepanelStore.history.length">
        Total {{ sidepanelStore.history?.length || 0 }}
      </div>
    </template>
    <div
      v-for="(elem, index) in sidepanelStore.history as any[]"
      :key="index"
      class="flex border-b-2 border-gray-200"
      :class="{ 'pb-2': index === (sidepanelStore.history?.length - 1) }"
    >
      <span
        class="grow cursor-pointer"
        @click="openTest(elem.action)"
      >
        <span class="text-gray-500">{{ dayjs(elem.startedAt).format('YYYY/MM/DD HH:mm') }}: </span>
        <span>{{ elem?.action?.description }}</span>
      </span>
      <div class="flex-none w-6 font-bold text-center">
        <font-awesome-icon v-if="elem?.result === 'PASSED'" class="text-green-500" icon="fa-solid fa-check" />
        <font-awesome-icon v-if="elem?.result === 'FAILED'" class="text-red-600" icon="fa-solid fa-times" />
      </div>
    </div>
    <div v-if="!sidepanelStore.history?.length">
      No tests run yet
    </div>
    <div v-else>
      <button class="flex-none rounded w-6 text-rose-500 ring-1 px-1 mt-2" title="Clear history" @click="clearHistory()">
        <font-awesome-icon icon="fa-solid fa-trash" />
      </button>
    </div>
  </ExpandableSection>
</template>
