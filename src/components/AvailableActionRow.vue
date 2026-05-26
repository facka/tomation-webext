<script setup lang="ts">
import { createUIAdapter } from '@/messaging'

const props = defineProps<{
  action: string
}>()
const messaging = createUIAdapter()

async function runAction(action: string) {
  const { tab } = await useActiveTab().getActiveTab()
  messaging.sendMessage('sidepanel-to-background', {
    cmd: action,
    params: { tabId: tab?.id },
  })
}
</script>

<template>
  <div class="cursor-pointer text-cyan-600" @click="runAction(props.action)">
    <slot />
  </div>
</template>
