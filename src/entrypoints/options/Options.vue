<script setup lang="ts">
import type { Workspace } from '@/logic/workspace/workspace.types'
import { onMounted, ref, watch } from 'vue'
import { sendMessage } from 'webext-bridge/options'
import logo from '@/assets/icon.png'
import { WorkspaceCmd } from '@/logic/workspace/workspace.handlers'

const allWorkspaces = ref<Workspace[]>([])

onMounted(async () => {
  console.info('[tomation-webext] Options mounted')
  allWorkspaces.value = await sendMessage('options-to-background', {
    cmd: WorkspaceCmd.GetAll,
  }, 'background')
})

async function deleteWorkspace(id: string) {
  await sendMessage('options-to-background', {
    cmd: WorkspaceCmd.Delete,
    params: { id },
  }, 'background')
  allWorkspaces.value = allWorkspaces.value.filter(ws => ws.id !== id)
}
</script>

<template>
  <main class="px-4 py-10 text-center text-gray-700 dark:text-gray-200">
    <img :src="logo" class="icon-btn mx-2" alt="extension icon">
    <h1 class="mt-6 text-xl">
      Tomation Web Extension Options
    </h1>

    <div v-if="allWorkspaces.length > 0" class="p-2">
      <div class="p-2 font-bold  bg-blue-100 text-blue-800">
        Workspaces created in this extension:
      </div>
      <div class="flex flex-col">
        <div v-for="ws in allWorkspaces" :key="ws.id" class="flex justify-between items-center p-2">
          <span>{{ ws.name }} ({{ ws.host }})</span>
          <button class="text-red-500" title="Delete" @click="deleteWorkspace(ws.id)">
            <font-awesome-icon icon="fa-solid fa-trash" />
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
