// src/stores/authStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '../features/auth/services/authService.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const userData = ref(null)
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value && !!userData.value?.verified)
  const userRole = computed(() => userData.value?.role ?? null)
  const userId = computed(() => user.value?.uid ?? localStorage.getItem('userId'))

  async function initAuth() {
    return new Promise((resolve) => {
      authService.onAuthStateChanged(async (firebaseUser) => {
        user.value = firebaseUser
        if (firebaseUser) {
          try {
            const { getDoc, doc } = await import('firebase/firestore')
            const { db } = await import('../plugins/firebase.js')
            const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
            userData.value = snap.exists() ? snap.data() : null
          } catch {
            userData.value = null
          }
        } else {
          userData.value = null
        }
        isInitialized.value = true
        resolve()
      })
    })
  }

  async function login(phoneNumber, password) {
    isLoading.value = true
    error.value = null
    try {
      const result = await authService.loginUser({ phoneNumber, password })
      if (result.success) {
        // userData will be set by onAuthStateChanged
      }
      return result
    } catch (e) {
      error.value = e.message
      return { success: false, message: e.message }
    } finally {
      isLoading.value = false
    }
  }

  async function register(payload) {
    isLoading.value = true
    error.value = null
    try {
      return await authService.registerUser(payload)
    } catch (e) {
      error.value = e.message
      return { success: false, message: e.message }
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    await authService.logout()
    user.value = null
    userData.value = null
  }

  function clearError() {
    error.value = null
  }

  return {
    user, userData, isLoading, isInitialized, error,
    isAuthenticated, userRole, userId,
    initAuth, login, register, logout, clearError
  }
})
