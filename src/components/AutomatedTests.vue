<script setup lang="ts">
import { sendMessage } from 'webext-bridge/popup'
import AutomatedTestsTreeNode from '@/components/AutomatedTestsTreeNode.vue'
import ExpandableSection from '@/components/design-system/ExpandableSection.vue'

const props = defineProps<{
  tests: any
}>()

const query = ref('')

const testsList = computed(() => (props.tests && Object.keys(props.tests)) || [])
const filteredPaths = computed(() => testsList.value.filter((path: any) => path.toLocaleLowerCase().includes(query.value.toLocaleLowerCase().trim())))
const sortedPaths = computed(() => filteredPaths.value.toSorted())
const testsTree = computed(() => {
  return buildTree(sortedPaths.value)
})

type TreeNode = {
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

async function reloadTests() {
  console.log('Reload tests')
  const activeTab = (await useActiveTab().getActiveTab()).destination
  try {
    await sendMessage('sidepanel-to-contentScript', {
      cmd: 'reload-tests-request',
      params: {},
    }, activeTab)
  }
  catch (error) {
    console.error('Error reloading tests:', error)
  }
}
</script>

<template>
  <div>
    <div v-if="testsList.length === 0" class="p-4 text-center text-gray-500">
      No automated tests found for this workspace.
      <br>
      Make sure you have a test automation script linked to this workspace and that it defines some tests.
    </div>
  </div>
  <!-- navbar with search bar a refresh button and the filtered number of tests vs total number of tests -->
  <div>
    <div class="flex items-center justify-between mb-1">
      <h3 class="text-md font-semibold">
        Automated Tests
      </h3>
      <a class="cursor-pointer text-cyan-600" title="Reload tests" @click="reloadTests()">
        <font-awesome-icon icon="fa-solid fa-refresh" />
      </a>
    </div>
    <input v-model="query" name="query" class="w-full mb-1 border-b-2 border-gray-200" label="query" placeholder="Type to search">
    <div class="flex items-center mb-2">
      <span class="text-xs text-gray-400 ml-auto">Showing {{ filteredPaths.length }} of {{ testsList.length }} total tests</span>
    </div>
  </div>
  <div v-if="filteredPaths.length">
    <div
      v-for="(node, index) in testsTree.children"
      :key="index"
      class="pb-1"
    >
      <AutomatedTestsTreeNode :node="node" />
    </div>
  </div>
  <div v-else>
    No tests found that match "{{ query }}"
  </div>
</template>
