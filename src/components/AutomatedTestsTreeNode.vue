<script setup lang="ts">
import Expandable from '@/components/design-system/Expandable.vue'
import { createUIAdapter } from '@/messaging'

const props = defineProps<{
  node: TreeNode
  isFavorite?: (testId: string) => boolean
  toggleFavorite?: (testId: string) => void
}>()

const sidepanelStore = useAutomationStore()
const messaging = createUIAdapter()

const node = computed(() => props.node)
const testId = computed(() => {
  if (node.value.path) {
    return `${node.value.path}/${node.value.name}`
  }
  else {
    return node.value.name
  }
})

type TreeNode = {
  name: string
  path: string
  children: TreeNode[]
}

async function runTest(testId: string) {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  console.log('Run test Request: ', testId)
  messaging.sendMessage('sidepanel-to-contentScript', {
    cmd: 'run-test-request',
    params: {
      testId,
    },
  }, activeTab)
}

async function openTest() {
  console.log('Opening test with id:', testId.value)
  sidepanelStore.openTest(testId.value)
}

function onToggleFavorite() {
  props.toggleFavorite?.(testId.value)
}
</script>

<template>
  <div v-if="node.children.length" class="text-left">
    <Expandable :loading="false" expanded>
      <template #header>
        <div>{{ node.name }}</div>
      </template>
      <div>
        <div
          v-for="(childNode, index) in node.children"
          :key="index"
        >
          <AutomatedTestsTreeNode :node="childNode" :is-favorite="props.isFavorite" :toggle-favorite="props.toggleFavorite" />
        </div>
      </div>
    </Expandable>
  </div>
  <div v-else>
    <div class="flex">
      <div class="grow py-1">
        <div class="group inline-flex items-center gap-1.5">
          <span
            class="cursor-pointer text-cyan-600"
            @click="runTest(testId)"
          >{{ node.name }}</span>
          <button
            class="cursor-pointer transition opacity-0 group-hover:opacity-100 focus:opacity-100"
            :title="props.isFavorite?.(testId) ? 'Remove from favorites' : 'Mark as favorite'"
            @click="onToggleFavorite()"
          >
            <font-awesome-icon icon="fa-solid fa-star" :class="props.isFavorite?.(testId) ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'" />
          </button>
        </div>
      </div>
      <div class="flex-none w-6 font-bold py-1 text-center">
        <a class="cursor-pointer text-cyan-600" @click="openTest()">
          <font-awesome-icon icon="fa-solid fa-eye" />
        </a>
      </div>
    </div>
  </div>
</template>
