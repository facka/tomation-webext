import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { setupApp } from '@/logic/common-setup'
import FontAwesomeIcon from '@/plugins/fontawesome'
import App from './Popup.vue'
import '@/styles'

const app = createApp(App)
  .component('FontAwesomeIcon', FontAwesomeIcon)
  .use(createPinia())
setupApp(app)
app.mount('#app')
