import { createApp } from 'vue'
import NubiscoUI from '@nubisco/ui'
import App from './App.vue'
import { router } from './router'
import { initAnalytics } from './composables/useAnalytics'

import '@nubisco/ui/dist/ui.css'
import './styles/index.scss'

initAnalytics()

const app = createApp(App)
app.use(router)
app.use(NubiscoUI)

app.mount('#app')
