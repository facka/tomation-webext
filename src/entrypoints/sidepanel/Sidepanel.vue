<script setup lang="ts">
import type { Workspace } from '@/logic/workspace/workspace.types'
import Home from '@/components/Home.vue'
import WorkspacePage from '@/components/WorkspacePage.vue'
import { useAutomationStore } from '@/composables/automation-store'

const sidepanelStore = useAutomationStore()

async function onWorkspaceCreated(newWorkspace: Workspace) {
  sidepanelStore.workspace = newWorkspace as Workspace
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Main Content -->
    <main class="flex-1 w-full text-gray-700 relative overflow-y-auto">
      <div v-show="sidepanelStore.isLoading" class="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-1000">
        <div class="flex flex-col items-center gap-2 bg-white/80 px-4 py-3 rounded-lg shadow-lg">
          <font-awesome-icon icon="fa-solid fa-spinner" spin class="text-lg" />
          <span>Loading...</span>
        </div>
      </div>

      <div v-if="!sidepanelStore.workspace">
        <Home @workspace-created="onWorkspaceCreated" />
      </div>
      <div v-else>
        <WorkspacePage :workspace="sidepanelStore.workspace" :tab-id="sidepanelStore.activeTabId" :loading="sidepanelStore.isLoading" />
      </div>
    </main>
  </div>
</template>
