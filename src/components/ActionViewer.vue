<script setup lang="ts">
import { ACTION_STATUS } from 'tomation'
import { sendMessage } from 'webext-bridge/popup'
import Expandable from '@/components/design-system/Expandable.vue'

const props = defineProps<{
  action: any
}>()

const sidepanelStore = useAutomationStore()
const expandableElem = ref()

watch(props.action, (newAction) => {
  // scroll to the action div
  const actionDiv = document.getElementById(`action-${newAction.id}`)
  if (actionDiv) {
    actionDiv.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}, { immediate: true })

const action = computed(() => props.action || {})

// build actionsById map for the current selected test run initial action and its steps
const actionsById = computed(() => {
  const map = new Map<string, any>()
  const queue = sidepanelStore.testRun ? [sidepanelStore.testRun?.initialAction] : []
  while (queue.length > 0) {
    const action = queue.shift()
    if (action) {
      map.set(action.id, action)
      if (action.steps) {
        queue.push(...action.steps)
      }
    }
  }
  return map
})

const allStepsSuccessful = computed(() => {
  if (action.value.type === 'Action' && Array.isArray(action.value.steps)) {
    return action.value.steps.every((step: any) => {
      const stepStatus = actionsById.value.get(step.id)?.status
      return stepStatus === ACTION_STATUS.SUCCESS
    })
  }
  return false
})

// Collapse when all steps are successful
watch(allStepsSuccessful, (successful) => {
  if (successful) {
    expandableElem.value.collapse()
  }
  else {
    expandableElem.value.expand()
  }
})

const status = computed(() => {
  return (actionsById.value.get(action.value.id)?.status) || ACTION_STATUS.WAITING
})
const error = computed(() => {
  return (actionsById.value.get(action.value.id)?.error) || ''
})
const context = computed(() => {
  return (actionsById.value.get(action.value.id)?.context) || {}
})
const tries = computed(() => {
  return (actionsById.value.get(action.value.id)?.tries) || 0
})

async function displayHTML() {
  /*
  TODO fix event and implement in content script

  const activeTab = (await useActiveTab().getActiveTab()).destination
  sendMessage('displayActionContext', {
    context: context.value,
  }, activeTab)}
  */
}

async function userAccepted() {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  sendMessage('sidepanel-to-contentScript', {
    cmd: 'user-accept-request',
    params: {
      context: context.value,
    },
  }, activeTab)
}

async function userRejected() {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  sendMessage('sidepanel-to-contentScript', {
    cmd: 'user-reject-request',
    params: {
      context: context.value,
    },
  }, activeTab)
}

async function skipAction() {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  sendMessage('sidepanel-to-contentScript', {
    cmd: 'skip-action-request',
    params: {
      context: context.value,
    },
  }, activeTab)
}

async function retryAction() {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  sendMessage('sidepanel-to-contentScript', {
    cmd: 'retry-action-request',
    params: {
      context: context.value,
    },
  }, activeTab)
}
</script>

<template>
  <div :id="`action-${action.id}`" />
  <div v-if="action?.type === 'Action'" class="mt-1 text-left">
    <Expandable ref="expandableElem" expanded>
      <template #header>
        <div class="flex">
          <span class="grow" :class="{ 'text-red-600': status === ACTION_STATUS.ERROR, 'text-gray-500': status === ACTION_STATUS.WAITING }">
            <span>{{ action.description }}</span>
            <span
              v-if="action.params && Object.keys(action.params).length"
              :title="JSON.stringify(action.params)"
              class="cursor-pointer text-cyan-600"
            > ({{ Object.keys(action.params).length === 1 ? Object.values(action.params)[0] : Object.keys(action.params).length }})
            </span>
            <div class="flex-none w-6 pl-2 font-bold">
              <font-awesome-icon v-if="status === ACTION_STATUS.PAUSED" class="text-orange-500" icon="fa-solid fa-pause" />
              <font-awesome-icon v-if="status === ACTION_STATUS.RUNNING" class="text-blue-500" icon="fa-solid fa-person-running" />
              <font-awesome-icon v-if="status === ACTION_STATUS.SUCCESS" class="text-green-500" icon="fa-solid fa-check" />
              <font-awesome-icon v-if="status === ACTION_STATUS.ERROR" class="text-red-600" icon="fa-solid fa-times" />
            </div>
          </span>
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
  <!--
  <div v-else-if="action.type === 'If'">
    <Expandable :expanded="true">
      <template #header>
        <div class="flex">
          <span class="grow" :class="{ 'text-red-600': status === ACTION_STATUS.ERROR, 'text-gray-500': status === ACTION_STATUS.WAITING }">
            <span>IF {{ action.conditionDescription }}</span>
          </span>
          <div class="flex-none w-6 pl-2 font-bold">
            <font-awesome-icon v-if="status === ACTION_STATUS.PAUSED" class="text-orange-500" icon="fa-solid fa-pause" />
            <font-awesome-icon v-if="status === ACTION_STATUS.RUNNING" class="text-blue-500" icon="fa-solid fa-person-running" />
            <font-awesome-icon v-if="status === ACTION_STATUS.SUCCESS" class="text-green-500" icon="fa-solid fa-check" />
            <font-awesome-icon v-if="status === ACTION_STATUS.ERROR" class="text-red-600" icon="fa-solid fa-times" />
          </div>
        </div>
      </template>
      <div class="mt-1 mb-1">
        <div class="font-bold">
          Then:
        </div>
        <ActionViewer :action="action.ifAction" />
        <div v-if="action.elseAction" class="mt-2">
          <div class="font-bold">
            Else:
          </div>
          <ActionViewer :action="action.elseAction" />
        </div>
      </div>
    </Expandable>
  </div>
  -->
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
