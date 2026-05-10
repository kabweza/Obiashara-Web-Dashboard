<template>
  <div class="min-h-screen auth-bg relative overflow-hidden flex items-center justify-center">
    <!-- Animated background orbs -->
    <div class="orb orb-1" />
    <div class="orb orb-2" />
    <div class="orb orb-3" />

    <!-- Language switcher -->
    <div class="absolute top-4 right-4 z-50">
      <button
        @click="toggleLocale"
        class="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-white/30 transition-all duration-200 border border-white/30"
      >
        <span class="text-base">{{ currentLocale === 'en' ? '🇹🇿' : '🇬🇧' }}</span>
        {{ currentLocale === 'en' ? 'SW' : 'EN' }}
      </button>
    </div>

    <!-- Main slot -->
    <div class="relative z-10 w-full max-w-md mx-auto px-4 py-8 lg:max-w-lg">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const currentLocale = computed(() => locale.value)

function toggleLocale() {
  locale.value = locale.value === 'en' ? 'sw' : 'en'
  localStorage.setItem('locale', locale.value)
}
</script>

<style scoped>
.auth-bg {
  background: linear-gradient(135deg, #cf4638 0%, #b14639 40%, #8b1a1a 100%);
}

.orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.orb-1 {
  width: 400px;
  height: 400px;
  top: -150px;
  right: -150px;
  background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%);
  animation: float1 20s ease-in-out infinite;
}

.orb-2 {
  width: 500px;
  height: 500px;
  bottom: -200px;
  left: -200px;
  background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
  animation: float2 25s ease-in-out infinite;
}

.orb-3 {
  width: 200px;
  height: 200px;
  top: 40%;
  left: 60%;
  background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%);
  animation: float3 15s ease-in-out infinite;
}

@keyframes float1 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-30px, 30px); }
}
@keyframes float2 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, -20px); }
}
@keyframes float3 {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(15px, 20px); }
  66% { transform: translate(-10px, -15px); }
}
</style>
