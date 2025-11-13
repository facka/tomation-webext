<script setup lang="ts">
import { sendMessage } from 'webext-bridge/options'
import logo from '~/assets/icon.png'
import { tomationStorage, tomationStorageReady } from '~/logic/storage'

const url = ref('')

onMounted(async () => {
  console.info('[tomation-webext] Options mounted')
  tomationStorageReady.then(() => {
    console.info('[tomation-webext] Storage ready in Options')
    console.log('[tomation-webext] tomationStorage:', tomationStorage.value)
    url.value = tomationStorage.value.scriptURL || ''
  })
})

async function sendToBackground(payload: any = { hello: 'background' }) {
  try {
    const resp = await sendMessage('options-to-background', payload)
    console.info('[tomation-webext] Sent message to background', resp)
    return resp
  }
  catch (err) {
    console.error('[tomation-webext] Failed to send message to background', err)
  }
}

async function onSave() {
  await sendToBackground({ message: 'saveScriptURL', url: url.value.trim() })
}
</script>

<template>
  <main class="px-4 py-10 text-center text-gray-700 dark:text-gray-200">
    <img :src="logo" class="icon-btn mx-2" alt="extension icon">
    <h1 class="mt-6 text-xl">
      Tomation Web Extension Options
    </h1>

    <div class="mt-6 border rounded p-4 text-left">
      <h3 class="font-semibold mb-2">
        Link script
      </h3>

      <form class="flex gap-2 flex-col sm:flex-row items-stretch" @submit.prevent="url && onSave()">
        <input v-model="url" placeholder="URL to JS file" class="flex-1 border rounded px-2 py-1">
        <button type="submit" class="border rounded px-3 py-1 bg-blue-600 text-white">
          Save
        </button>
      </form>
    </div>
  </main>
</template>
