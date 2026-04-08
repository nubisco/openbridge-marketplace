import { createApp } from 'vue'
import NubiscoUI from '@nubisco/ui'
import App from './App.vue'
import { router } from './router'

import '@nubisco/ui/style'
import './styles/index.scss'

const app = createApp(App)
app.use(router)
app.use(NubiscoUI)
app.mount('#app')
