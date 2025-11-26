import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage'

export const { data: tomationStorage, dataReady: tomationStorageReady } = useWebExtensionStorage('tomation-webext', {
  view: 'MAIN', // VIEWER, TEST or MAIN
  initialAction: {},
  actionsById: {},
  automatedTests: {},
  history: [],
  memory: [],
} as any)
