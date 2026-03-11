<script setup lang="ts">
const props = defineProps<{
  url?: string | null
  timeout?: number
  compact?: boolean
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
  <div
    class="py-1 flex items-center justify-between gap-3"
    :class="compact
      ? ''
      : 'px-2 w-full bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 shadow-sm'"
  >
    <span v-if="!compact" class="text-xs text-gray-700 truncate flex-1">{{ url }}</span>

    <div class="flex items-center gap-3">
      <div :title="message" class="flex-shrink-0">
        <template v-if="status === 'checking'">
          <font-awesome-icon icon="fa-solid fa-spinner" spin class="text-gray-500 text-base" />
        </template>
        <template v-else-if="status === 'ok'">
          <font-awesome-icon icon="fa-solid fa-circle-check" class="text-green-500 text-base" />
        </template>
        <template v-else-if="status === 'error'">
          <font-awesome-icon icon="fa-solid fa-circle-xmark" class="text-red-500 text-base" />
        </template>
        <template v-else-if="status === 'no-url'">
          <font-awesome-icon icon="fa-solid fa-circle" class="text-gray-300 text-base" />
        </template>
        <template v-else>
          <font-awesome-icon icon="fa-solid fa-circle" class="text-gray-400 text-base" />
        </template>
      </div>

      <button
        v-if="!compact && status === 'error'"
        type="button"
        class="flex-shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition"
        :title="`Re-check URL ${displayTime ? `(last checked at ${displayTime})` : ''}`"
        @click="checkUrl(props.url)"
      >
        Check
      </button>
    </div>
  </div>
</template>
