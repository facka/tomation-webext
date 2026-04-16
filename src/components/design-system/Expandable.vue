<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  loading?: boolean
  border?: boolean
  expanded?: boolean
}>()

const emit = defineEmits<{
  (e: 'update', val: boolean): void
}>()

const loading = computed(() => props.loading)
const border = computed(() => props.border)

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
  <div class="border-gray-200 rounded-md" :class="{ 'blur-sm': loading }">
    <div class="flex h-auto items-center justify-between">
      <div class="grow">
        <slot v-if="!loading" :class="{ 'pl-2': isExpanded }" name="header" />
      </div>
      <div class="absolute right-1 w-6 h-6 grid place-items-center cursor-pointer rounded-md" @click="toggleExpandedState">
        <span>
          <font-awesome-icon v-show="!isExpanded" icon="fa-solid fa-angle-down" />
          <font-awesome-icon v-show="isExpanded" icon="fa-solid fa-angle-up" />
        </span>
      </div>
    </div>
    <div v-if="!loading && isExpanded" class="mt-2 border-gray-200 pl-2">
      <slot />
    </div>
  </div>
</template>
