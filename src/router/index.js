// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore.js'

const routes = [
  {
    path: '/',
    redirect: '/auth'
  },
  {
    path: '/auth',
    name: 'auth',
    component: () => import('../features/auth/pages/AuthPage.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/auth/verify',
    name: 'otp-verify',
    component: () => import('../features/auth/pages/OtpVerificationPage.vue'),
    meta: { requiresGuest: false }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../features/dashboard/pages/DashboardPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/auth'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation Guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Wait for auth to initialize
  if (!authStore.isInitialized) {
    await authStore.initAuth()
  }

  const isAuthenticated = authStore.isAuthenticated

  // Route requires auth but user not logged in
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'auth' })
  }

  // Route requires guest but user is logged in
  if (to.meta.requiresGuest && isAuthenticated) {
    return next({ name: 'dashboard' })
  }

  next()
})

export default router
