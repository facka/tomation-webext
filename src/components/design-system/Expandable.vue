<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  loading?: boolean
  expanded?: boolean
}>()

const emit = defineEmits<{
  (e: 'update', val: boolean): void
}>()

const loading = computed(() => props.loading)

const isExpanded = ref(props.expanded ?? false)

function toggleExpandedState() {
  isExpanded.value = !loading.value && !isExpanded.value
  emit('update', isExpanded.value)
}

function expand() {
  if (!loading.value) {
    isExpanded.value = true
    emit('update', true)
  }
}

function collapse() {
  isExpanded.value = false
  emit('update', false)
}

defineExpose({
  expand,
  collapse,
})
</script>

<template>
  <div :class="{ 'blur-sm': loading }">
    <div class="flex h-auto items-center justify-between">
      <div class="grow">
        <slot v-if="!loading" :class="{ 'pl-2': isExpanded }" name="header" />
      </div>
      <div class="absolute right-3 w-4 h-4 grid place-items-center cursor-pointer rounded-md" @click="toggleExpandedState">
        <span>
          <font-awesome-icon v-show="!isExpanded" icon="fa-solid fa-angle-down" />
          <font-awesome-icon v-show="isExpanded" icon="fa-solid fa-angle-up" />
        </span>
      </div>
    </div>
    <div v-if="!loading && isExpanded" class="pl-2">
      <slot />
    </div>
  </div>
</template>
