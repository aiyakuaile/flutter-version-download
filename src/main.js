import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import './assets/base.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './App.vue'

// 检查系统主题偏好
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

// 如果系统偏好深色模式，则自动应用深色主题
if (prefersDark) {
  document.documentElement.classList.add('dark')
}

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus, {
    locale: zhCn,
})
app.mount('#app')