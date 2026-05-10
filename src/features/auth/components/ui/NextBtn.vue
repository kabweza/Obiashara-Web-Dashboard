<!-- NextBtn.vue -->
<template>
  <button
    type="button"
    class="w-full h-13 py-3.5 rounded-2xl font-bold text-white text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2"
    style="background:linear-gradient(135deg,#cf4638 0%,#f16657 100%);box-shadow:0 8px 20px rgba(207,70,56,0.35)"
    @click="$emit('click')"
  >
    {{ label }}
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  </button>
</template>
<script setup>
defineProps({ label: String })
defineEmits(['click'])
</script>
