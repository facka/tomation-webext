<script setup lang="ts">
const { state: scriptURL, isLoading } = useStoredValue<string>('local:scriptURL', '')

function openOptionsPage() {
  browser.runtime.openOptionsPage()
}
</script>

<template>
  <main class="w-[300px] px-4 py-5 text-center text-gray-700">
    <div>Popup</div>

    <button class="btn mt-2" @click="openOptionsPage">
      Open Options
    </button>
    <div class="mt-2">
      <span v-if="!isLoading" class="opacity-50">Script URL: {{ scriptURL || 'Not set' }}</span>
      <span v-else class="opacity-50">Loading...</span>
    </div>
  </main>
</template>
