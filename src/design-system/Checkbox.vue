<script setup lang="ts">
const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

function updateInput() {
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <div class="cursor-pointer" @click="updateInput">
    <font-awesome-icon
      v-if="modelValue"
      class="text-cyan-600"
      icon="fa-solid fa-check-square"
    />
    <font-awesome-icon
      v-if="!modelValue"
      class="text-gray-500"
      icon="fa-solid fa-square"
    />
    <span class="ml-1 text-xs text-gray-900 cursor-pointer">
      {{ label }}
    </span>
  </div>
</template>
