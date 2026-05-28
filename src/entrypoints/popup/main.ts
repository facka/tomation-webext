import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { setupApp } from '@/logic/common-setup'
import FontAwesomeIcon from '@/plugins/fontawesome'
import { bootstrapMessaging } from '../sidepanel/bootstrapMessaging'
import App from './Popup.vue'
import '@/styles'

const pinia = createPinia()
bootstrapMessaging(pinia)

const app = createApp(App)
  .component('FontAwesomeIcon', FontAwesomeIcon)
  .use(pinia)
setupApp(app)
app.mount('#app')
