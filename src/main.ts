import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { initAuth } from './stores/auth'
import { i18n } from './i18n'

initAuth()

createApp(App).use(router).use(i18n).mount('#app')
