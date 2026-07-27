import { createApp } from 'vue'
import Vant from 'vant'
import 'vant/lib/index.css'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(Vant)
app.mount('#app')

// 注册 Service Worker（PWA：可添加到主屏幕、离线也能打开）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
