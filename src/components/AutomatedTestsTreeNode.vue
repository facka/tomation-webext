<script setup lang="ts">
import type { VIEWS } from '~/logic/views'
import { sendMessage } from 'webext-bridge/popup'
import Expandable from '@/components/design-system/Expandable.vue'

const props = defineProps<{
  node: TreeNode
}>()

const sidepanelStore = useAutomationStore()

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
  sendMessage('sidepanel-to-contentScript', {
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
</script>

<template>
  <div v-if="node.children.length" class="text-left">
    <Expandable :loading="false" expanded border>
      <template #header>
        <div>{{ node.name }}</div>
      </template>
      <div>
        <div
          v-for="(childNode, index) in node.children"
          :key="index"
        >
          <AutomatedTestsTreeNode :node="childNode" />
        </div>
      </div>
    </Expandable>
  </div>
  <div v-else>
    <div class="flex">
      <div class="grow py-1">
        <span
          class="cursor-pointer text-cyan-600"
          @click="runTest(testId)"
        >{{ node.name }}</span>
      </div>
      <div class="flex-none w-6 font-bold py-1 text-center">
        <a class="cursor-pointer text-cyan-600" @click="openTest()">
          <font-awesome-icon icon="fa-solid fa-eye" />
        </a>
      </div>
    </div>
  </div>
</template>
