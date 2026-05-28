<script setup lang="ts">
import { ACTION_STATUS } from 'tomation'
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
  /* const map = new Map<string, any>()
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
  */
  return sidepanelStore.testRun?.actionsById || new Map<string, any>()
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
const waitingOpacityClass = computed(() => (status.value === ACTION_STATUS.WAITING ? 'opacity-50' : 'opacity-100'))
const error = computed(() => {
  return (actionsById.value.get(action.value.id)?.error) || ''
})
const context = computed(() => {
  return (actionsById.value.get(action.value.id)?.context) || {}
})
const tries = computed(() => {
  return (actionsById.value.get(action.value.id)?.tries) || 0
})

function getStatusIcon(status: string) {
  if (status === ACTION_STATUS.PAUSED) {
    return 'fa-solid fa-pause'
  }
  if (status === ACTION_STATUS.RUNNING) {
    return 'fa-solid fa-person-running'
  }
  if (status === ACTION_STATUS.SUCCESS) {
    return 'fa-solid fa-check'
  }
  if (status === ACTION_STATUS.ERROR) {
    return 'fa-solid fa-times'
  }
  return 'fa-solid fa-clock'
}

function getStatusIconClass(status: string) {
  if (status === ACTION_STATUS.PAUSED) {
    return 'bg-amber-100 text-amber-700'
  }
  if (status === ACTION_STATUS.RUNNING) {
    return 'bg-sky-100 text-sky-700'
  }
  if (status === ACTION_STATUS.SUCCESS) {
    return 'bg-emerald-100 text-emerald-700'
  }
  if (status === ACTION_STATUS.ERROR) {
    return 'bg-rose-100 text-rose-700'
  }
  return 'bg-slate-100 text-slate-500'
}

function getStatusTextClass(status: string) {
  if (status === ACTION_STATUS.ERROR) {
    return 'text-rose-700'
  }
  if (status === ACTION_STATUS.RUNNING) {
    return 'text-sky-700'
  }
  if (status === ACTION_STATUS.WAITING) {
    return 'text-slate-500'
  }
  return 'text-slate-700'
}

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
  await sidepanelStore.sendCommandForActiveTab('user-accept-request', {
    context: context.value,
  })
}

async function userRejected() {
  await sidepanelStore.sendCommandForActiveTab('user-reject-request', {
    context: context.value,
  })
}

async function skipAction() {
  await sidepanelStore.sendCommandForActiveTab('skip-action-request', {
    context: context.value,
  })
}

async function retryAction() {
  await sidepanelStore.sendCommandForActiveTab('retry-action-request', {
    context: context.value,
  })
}
</script>

<template>
  <div :id="`action-${action.id}`" class="mb-2" />
  <div v-if="action?.type === 'Action'" class="text-left">
    <Expandable ref="expandableElem" expanded>
      <template #header>
        <div class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm" :class="waitingOpacityClass">
          <div class="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs" :class="getStatusIconClass(status)">
            <font-awesome-icon :icon="getStatusIcon(status)" />
          </div>
          <div class="grow min-w-0">
            <div class="flex items-center" :class="getStatusTextClass(status)">
              <span class="font-medium">{{ action.description }}</span>
              <span
                v-if="action.params && Object.keys(action.params).length"
                :title="JSON.stringify(action.params)"
                class="ml-1 inline-flex cursor-pointer items-center rounded-full bg-cyan-50 px-1.5 py-0.5 text-xs text-cyan-700"
              >{{ Object.keys(action.params).length === 1 ? Object.values(action.params)[0] : Object.keys(action.params).length }}
              </span>
            </div>
            <div class="text-[10px] leading-4 text-slate-400">
              {{ action.id }}
            </div>
          </div>
          <div v-if="tries && tries >= 1" class="mt-0.5 flex-none rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {{ tries }}/10
          </div>
        </div>
      </template>
      <div
        v-for="(step, index) in action.steps"
        :key="index"
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
    <div class="rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm" :class="waitingOpacityClass">
      <div class="flex items-center gap-2">
        <div class="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs" :class="getStatusIconClass(status)">
          <font-awesome-icon :icon="getStatusIcon(status)" />
        </div>
        <div class="grow min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium leading-5" :class="getStatusTextClass(status)">{{ action.description }}</span>
            <span v-if="tries && tries >= 1" class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Tries {{ tries }}/10</span>
          </div>
          <div class="text-[10px] leading-4 text-slate-400">
            {{ action.id }}
          </div>
          <div v-if="error" class="mt-2 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-sm text-rose-700">
            Error: {{ error }}
          </div>
        </div>
        <div v-if="status === ACTION_STATUS.SUCCESS || status === ACTION_STATUS.ERROR" class="flex-none self-start">
          <button
            type="button"
            class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-cyan-700 transition hover:border-cyan-200 hover:bg-cyan-50"
            title="Display HTML"
            @click="displayHTML()"
          >
            <font-awesome-icon icon="fa-solid fa-eye" />
          </button>
        </div>
      </div>
    </div>
    <div v-if="action.type === 'ManualStep' && status === ACTION_STATUS.RUNNING" class="mt-2 flex flex-wrap justify-start gap-2">
      <button type="button" class="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100" @click="userAccepted">
        Accept
      </button>
      <button type="button" class="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100" @click="userRejected">
        Reject
      </button>
    </div>
    <div v-if="status === ACTION_STATUS.PAUSED" class="mt-2 flex flex-wrap justify-start gap-2">
      <button type="button" class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50" @click="skipAction">
        Skip
      </button>
      <button type="button" class="rounded-md border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100" @click="retryAction">
        Retry
      </button>
    </div>
  </div>
</template>
