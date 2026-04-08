import { createApp } from 'vue'
import NubiscoUI from '@nubisco/ui'
import App from './App.vue'
import { router } from './router'
import { trackPageView } from './composables/useAnalytics'

import '@nubisco/ui/style'
import './styles/index.scss'

const app = createApp(App)
app.use(router)
app.use(NubiscoUI)

router.afterEach((to) => {
  trackPageView(to.fullPath)
})

app.mount('#app')
