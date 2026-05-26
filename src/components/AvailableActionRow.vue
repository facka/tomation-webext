<script setup lang="ts">
import { createUIAdapter } from '@/messaging'

const props = defineProps<{
  action: string
}>()
const messaging = createUIAdapter()

async function runAction(action: string) {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  messaging.sendMessage(action as any, {}, activeTab)
}
</script>

<template>
  <div class="cursor-pointer text-cyan-600" @click="runAction(props.action)">
    <slot />
  </div>
</template>
