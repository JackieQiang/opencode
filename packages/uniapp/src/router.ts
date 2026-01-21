import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/index/index.vue'),
    meta: {
      title: '首页',
      keepAlive: true,
    },
  },
  {
    path: '/session',
    name: 'Session',
    component: () => import('@/pages/session/session.vue'),
    meta: {
      title: '会话',
      keepAlive: false,
    },
  },
  {
    path: '/session/:id',
    name: 'SessionDetail',
    component: () => import('@/pages/session/session.vue'),
    meta: {
      title: '会话详情',
      keepAlive: false,
    },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/pages/settings/index.vue'),
    meta: {
      title: '设置',
      keepAlive: true,
    },
  },
  {
    path: '/settings/:section',
    name: 'SettingsSection',
    component: () => import('@/pages/settings/index.vue'),
    meta: {
      title: '设置',
      keepAlive: true,
    },
  },
  {
    path: '/error',
    name: 'Error',
    component: () => import('@/pages/error/error.vue'),
    meta: {
      title: '错误',
      keepAlive: false,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/index',
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || 'OpenCode'} - OpenCode`
  next()
})

export default router
