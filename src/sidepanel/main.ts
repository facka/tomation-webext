import { createApp } from 'vue'
import { createPinia } from 'pinia'
import FontAwesomeIcon from '../plugins/fontawesome'
import App from './Sidepanel.vue'
import { setupApp } from '~/logic/common-setup'
import '../styles'

const app = createApp(App)
  .component('FontAwesomeIcon', FontAwesomeIcon)
  .use(createPinia())
setupApp(app)
app.mount('#app')
