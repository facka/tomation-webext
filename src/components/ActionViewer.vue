<script setup lang="ts">
import { computed } from 'vue'
import { sendMessage } from 'webext-bridge/popup'
import { ACTION_STATUS } from 'tomation'
import Expandable from '../design-system/Expandable.vue'
import { useAutomationStore } from '../sidepanel/automation-store'
import { useActiveTab } from '~/composables/useActiveTab'

const props = defineProps<{
  action: any
}>()

const store = useAutomationStore()

const action = computed(() => props.action)

const status = computed(() => {
  return store.getActionById(action.value.id)?.status || ACTION_STATUS.WAITING
})
const error = computed(() => {
  return store.getActionById(action.value.id)?.error || ''
})
const context = computed(() => {
  return store.getActionById(action.value.id)?.context || {}
})
const tries = computed(() => {
  return store.getActionById(action.value.id)?.tries
})

async function displayHTML() {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  sendMessage('displayActionContext', {
    context: context.value,
  }, activeTab)
}

async function userAccepted() {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  sendMessage('user-accept', {
    context: context.value,
  }, activeTab)
}

async function userRejected() {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  sendMessage('user-reject', {
    context: context.value,
  }, activeTab)
}

async function skipAction() {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  sendMessage('skip-action', {
    context: context.value,
  }, activeTab)
}

async function retryAction() {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  sendMessage('retry-action', {
    context: context.value,
  }, activeTab)
}
</script>

<template>
  <div v-if="action?.type === 'Action'" class="mt-1">
    <Expandable expanded>
      <template #header>
        <div class="flex">
          <span class="grow" :class="{ 'text-red-600': status === ACTION_STATUS.ERROR, 'text-gray-500': status === ACTION_STATUS.WAITING }">
            <span>{{ action.description }}</span>
            <span
              v-if="action.params && Object.keys(action.params).length"
              :title="JSON.stringify(action.params)"
              class="cursor-pointer text-cyan-600"
            > ({{ Object.keys(action.params).length }})</span>
          </span>
          <div class="flex-none w-6 pl-2 font-bold">
            <font-awesome-icon v-if="status === ACTION_STATUS.PAUSED" class="text-orange-500" icon="fa-solid fa-pause" />
            <font-awesome-icon v-if="status === ACTION_STATUS.RUNNING" class="text-blue-500" icon="fa-solid fa-person-running" />
            <font-awesome-icon v-if="status === ACTION_STATUS.SUCCESS" class="text-green-500" icon="fa-solid fa-check" />
            <font-awesome-icon v-if="status === ACTION_STATUS.ERROR" class="text-red-600" icon="fa-solid fa-times" />
          </div>
        </div>
      </template>
      <div
        v-for="(step, index) in action.steps"
        :key="index"
        :class="{ 'pb-2': index === (action.steps.length - 1) }"
      >
        <ActionViewer :action="step" />
      </div>
    </Expandable>
  </div>
  <div v-else>
    <div class="flex border-b-2 border-gray-200">
      <div class="grow py-1">
        <span :class="{ 'text-blue-600': status === ACTION_STATUS.RUNNING, 'text-gray-500': status === ACTION_STATUS.WAITING }">{{ action.description }}</span>
        <span v-if="tries && tries >= 1" class="text-gray-500"> Tries {{ tries }}/10</span>
        <div v-if="error" class="text-red-600">
          Error: {{ error }}
        </div>
      </div>
      <div v-if="status === ACTION_STATUS.SUCCESS || status === ACTION_STATUS.ERROR" class="flex-none w-6 font-bold py-1">
        <a class="cursor-pointer text-cyan-600" @click="displayHTML()">
          <font-awesome-icon icon="fa-solid fa-eye" />
        </a>
      </div>
      <div class="flex-none w-6 font-bold py-1">
        <font-awesome-icon v-if="status === ACTION_STATUS.PAUSED" class="text-orange-500" icon="fa-solid fa-pause" />
        <font-awesome-icon v-if="status === ACTION_STATUS.RUNNING" class="text-blue-500" icon="fa-solid fa-person-running" />
        <font-awesome-icon v-if="status === ACTION_STATUS.SUCCESS" class="text-green-500" icon="fa-solid fa-check" />
        <font-awesome-icon v-if="status === ACTION_STATUS.ERROR" class="text-red-600" icon="fa-solid fa-times" />
      </div>
    </div>
    <div v-if="action.type === 'ManualStep' && status === ACTION_STATUS.RUNNING" class="flex justify-start gap-1 mt-1">
      <button type="button" class="border border-cyan-500 px-2" @click="userAccepted">
        Accept
      </button>
      <button type="button" class="border border-red-800 px-2" @click="userRejected">
        Reject
      </button>
    </div>
    <div v-if="status === ACTION_STATUS.PAUSED" class="flex justify-start gap-1 mt-1">
      <button type="button" class="border border-cyan-500 px-2" @click="skipAction">
        Skip
      </button>
      <button type="button" class="border border-cyan-500 px-2" @click="retryAction">
        Retry
      </button>
    </div>
  </div>
</template>
