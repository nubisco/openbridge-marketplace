// Must stay first: strips the platform SSO token from the URL before the
// router snapshots the location and before the analytics tracker is loaded.
import './auth/platformCallback'
import { createApp } from 'vue'
// Installs directives, the command palette and app-level config. Since
// @nubisco/ui 4.0.0 it no longer registers components; the nubiscoUI() Vite
// plugin does that, and imports each component's stylesheet, which is why
// there is no longer a global ui.css import here.
import NubiscoUI, { configureNamedTheme } from '@nubisco/ui'
import App from './App.vue'
import { router } from './router'
import { initAnalytics } from './composables/useAnalytics'

import './styles/index.scss'

// The marketplace ships one named theme, its own. This selects it. The accent
// behind it comes from the home category in @nubisco/ui, not from anything
// here: see src/styles/theme.scss.
configureNamedTheme({ themes: ['openbridge-marketplace'], defaultTheme: 'openbridge-marketplace' })

initAnalytics()

const app = createApp(App)
app.use(router)
app.use(NubiscoUI)

app.mount('#app')
