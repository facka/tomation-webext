<script setup lang="ts">
import Expandable from './Expandable.vue'

const { title, loading, expanded } = defineProps<{
  title: string
  loading?: boolean
  expanded?: boolean
}>()
</script>

<template>
  <Expandable :loading="loading" border :expanded="expanded">
    <template #header>
      <div class="flex">
        <div class="w-5/12 font-bold">
          {{ title }}
        </div>
        <div class="grow flex flex-row-reverse">
          <slot name="summary" />
        </div>
      </div>
    </template>
    <slot />
  </Expandable>
</template>
