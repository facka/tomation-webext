import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { setupApp } from '@/logic/common-setup'
import FontAwesomeIcon from '@/plugins/fontawesome'
import { bootstrapMessaging } from './bootstrapMessaging'
import App from './Options.vue'
import '@/styles'

bootstrapMessaging()

const app = createApp(App)
  .component('FontAwesomeIcon', FontAwesomeIcon)
  .use(createPinia())
setupApp(app)
app.mount('#app')
