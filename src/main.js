import './assets/main.css'

import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

// 导入视图组件
import Login from './views/Login.vue'
import Home from './views/Home.vue'
import Images from './views/Images.vue'

// 定义路由
const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'login', component: Login },
  { 
    path: '/home', 
    name: 'home', 
    component: Home,
    meta: { requiresAuth: true }  // 添加需要认证的元信息
  },
  { 
    path: '/images', 
    name: 'images', 
    component: Images,
    meta: { requiresAuth: false }  // 添加需要认证的元信息
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
})

// 添加导航守卫
router.beforeEach((to, from, next) => {
  // 这里可以添加身份验证逻辑
  // 这是简化版的，实际项目中应该检查token或其他认证信息
  const isAuthenticated = localStorage.getItem('isAuthenticated')
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    // 如果需要认证但未登录，重定向到登录页
    next({ name: 'login' })
  } else {
    next()
  }
})

// 创建应用实例
const app = createApp(App)

// 使用插件
app.use(ElementPlus)
app.use(router)

// 挂载应用
app.mount('#app')
