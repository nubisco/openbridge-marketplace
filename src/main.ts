// Must stay first: strips the platform SSO token from the URL before the
// router snapshots the location and before the analytics tracker is loaded.
import './auth/platformCallback'
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
