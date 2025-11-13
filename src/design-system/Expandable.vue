<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  loading?: boolean
  border?: boolean
  expanded?: boolean
}>()

const loading = computed(() => props.loading)
const border = computed(() => props.border)

const expanded = ref(props.expanded)

function toogleExpandedState() {
  expanded.value = !loading.value && !expanded.value
}
</script>

<template>
  <div class="border-gray-200" :class="{ 'rounded-md border-2 p-2': border, 'border-l-2': !border && expanded, 'border-b-2': !border, 'blur-sm': loading }">
    <div class="flex h-auto">
      <div class="grow mr-2">
        <slot v-if="!loading" :class="{ 'pl-2': expanded }" name="header" />
      </div>
      <div class="flex-none w-3 grid justify-items-end cursor-pointer" @click="toogleExpandedState">
        <span>
          <font-awesome-icon v-show="!expanded" icon="fa-solid fa-angle-down" />
          <font-awesome-icon v-show="expanded" icon="fa-solid fa-angle-up" />
        </span>
      </div>
    </div>
    <div v-if="!loading && expanded" class="border-t-2 mt-2 pt-1 border-gray-200" :class="{ 'mt-0 pl-2': !border && expanded }">
      <slot />
    </div>
  </div>
</template>
