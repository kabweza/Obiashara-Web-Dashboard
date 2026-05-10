<template>
  <button
    type="button"
    class="w-full flex items-center gap-3 rounded-2xl border-2 p-3.5 transition-all duration-200 text-left"
    :class="enabled ? 'bg-white border-gray-200 hover:border-primary cursor-pointer' : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'"
    :disabled="!enabled"
    @click="$emit('click')"
  >
    <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" :style="enabled ? 'background:rgba(207,70,56,0.1)' : 'background:#f3f4f6'">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" :stroke="enabled ? '#cf4638' : '#9ca3af'" class="w-4 h-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-xs font-bold" :style="enabled ? 'color:#cf4638' : 'color:#9ca3af'">{{ label }}</p>
      <p class="text-sm font-semibold truncate" :class="value ? 'text-gray-800' : 'text-gray-400'">
        {{ value ?? `Select ${label}` }}
      </p>
    </div>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" :stroke="enabled ? '#cf4638' : '#9ca3af'" class="w-4 h-4 shrink-0">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  </button>
</template>
<script setup>
defineProps({ label: String, value: String, enabled: { default: true }, icon: String })
defineEmits(['click'])
</script>
