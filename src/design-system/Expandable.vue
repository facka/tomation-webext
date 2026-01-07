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
  <div class="border-gray-200" :class="{ 'rounded-md border-2 p-2': border, 'border-l-2': !border && isExpanded, 'border-b-2': !border, 'blur-sm': loading }">
    <div class="flex h-auto">
      <div class="grow mr-2">
        <slot v-if="!loading" :class="{ 'pl-2': isExpanded }" name="header" />
      </div>
      <div class="flex-none w-3 grid justify-items-end cursor-pointer" @click="toggleExpandedState">
        <span>
          <font-awesome-icon v-show="!isExpanded" icon="fa-solid fa-angle-down" />
          <font-awesome-icon v-show="isExpanded" icon="fa-solid fa-angle-up" />
        </span>
      </div>
    </div>
    <div v-if="!loading && isExpanded" class="border-t-2 mt-2 pt-1 border-gray-200" :class="{ 'mt-0 pl-2': !border && isExpanded }">
      <slot />
    </div>
  </div>
</template>
