<template>
  <div class="min-h-screen flex items-center justify-center relative overflow-hidden"
    style="background: linear-gradient(135deg, #cf4638 0%, #b14639 50%, #8b1a1a 100%)">
    <!-- Background orbs -->
    <div class="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10" style="background:radial-gradient(circle, white, transparent)" />
    <div class="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-10" style="background:radial-gradient(circle, white, transparent)" />

    <!-- Back button -->
    <button type="button"
      class="absolute top-4 left-4 z-50 flex items-center gap-2 text-white/80 hover:text-white font-semibold text-sm transition-colors"
      @click="router.back()">
      <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center border border-white/30">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
      </div>
    </button>

    <div class="relative z-10 w-full max-w-sm mx-auto px-5 py-12 text-center">
      <!-- Animated icon -->
      <div class="relative inline-flex mb-8">
        <div class="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-2xl otp-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white" class="w-12 h-12">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <div class="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-primary bg-white shadow-lg">
          6
        </div>
      </div>

      <h1 class="text-3xl font-black text-white mb-2 tracking-tight">{{ t('verify_your_number') }}</h1>
      <p class="text-white/70 text-sm mb-1">{{ t('sent_code_to') }}</p>
      <p class="text-white font-bold text-lg mb-8">{{ phoneNumber }}</p>

      <!-- OTP Input boxes -->
      <div class="flex gap-2.5 justify-center mb-6">
        <input
          v-for="(_, i) in 6"
          :key="i"
          :ref="el => { if (el) otpInputs[i] = el }"
          v-model="digits[i]"
          type="text"
          inputmode="numeric"
          maxlength="1"
          class="otp-box"
          :class="{ 'otp-box-filled': digits[i], 'otp-box-error': errorMessage }"
          @input="onDigitInput(i, $event)"
          @keydown="onKeydown(i, $event)"
          @paste.prevent="onPaste($event)"
          @focus="$event.target.select()"
        />
      </div>

      <!-- Error -->
      <Transition name="fade">
        <div v-if="errorMessage" class="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-3 mb-5 border border-white/20">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" class="w-5 h-5 shrink-0 opacity-80">
            <path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd" />
          </svg>
          <p class="text-white text-sm font-semibold">{{ errorMessage }}</p>
        </div>
      </Transition>

      <!-- Verify button -->
      <button
        type="button"
        class="w-full h-14 rounded-2xl font-bold text-primary text-base tracking-wide transition-all duration-200 shadow-lg bg-white mb-6 disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="isLoading || otpValue.length < 6"
        @click="handleVerify"
      >
        <span v-if="!isLoading" class="flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="#cf4638" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ t('verify_code') }}
        </span>
        <span v-else class="flex items-center justify-center gap-2">
          <div class="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          {{ t('loading') }}
        </span>
      </button>

      <!-- Timer / Resend -->
      <div class="text-center">
        <Transition name="fade" mode="out-in">
          <button
            v-if="canResend"
            key="resend"
            type="button"
            class="text-white font-bold underline text-sm hover:opacity-70 transition-opacity"
            :disabled="isLoading"
            @click="handleResend"
          >{{ t('resend_code') }}</button>
          <p v-else key="timer" class="text-white/70 text-sm font-semibold">
            {{ t('resend_code_in', { time: formattedTime }) }}
          </p>
        </Transition>
      </div>
    </div>

    <!-- Success Dialog -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showSuccess" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-5">
          <div class="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl">
            <div class="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style="background:linear-gradient(135deg,#10B981,#34D399);box-shadow:0 10px 30px rgba(16,185,129,0.4)">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="white" class="w-10 h-10">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 class="text-2xl font-black text-gray-800 mb-2">{{ t('verified') }}</h2>
            <p class="text-gray-500 text-sm mb-6 leading-relaxed">{{ t('account_verified_success') }}</p>
            <button
              type="button"
              class="w-full h-13 py-3.5 rounded-2xl font-bold text-white text-base tracking-wide"
              style="background:linear-gradient(135deg,#cf4638,#f16657);box-shadow:0 8px 20px rgba(207,70,56,0.35)"
              @click="goToDashboard"
            >{{ t('get_started') }}</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../composables/useAuth.js'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { verifyOtp, resendOtp, isLoading, errorMessage, clearMessages } = useAuth()

const phoneNumber = computed(() => route.query.phone ?? '')
const userId = computed(() => route.query.userId ?? '')

// OTP state
const digits = ref(['', '', '', '', '', ''])
const otpInputs = ref([])
const showSuccess = ref(false)
const canResend = ref(false)
const remainingTime = ref(300)
let timer = null

const otpValue = computed(() => digits.value.join(''))
const formattedTime = computed(() => {
  const m = Math.floor(remainingTime.value / 60).toString().padStart(2, '0')
  const s = (remainingTime.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

const primary = '#cf4638'

function startTimer() {
  remainingTime.value = 300
  canResend.value = false
  clearInterval(timer)
  timer = setInterval(() => {
    if (remainingTime.value > 0) {
      remainingTime.value--
    } else {
      canResend.value = true
      clearInterval(timer)
    }
  }, 1000)
}

onMounted(() => {
  startTimer()
  setTimeout(() => otpInputs.value[0]?.focus(), 300)
})
onUnmounted(() => clearInterval(timer))

function onDigitInput(index, e) {
  const val = e.target.value.replace(/\D/g, '')
  digits.value[index] = val.slice(-1)
  clearMessages()
  if (val && index < 5) {
    otpInputs.value[index + 1]?.focus()
  }
  if (otpValue.value.length === 6) handleVerify()
}

function onKeydown(index, e) {
  if (e.key === 'Backspace' && !digits.value[index] && index > 0) {
    otpInputs.value[index - 1]?.focus()
  }
}

function onPaste(e) {
  const text = e.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, 6)
  if (!text) return
  text.split('').forEach((d, i) => { if (i < 6) digits.value[i] = d })
  otpInputs.value[Math.min(text.length, 5)]?.focus()
  if (text.length === 6) setTimeout(handleVerify, 100)
}

async function handleVerify() {
  if (otpValue.value.length < 6 || isLoading.value) return
  const result = await verifyOtp(phoneNumber.value, otpValue.value, userId.value)
  if (result.success) showSuccess.value = true
}

async function handleResend() {
  await resendOtp(phoneNumber.value)
  startTimer()
  digits.value = ['', '', '', '', '', '']
  otpInputs.value[0]?.focus()
}

function goToDashboard() {
  router.push('/dashboard')
}
</script>

<style scoped>
.otp-box {
  @apply w-11 h-14 rounded-2xl border-2 border-white/30 bg-white/10 text-white text-xl font-black text-center outline-none transition-all duration-200 backdrop-blur-sm;
  caret-color: white;
}
.otp-box:focus { @apply border-white bg-white/20; box-shadow: 0 0 0 3px rgba(255,255,255,0.2); }
.otp-box-filled { @apply border-white bg-white/25; }
.otp-box-error { @apply border-red-300 bg-red-500/10; }

.otp-pulse { animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes pulse-ring {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.3); }
  50% { box-shadow: 0 0 0 12px rgba(255,255,255,0); }
}

.text-primary { color: #cf4638; }

.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.9); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
