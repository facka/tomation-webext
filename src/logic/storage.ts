import { VIEWS } from './views'

const view = storage.defineItem<VIEWS>(
  'local:view',
  {
    fallback: VIEWS.MAIN,
  },
)

const sessionId = storage.defineItem<string>(
  'local:sessionId',
  {
    fallback: '',
  },
)

const scriptURL = storage.defineItem<string>(
  'local:scriptURL',
  {
    fallback: '',
  },
)

const initialAction = storage.defineItem<object>(
  'local:initialAction',
  {
    fallback: {},
  },
)

const actionsById = storage.defineItem<object>(
  'local:actionsById',
  {
    fallback: {},
  },
)

const automatedTests = storage.defineItem<object>(
  'local:automatedTests',
  {
    fallback: {},
  },
)

const currentRunningTest = storage.defineItem<object>(
  'local:currentRunningTest',
  {
    fallback: {},
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
  sessionId,
  scriptURL,
  initialAction,
  actionsById,
  automatedTests,
  currentRunningTest,
  history,
  memory,
}
