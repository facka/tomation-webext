<script setup lang="ts">
import { computed, toRaw } from 'vue'
import { sendMessage } from 'webext-bridge/popup'
import Expandable from '../design-system/Expandable.vue'
import { useAutomationStore } from '../sidepanel/automation-store'
import { useActiveTab } from '~/composables/useActiveTab'

const props = defineProps<{
  node: TreeNode
}>()
const store = useAutomationStore()
const node = computed(() => props.node)
const testId = computed(() => {
  if (node.value.path) {
    return `${node.value.path}/${node.value.name}`
  }
  else {
    return node.value.name
  }
})

interface TreeNode {
  name: string
  path: string
  children: TreeNode[]
}

async function runTest(testId: string) {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  sendMessage('run-test', {
    id: testId,
  }, activeTab)
}

function openTest() {
  const action = store.automatedTests[testId.value].action
  console.log('Open Test: ', toRaw(action))
  if (action) {
    store.goTo('TEST', { action })
  }
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
          :class="{ 'pb-2': index === (node.children.length - 1) }"
        >
          <AutomatedTestsTreeNode :node="childNode" />
        </div>
      </div>
    </Expandable>
  </div>
  <div v-else>
    <div class="flex border-b-2 border-gray-200">
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
