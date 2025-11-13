<script setup lang="ts">
import { computed, ref } from 'vue'
import ExpandableSection from '../design-system/ExpandableSection.vue'
import { useAutomationStore } from '../sidepanel/automation-store'
import AutomatedTestsTreeNode from './AutomatedTestsTreeNode.vue'

const props = defineProps<{
  tests: any
}>()

const query = ref('')

const store = useAutomationStore()
const testsList = computed(() => Object.keys(props.tests))
const filteredPaths = computed(() => testsList.value.filter(path => path.toLocaleLowerCase().includes(query.value.toLocaleLowerCase().trim())))
const sortedPaths = computed(() => filteredPaths.value.toSorted())
const testsTree = computed(() => {
  return buildTree(sortedPaths.value)
})

interface TreeNode {
  name: string
  path: string
  children: TreeNode[]
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: 'Automated Tests', path: '', children: [] }
  for (const path of paths) {
    const pathParts = path.split('/')
    addToTree(root, '', pathParts)
  }

  return root
}

function addToTree(node: TreeNode, path: string, pathParts: string[]): void {
  if (pathParts.length === 0) {
    return
  }

  const [currentPart, ...remainingParts] = pathParts
  let childNode = node.children.find(child => child.name === currentPart)

  if (!childNode) {
    childNode = {
      name: currentPart,
      path,
      children: [],
    }
    node.children.push(childNode)
  }

  addToTree(childNode, path.length ? `${path}/${currentPart}` : currentPart, remainingParts)
}

function reloadTests() {
  store.reloadTests()
}
</script>

<template>
  <ExpandableSection title="Automated Tests" :loading="false" expanded>
    <template #summary>
      <a class="cursor-pointer text-cyan-600" title="Reload tests" @click="reloadTests()">
        <font-awesome-icon icon="fa-solid fa-refresh" />
      </a>
      <input
        v-model="query"
        class="border-b-2 border-gray-200 mx-1"
        label="query"
        placeholder="Type to search"
      >
    </template>
    <div>
      <div v-if="filteredPaths.length">
        <div
          v-for="(node, index) in testsTree.children"
          :key="index"
          :class="{ 'pb-2': index === (tests.length - 1) }"
        >
          <AutomatedTestsTreeNode :node="node" />
        </div>
      </div>
      <div v-else>
        No tests found that match "{{ query }}"
      </div>
    </div>
  </ExpandableSection>
</template>
