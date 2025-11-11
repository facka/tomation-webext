<script setup lang="ts">
import { tomationStorage } from '~/logic/storage'

function openOptionsPage() {
  browser.runtime.openOptionsPage()
}
</script>

<template>
  <main class="w-full px-4 py-5 text-center text-gray-700">
    <h3>Tomation Web Extension</h3>
    <div>Sidepanel</div>

    <button class="btn mt-2" @click="openOptionsPage">
      Open Options
    </button>
    <div class="mt-2">
      <span class="opacity-50">Script URL:</span> {{ tomationStorage.scriptURL }}
    </div>
  </main>
</template>
