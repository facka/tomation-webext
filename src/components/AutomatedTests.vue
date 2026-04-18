<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import { sendMessage } from 'webext-bridge/popup'
import AutomatedTestsTreeNode from '@/components/AutomatedTestsTreeNode.vue'

const props = defineProps<{
  tests: any
}>()

const sidepanelStore = useAutomationStore()
const query = ref('')
const visualizationMode = ref<'flat' | 'tree'>('tree')
const favoriteTestsByWorkspace = useStorage<Record<string, string[]>>('tomation.favoriteTestsByWorkspace', {})

const testsList = computed(() => (props.tests && Object.keys(props.tests)) || [])
const filteredPaths = computed(() => testsList.value.filter((path: any) => path.toLocaleLowerCase().includes(query.value.toLocaleLowerCase().trim())))
const workspaceFavoritesKey = computed(() => sidepanelStore.workspace?.id || '__unknown-workspace__')
const favoritePaths = computed(() => {
  const favorites = favoriteTestsByWorkspace.value[workspaceFavoritesKey.value] || []
  const availableTests = new Set(testsList.value)
  return favorites.filter(testId => availableTests.has(testId))
})
const filteredFavoritePaths = computed(() => {
  const normalizedQuery = query.value.toLocaleLowerCase().trim()
  return favoritePaths.value.filter(path => path.toLocaleLowerCase().includes(normalizedQuery))
})
const filteredNonFavoritePaths = computed(() => {
  const favorites = new Set(favoritePaths.value)
  return filteredPaths.value.filter((path: string) => !favorites.has(path))
})
const sortedFavoritePaths = computed(() => filteredFavoritePaths.value.toSorted())
const sortedPaths = computed(() => filteredNonFavoritePaths.value.toSorted())
const testsTree = computed(() => {
  return buildTree(sortedPaths.value)
})

const modeIcon = computed(() => (visualizationMode.value === 'tree' ? 'fa-solid fa-list' : 'fa-solid fa-folder-tree'))
const modeLabel = computed(() => (visualizationMode.value === 'tree' ? 'Switch to flat list' : 'Switch to tree view'))

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

function toggleVisualizationMode() {
  visualizationMode.value = visualizationMode.value === 'tree' ? 'flat' : 'tree'
}

function isFavorite(testId: string) {
  return favoritePaths.value.includes(testId)
}

function toggleFavorite(testId: string) {
  const workspaceKey = workspaceFavoritesKey.value
  const current = favoriteTestsByWorkspace.value[workspaceKey] || []
  const favoriteSet = new Set(current)

  if (favoriteSet.has(testId)) {
    favoriteSet.delete(testId)
  }
  else {
    favoriteSet.add(testId)
  }

  favoriteTestsByWorkspace.value = {
    ...favoriteTestsByWorkspace.value,
    [workspaceKey]: [...favoriteSet],
  }
}

async function runTest(testId: string) {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  sendMessage('sidepanel-to-contentScript', {
    cmd: 'run-test-request',
    params: {
      testId,
    },
  }, activeTab)
}

function openTest(testId: string) {
  sidepanelStore.openTest(testId)
}
</script>

<template>
  <section>
    <div v-if="testsList.length === 0" class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
      No automated tests found for this workspace.
      <br>
      Make sure you have a test automation script linked to this workspace and that it defines some tests.
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold tracking-wide text-slate-800">
          Automated Tests
        </h3>

        <div class="flex items-center gap-2">
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-cyan-700 transition hover:border-cyan-200 hover:bg-cyan-50"
            :title="modeLabel"
            @click="toggleVisualizationMode()"
          >
            <font-awesome-icon :icon="modeIcon" />
          </button>
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-cyan-700 transition hover:border-cyan-200 hover:bg-cyan-50"
            title="Reload tests"
            @click="reloadTests()"
          >
            <font-awesome-icon icon="fa-solid fa-refresh" />
          </button>
        </div>
      </div>

      <div class="relative">
        <input
          v-model="query"
          name="query"
          class="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 pr-28 text-sm text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
          label="query"
          placeholder="Search tests..."
        >
        <span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{{ filteredPaths.length }}/{{ testsList.length }}</span>
      </div>

      <div v-if="sortedFavoritePaths.length" class="rounded-md border border-amber-200 bg-amber-50/60 p-2">
        <div class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
          Favorite Tests
        </div>
        <div
          v-for="testId in sortedFavoritePaths"
          :key="`favorite-${testId}`"
          class="flex items-center py-1"
        >
          <div class="grow min-w-0">
            <div class="group inline-flex max-w-full items-center gap-1.5">
              <button class="block whitespace-normal break-words text-left text-sm leading-5 text-cyan-700 transition hover:text-cyan-800" :title="testId" @click="runTest(testId)">
                {{ testId }}
              </button>
              <button
                class="cursor-pointer transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Remove from favorites"
                @click="toggleFavorite(testId)"
              >
                <font-awesome-icon icon="fa-solid fa-star" class="text-amber-500" />
              </button>
            </div>
          </div>
          <div class="flex-none w-7 self-center text-center">
            <button class="text-cyan-700 transition hover:text-cyan-800" title="Open test details" @click="openTest(testId)">
              <font-awesome-icon icon="fa-solid fa-eye" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="visualizationMode === 'tree' && filteredPaths.length" class="mt-2">
      <div
        v-for="(node, index) in testsTree.children"
        :key="index"
        class="pb-1"
      >
        <AutomatedTestsTreeNode :node="node" :is-favorite="isFavorite" :toggle-favorite="toggleFavorite" />
      </div>
    </div>

    <div v-else-if="visualizationMode === 'flat' && filteredPaths.length" class="overflow-hidden mt-2">
      <div
        v-for="testId in sortedPaths"
        :key="testId"
        class="flex items-center py-1.5"
      >
        <div class="grow min-w-0">
          <div class="group inline-flex max-w-full items-center gap-1.5">
            <button class="block whitespace-normal break-words text-left text-sm leading-5 text-cyan-700 transition hover:text-cyan-800" :title="testId" @click="runTest(testId)">
              {{ testId }}
            </button>
            <button
              class="cursor-pointer transition opacity-0 group-hover:opacity-100 focus:opacity-100"
              :title="isFavorite(testId) ? 'Remove from favorites' : 'Mark as favorite'"
              @click="toggleFavorite(testId)"
            >
              <font-awesome-icon icon="fa-solid fa-star" :class="isFavorite(testId) ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'" />
            </button>
          </div>
        </div>
        <div class="flex-none w-7 self-center text-center">
          <button class="text-cyan-700 transition hover:text-cyan-800" title="Open test details" @click="openTest(testId)">
            <font-awesome-icon icon="fa-solid fa-eye" />
          </button>
        </div>
      </div>
    </div>

    <div v-else class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500 mt-2">
      No tests found that match "{{ query }}"
    </div>
  </section>
</template>
