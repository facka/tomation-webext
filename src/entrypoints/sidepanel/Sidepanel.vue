<script setup lang="ts">
import type { Workspace } from '@/logic/workspace/workspace.types'
import { onMounted, ref, watch } from 'vue'
import { sendMessage } from 'webext-bridge/popup'
import Home from '@/components/Home.vue'
import WorkspacePage from '@/components/WorkspacePage.vue'
import { useAutomationStore } from '@/composables/automation-store'
import { useActiveTab } from '@/composables/useActiveTab'
import { WorkspaceCmd } from '@/logic/workspace/workspace.handlers'

const sidepanelStore = useAutomationStore()

const isLoading = ref(false)
const activeTabId = ref<any>(null)
const workspace = ref<Workspace | null>(null)
const currentTabHost = ref<string>('')

async function updateActiveTabId() {
  const res = await useActiveTab().getActiveTab()
  activeTabId.value = res?.tab?.id ?? null
  isLoading.value = activeTabId.value != null && sidepanelStore.tabsInfoById[activeTabId.value]?.status === 'loading'
}

onMounted(async () => {
  await refresh()
})

// Keep isLoading updated when tabInfo changes
watch(
  () => sidepanelStore.tabsInfoById,
  () => {
    if (activeTabId.value != null) {
      isLoading.value = sidepanelStore.tabsInfoById[activeTabId.value]?.status === 'loading'
      refresh()
    }
  },
  { deep: true },
)

async function refresh() {
  updateActiveTabId()
  const { tab } = await useActiveTab().getActiveTab()
  const url = tab.url
  // extract host from url
  currentTabHost.value = url ? new URL(url).host : ''
  const existentWorkspace: Workspace | null = await sendMessage('sidepanel-to-background', {
    cmd: WorkspaceCmd.GetForHost,
    params: { host: currentTabHost.value },
  }, 'background')
  workspace.value = existentWorkspace
}

async function onWorkspaceCreated(newWorkspace: Workspace) {
  workspace.value = newWorkspace as Workspace
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Main Content -->
    <main class="flex-1 w-full text-gray-700 relative overflow-y-auto">
      <div v-show="isLoading" class="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-1000">
        <div class="flex flex-col items-center gap-2 bg-white/80 px-4 py-3 rounded-lg shadow-lg">
          <font-awesome-icon icon="fa-solid fa-spinner" spin class="text-lg" />
          <span>Loading...</span>
        </div>
      </div>

      <div v-if="!workspace">
        <Home @workspace-created="onWorkspaceCreated" />
      </div>
      <div v-else>
        <WorkspacePage :workspace="workspace" :tab-id="activeTabId" :loading="isLoading" />
      </div>
    </main>
  </div>
</template>
