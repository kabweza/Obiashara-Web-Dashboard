<template>
  <AuthLayout>
    <!-- Logo / Brand -->
    <div class="text-center mb-6">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-3 border border-white/30 shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" class="w-9 h-9">
          <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
        </svg>
      </div>
      <h1 class="text-2xl font-black text-white tracking-tight">Obiashara</h1>
      <p class="text-white/70 text-sm font-medium mt-0.5">{{ isSignIn ? t('sign_in_subtext') : t('register_subtext') }}</p>
    </div>

    <!-- Card -->
    <div class="bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/50">
      <!-- Tabs -->
      <div class="p-5 pb-0">
        <div class="flex bg-gray-100 rounded-2xl p-1">
          <button
            type="button"
            class="tab-btn"
            :class="isSignIn ? 'tab-active' : 'tab-inactive'"
            @click="switchTab(true)"
          >{{ t('login_tab') }}</button>
          <button
            type="button"
            class="tab-btn"
            :class="!isSignIn ? 'tab-active' : 'tab-inactive'"
            @click="switchTab(false)"
          >{{ t('signup_tab') }}</button>
        </div>
      </div>

      <!-- Welcome text -->
      <div class="px-6 pt-5 pb-2 text-center">
        <Transition name="fade-up" mode="out-in">
          <div :key="isSignIn ? 'signin' : 'signup'">
            <h2 class="text-2xl font-black text-gray-800 tracking-tight">
              {{ isSignIn ? t('welcome_back') : t('welcome') }}
            </h2>
          </div>
        </Transition>
      </div>

      <!-- Error / Success -->
      <Transition name="fade">
        <div v-if="errorMessage" class="mx-6 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" class="w-5 h-5 shrink-0">
            <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clip-rule="evenodd" />
          </svg>
          <p class="text-red-600 text-sm font-semibold">{{ errorMessage }}</p>
        </div>
        <div v-else-if="successMessage" class="mx-6 mb-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10b981" class="w-5 h-5 shrink-0">
            <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clip-rule="evenodd" />
          </svg>
          <p class="text-green-700 text-sm font-semibold">{{ successMessage }}</p>
        </div>
      </Transition>

      <!-- Forms -->
      <div class="px-6 pb-6">
        <Transition name="fade-up" mode="out-in">
          <div :key="isSignIn ? 'login-form' : 'signup-form'">
            <LoginForm
              v-if="isSignIn"
              :is-loading="isLoading"
              @submit="handleLogin"
            />
            <SignupForm
              v-else
              :is-loading="isLoading"
              @submit="handleSignup"
            />
          </div>
        </Transition>
      </div>
    </div>

    <!-- Footer note -->
    <p class="text-center text-white/60 text-xs mt-4">
      © {{ new Date().getFullYear() }} Obiashara. All rights reserved.
    </p>
  </AuthLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AuthLayout from '../../../layouts/AuthLayout.vue'
import LoginForm from '../components/LoginForm.vue'
import SignupForm from '../components/SignupForm.vue'
import { useAuth } from '../composables/useAuth.js'

const { t } = useI18n()
const { login, register, isLoading, errorMessage, successMessage, clearMessages } = useAuth()

const isSignIn = ref(true)

function switchTab(toSignIn) {
  clearMessages()
  isSignIn.value = toSignIn
}

async function handleLogin({ phone, password }) {
  clearMessages()
  await login(phone, password)
}

async function handleSignup(payload) {
  clearMessages()
  await register(payload)
}
</script>

<style scoped>
.tab-btn { @apply flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300; }
.tab-active {
  @apply text-white shadow-md;
  background: linear-gradient(135deg, #cf4638 0%, #f16657 100%);
  box-shadow: 0 4px 15px rgba(207,70,56,0.4);
}
.tab-inactive { @apply text-gray-500 hover:text-gray-700; }

.fade-up-enter-active, .fade-up-leave-active { transition: all 0.25s ease; }
.fade-up-enter-from { opacity: 0; transform: translateY(10px); }
.fade-up-leave-to { opacity: 0; transform: translateY(-10px); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
