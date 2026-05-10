// src/features/auth/composables/useAuth.js
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../../stores/authStore.js'
import { authService } from '../services/authService.js'
import { otpService } from '../services/otpService.js'
import { normalizePhoneNumber } from '../../../utils/normalizePhoneNumber.js'

export function useAuth() {
  const router = useRouter()
  const { t } = useI18n()
  const authStore = useAuthStore()

  const isLoading = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')

  function clearMessages() {
    errorMessage.value = ''
    successMessage.value = ''
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  async function login(phoneNumber, password) {
    clearMessages()
    isLoading.value = true
    try {
      const result = await authStore.login(phoneNumber, password)

      if (result.success) {
        successMessage.value = t('login_success_message')
        await new Promise(r => setTimeout(r, 800))
        router.push('/dashboard')
        return { success: true }
      }

      if (result.needsVerification) {
        router.push({
          name: 'otp-verify',
          query: { phone: phoneNumber, userId: result.userId }
        })
        return { success: false, redirect: true }
      }

      errorMessage.value = result.message || t('login_error_message')
      return result
    } catch (e) {
      errorMessage.value = t('login_error_message')
      return { success: false }
    } finally {
      isLoading.value = false
    }
  }

  // ─── Register ─────────────────────────────────────────────────────────────
  async function register(payload) {
    clearMessages()
    isLoading.value = true
    try {
      const result = await authStore.register(payload)

      if (result.success) {
        if (result.otpSent) {
          router.push({
            name: 'otp-verify',
            query: { phone: payload.phoneNumber, userId: result.userId }
          })
        } else {
          errorMessage.value = result.otpMessage || t('otp_send_failed')
        }
        return result
      }

      if (result.existingUser && result.needsVerification) {
        if (result.otpSent) {
          router.push({
            name: 'otp-verify',
            query: { phone: payload.phoneNumber, userId: result.userId }
          })
        }
        return result
      }

      errorMessage.value = result.message || t('registration_failed')
      return result
    } catch (e) {
      errorMessage.value = t('registration_failed')
      return { success: false }
    } finally {
      isLoading.value = false
    }
  }

  // ─── OTP Verify ───────────────────────────────────────────────────────────
  async function verifyOtp(phoneNumber, otp, userId) {
    clearMessages()
    isLoading.value = true
    try {
      const normalized = normalizePhoneNumber(phoneNumber)
      const result = await otpService.verifyOtp(normalized, otp)

      if (result.success) {
        await authService.markUserAsVerified(userId)
        return { success: true }
      }

      errorMessage.value = t('invalid_or_expired_code')
      return { success: false }
    } catch (e) {
      errorMessage.value = t('verification_failed')
      return { success: false }
    } finally {
      isLoading.value = false
    }
  }

  // ─── Resend OTP ───────────────────────────────────────────────────────────
  async function resendOtp(phoneNumber) {
    clearMessages()
    isLoading.value = true
    try {
      const normalized = normalizePhoneNumber(phoneNumber)
      const result = await otpService.sendOtp(normalized)
      if (result.success) {
        successMessage.value = t('otp_sent_success')
      } else {
        errorMessage.value = result.message || t('otp_send_failed')
      }
      return result
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    await authStore.logout()
    router.push('/auth')
  }

  return {
    isLoading,
    errorMessage,
    successMessage,
    clearMessages,
    login,
    register,
    verifyOtp,
    resendOtp,
    logout,
    isAuthenticated: computed(() => authStore.isAuthenticated),
    userRole: computed(() => authStore.userRole),
  }
}
