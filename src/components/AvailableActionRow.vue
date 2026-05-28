<script setup lang="ts">
const props = defineProps<{
  action: string
}>()
const sidepanelStore = useAutomationStore()

async function runAction(action: string) {
  await sidepanelStore.sendCommandForActiveTab(action)
}
</script>

<template>
  <div class="cursor-pointer text-cyan-600" @click="runAction(props.action)">
    <slot />
  </div>
</template>
