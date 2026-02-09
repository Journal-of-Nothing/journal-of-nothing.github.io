import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { initAuth } from './stores/auth'
import { i18n } from './i18n'
import siteConfig from '../site.json'

initAuth()

const applySiteMeta = () => {
  if (siteConfig?.name) {
    document.title = siteConfig.name
  }

  if (siteConfig?.favicon) {
    let icon = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
    if (!icon) {
      icon = document.createElement('link')
      icon.rel = 'icon'
      document.head.appendChild(icon)
    }
    icon.href = siteConfig.favicon
  }
}

applySiteMeta()

createApp(App).use(router).use(i18n).mount('#app')
