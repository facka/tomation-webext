import { VIEWS } from './views'

const view = storage.defineItem<VIEWS>(
  'local:view',
  {
    fallback: VIEWS.MAIN,
  },
)

const history = storage.defineItem<Array<object>>(
  'local:history',
  {
    fallback: [],
  },
)

const memory = storage.defineItem<Array<object>>(
  'local:memory',
  {
    fallback: [],
  },
)

export default {
  view,
  history,
  memory,
}
