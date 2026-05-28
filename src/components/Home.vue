<script setup lang="ts">
import type { Workspace } from '@/logic/workspace/workspace.types'
import { onMounted, ref, watch } from 'vue'
import UrlStatus from '@/components/UrlStatus.vue'
import { useAutomationStore } from '@/composables/automation-store'
import { useActiveTab } from '@/composables/useActiveTab'
import { createWorkspace, reloadTestsForActiveTab } from '@/entrypoints/sidepanel/messaging.client'

const emit = defineEmits<{
  (e: 'workspaceCreated', workspace: Workspace): void
}>()

const sidepanelStore = useAutomationStore()

const currentTabHost = ref<string>('')
const currentTabTitle = ref<string>('')
const newWorkspaceForm = {
  name: ref<string>(''),
  scriptURL: ref<string>(''),
}

onMounted(async () => {
  await refresh()
})

watch(
  () => sidepanelStore.tabsInfoById,
  () => {
    refresh()
  },
  { deep: true },
)

async function refresh() {
  const { tab } = await useActiveTab().getActiveTab()
  const url = tab.url
  // extract host from url
  currentTabHost.value = url ? new URL(url).host : ''
  currentTabTitle.value = tab.title || ''
  newWorkspaceForm.name.value = currentTabTitle.value || ''
  if (url === 'https://facka.github.io/tomation-playground/') {
    newWorkspaceForm.scriptURL.value = 'http://localhost:5050/tests.bundle.js'
  } else {
    newWorkspaceForm.scriptURL.value = ''
  }
}

async function reloadTests() {
  console.log('Reload tests')
  try {
    // TODO send message to background first.
    // Background should clear state related to tests and then send message to content script to reload tests.
    // This will prevent potential race conditions where content script sends old tests results after tests
    // have been reloaded and before state is cleared in background, which can cause old test results to be
    // displayed in sidepanel after tests have been reloaded and before state is cleared in background
    await reloadTestsForActiveTab()
  }
  catch (error) {
    console.error('Error reloading tests:', error)
  }
}

async function startProject() {
  const newWorkspace = await createWorkspace({
    name: newWorkspaceForm.name.value.trim(),
    host: currentTabHost.value,
    script: newWorkspaceForm.scriptURL.value.trim() || '',
  })
  // await reloadTests()
  emit('workspaceCreated', newWorkspace as Workspace)
}
</script>

<template>
  <div class="flex flex-col h-full p-2">
    <!-- Hero Section -->
    <div class="text-center py-6 px-4">
      <h1 class="text-2xl font-bold text-gray-800 mb-2">
        Welcome to Tomation
      </h1>
      <p class="text-gray-600 text-sm">
        Automate and test your web applications directly from your browser
      </p>
    </div>

    <!-- Create Workspace Form -->
    <div class="px-4 py-4 bg-white rounded-lg border border-gray-200 mb-6">
      <h2 class="font-bold text-lg mb-4 text-gray-800">
        Start a New Project
      </h2>
      <form @submit.prevent="startProject">
        <div class="mb-3">
          <label class="block text-sm font-medium mb-1 text-gray-700">
            Workspace name
            <button type="button" class="inline-ml-1 text-gray-500 hover:text-gray-700" title="A descriptive name for your workspace project">
              <font-awesome-icon icon="fa-solid fa-circle-info" />
            </button>
          </label>
          <input v-model="newWorkspaceForm.name.value" placeholder="e.g., My Project" class="border rounded px-2 py-1 w-full text-sm" title="Give your workspace a descriptive name">
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1 text-gray-700">
            Script URL
            <button type="button" class="inline-ml-1 text-gray-500 hover:text-gray-700" title="URL pointing to your test automation script file">
              <font-awesome-icon icon="fa-solid fa-circle-info" />
            </button>
          </label>
          <div class="flex gap-2 items-center">
            <input v-model="newWorkspaceForm.scriptURL.value" placeholder="https://example.com/script.js" required class="border rounded px-2 py-1 flex-1 text-sm" title="URL to your test automation script">
            <UrlStatus v-if="newWorkspaceForm.scriptURL.value" compact :url="newWorkspaceForm.scriptURL.value" />
          </div>
        </div>
        <button type="submit" class="btn w-full">
          Start tomation project
        </button>
      </form>
    </div>

    <!-- Features Section -->
    <div class="flex-1 px-4 pb-4">
      <h3 class="font-bold text-gray-800 mb-3">
        Key Features
      </h3>
      <div class="space-y-2 text-sm text-gray-700">
        <div class="flex items-start gap-2">
          <font-awesome-icon icon="fa-solid fa-check" class="text-green-600 mt-0.5 flex-shrink-0" />
          <span>Run automated tests directly in your browser</span>
        </div>
        <div class="flex items-start gap-2">
          <font-awesome-icon icon="fa-solid fa-check" class="text-green-600 mt-0.5 flex-shrink-0" />
          <span>Manage multiple workspace projects</span>
        </div>
        <div class="flex items-start gap-2">
          <font-awesome-icon icon="fa-solid fa-check" class="text-green-600 mt-0.5 flex-shrink-0" />
          <span>Monitor test status in real-time</span>
        </div>
      </div>
    </div>
  </div>
</template>
