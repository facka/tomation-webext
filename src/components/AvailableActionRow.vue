<script setup lang="ts">
import { sendMessage } from 'webext-bridge/popup'
import { useActiveTab } from '~/composables/useActiveTab'

const props = defineProps<{
  action: string
}>()

async function runAction(action: string) {
  const activeTab = (await useActiveTab().getActiveTab()).destination
  sendMessage(action, {}, activeTab)
}
</script>

<template>
  <div class="cursor-pointer text-cyan-600" @click="runAction(props.action)">
    <slot />
  </div>
</template>
