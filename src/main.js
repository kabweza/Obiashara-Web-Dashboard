import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import i18n from './i18n/index.js'
import './style.css'

// Load login diagnostic helper in dev (exposes window.__obDiag)
if (import.meta.env.DEV) {
  import('./features/auth/composables/useLoginDebug.js')
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
app.mount('#app')
