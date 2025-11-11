import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage'

export const { data: tomationStorage, dataReady: tomationStorageReady } = useWebExtensionStorage('webext-demo', {} as any)
