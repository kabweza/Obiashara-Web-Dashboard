<template>
  <div class="space-y-5">
    <!-- Phone -->
    <div class="input-group">
      <label class="input-label">{{ t('login_phone_label') }}</label>
      <div class="input-wrapper" :class="{ 'input-error': errors.phone, 'input-focused': focused.phone }">
        <div class="input-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
        </div>
        <input
          v-model="form.phone"
          type="tel"
          :placeholder="t('login_phone_hint')"
          class="input-field"
          @focus="focused.phone = true"
          @blur="focused.phone = false; validatePhone()"
          @input="errors.phone = ''"
        />
      </div>
      <p v-if="errors.phone" class="input-error-msg">{{ errors.phone }}</p>
    </div>

    <!-- Password -->
    <div class="input-group">
      <label class="input-label">{{ t('login_password_label') }}</label>
      <div class="input-wrapper" :class="{ 'input-error': errors.password, 'input-focused': focused.password }">
        <div class="input-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <input
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          :placeholder="t('login_password_hint')"
          class="input-field"
          @focus="focused.password = true"
          @blur="focused.password = false; validatePassword()"
          @input="errors.password = ''"
          @keyup.enter="handleSubmit"
        />
        <button type="button" class="input-toggle" @click="showPassword = !showPassword">
          <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
        </button>
      </div>
      <p v-if="errors.password" class="input-error-msg">{{ errors.password }}</p>
    </div>

    <!-- Forgot password -->
    <div class="text-right">
      <button type="button" class="text-sm font-semibold text-primary hover:underline transition-all">
        {{ t('forgot_password') }}
      </button>
    </div>

    <!-- Submit -->
    <button
      type="button"
      class="submit-btn"
      :disabled="isLoading"
      @click="handleSubmit"
    >
      <span v-if="!isLoading" class="flex items-center justify-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
        {{ t('login_button') }}
      </span>
      <span v-else class="flex items-center justify-center gap-2">
        <div class="spinner" />
        {{ t('loading') }}
      </span>
    </button>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { validateTanzanianPhone } from '../../../utils/normalizePhoneNumber.js'

const emit = defineEmits(['submit'])
const props = defineProps({ isLoading: Boolean })
const { t } = useI18n()

const form = reactive({ phone: '', password: '' })
const errors = reactive({ phone: '', password: '' })
const focused = reactive({ phone: false, password: false })
const showPassword = ref(false)

function validatePhone() {
  if (!form.phone.trim()) {
    errors.phone = t('phone_required')
    return false
  }
  if (!validateTanzanianPhone(form.phone)) {
    errors.phone = t('signup_phone_invalid')
    return false
  }
  errors.phone = ''
  return true
}

function validatePassword() {
  if (!form.password.trim()) {
    errors.password = t('password_required')
    return false
  }
  errors.password = ''
  return true
}

function handleSubmit() {
  const valid = validatePhone() & validatePassword()
  if (valid) emit('submit', { phone: form.phone, password: form.password })
}
</script>

<style scoped>
.input-group { @apply flex flex-col gap-1.5; }
.input-label { @apply text-sm font-bold text-primary tracking-wide; }
.input-wrapper {
  @apply flex items-center bg-white rounded-2xl border-2 border-gray-200 transition-all duration-200 overflow-hidden;
}
.input-focused { @apply border-primary shadow-md; }
.input-error { @apply border-red-400; }
.input-icon { @apply flex items-center justify-center w-12 h-12 text-primary bg-red-50 shrink-0; }
.input-field {
  @apply flex-1 py-3 pr-4 text-gray-800 bg-transparent text-base font-semibold outline-none placeholder-gray-400;
}
.input-toggle { @apply flex items-center justify-center w-11 h-11 text-primary hover:text-primary/70 transition-colors; }
.input-error-msg { @apply text-red-500 text-xs font-semibold mt-0.5 pl-1; }
.submit-btn {
  @apply w-full h-14 rounded-2xl font-bold text-white text-base tracking-wide transition-all duration-200 shadow-lg shadow-primary/40 disabled:opacity-60 disabled:cursor-not-allowed;
  background: linear-gradient(135deg, #cf4638 0%, #f16657 100%);
}
.submit-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px rgba(207,70,56,0.5);
}
.submit-btn:not(:disabled):active { transform: translateY(0); }
.spinner {
  @apply w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin;
}
.text-primary { color: #cf4638; }
.border-primary { border-color: #cf4638; }
</style>
