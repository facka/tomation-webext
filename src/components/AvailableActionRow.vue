<script setup lang="ts">
import { sendCommandForActiveTab } from '@/entrypoints/sidepanel/messaging.client'

const props = defineProps<{
  action: string
}>()

async function runAction(action: string) {
  await sendCommandForActiveTab(action)
}
</script>

<template>
  <div class="cursor-pointer text-cyan-600" @click="runAction(props.action)">
    <slot />
  </div>
</template>
