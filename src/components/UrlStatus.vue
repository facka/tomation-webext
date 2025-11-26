<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  url?: string | null
  timeout?: number
}>()

const emit = defineEmits<{
  (e: 'status', status: 'no-url' | 'checking' | 'ok' | 'error'): void
}>()

const CHECK_TIMEOUT = props.timeout ?? 3000

type UrlStatus = 'no-url' | 'checking' | 'ok' | 'error' | 'idle'

const status = ref<UrlStatus>('idle')
const message = ref('')
const lastCheckedAt = ref<number | null>(null)

async function checkUrl(u?: string | null) {
  if (!u) {
    status.value = 'no-url'
    message.value = 'No URL'
    lastCheckedAt.value = null
    emit('status', status.value)
    return
  }

  status.value = 'checking'
  message.value = 'Checking...'
  lastCheckedAt.value = Date.now()
  emit('status', status.value)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT)

  try {
    const resp = await fetch(u, { method: 'GET', signal: controller.signal })
    clearTimeout(timeout)

    if (resp.ok) {
      status.value = 'ok'
      message.value = `OK (${resp.status})`
    }
    else {
      status.value = 'error'
      message.value = `HTTP ${resp.status}`
    }
    emit('status', status.value)
  }
  catch (err: any) {
    clearTimeout(timeout)
    status.value = 'error'
    message.value = err?.name === 'AbortError' ? 'Timeout' : String(err?.message ?? err)
  }
  finally {
    emit('status', status.value)
  }
}

const displayTime = computed(() => lastCheckedAt.value ? new Date(lastCheckedAt.value).toLocaleTimeString() : '')

watch(() => props.url, (v) => {
  checkUrl(v)
}, { immediate: true })

onMounted(() => {
  checkUrl(props.url)
})
</script>

<template>
  <span class="inline-flex items-center space-x-2">
    <template v-if="status === 'checking'">
      <font-awesome-icon icon="fa-solid fa-spinner" spin class="text-gray-500" />
    </template>
    <template v-else-if="status === 'ok'">
      <font-awesome-icon icon="fa-solid fa-circle-check" class="text-green-500" />
    </template>
    <template v-else-if="status === 'error'">
      <font-awesome-icon icon="fa-solid fa-circle-xmark" class="text-red-500" />
    </template>
    <template v-else-if="status === 'no-url'">
      <font-awesome-icon icon="fa-solid fa-circle" class="text-gray-300" />
    </template>
    <template v-else>
      <font-awesome-icon icon="fa-solid fa-circle" class="text-gray-400" />
    </template>

    <span class="text-xs text-gray-600">{{ message }}</span>

    <button
      v-if="status !== 'checking' && status !== 'no-url'"
      type="button"
      class="ml-2 text-xs underline"
      title="Re-check URL"
      @click="checkUrl(props.url)"
    >
      Check
    </button>

    <span v-if="displayTime" class="text-xs text-gray-400">· {{ displayTime }}</span>
  </span>
</template>
