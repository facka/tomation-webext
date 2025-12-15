import { VIEWS } from './views'
import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage'

export const { data: tomationStorage, dataReady: tomationStorageReady } = useWebExtensionStorage('tomation-webext', {
  view: VIEWS.MAIN,
  initialAction: {},
  actionsById: {},
  automatedTests: {},
  history: [],
  memory: [],
} as any)
