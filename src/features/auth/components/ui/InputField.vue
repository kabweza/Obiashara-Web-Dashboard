<template>
  <div class="flex flex-col gap-1.5">
    <label class="text-xs font-bold tracking-wide" style="color:#cf4638">{{ label }}</label>
    <div
      class="flex items-center bg-white rounded-2xl border-2 transition-all duration-200 overflow-hidden"
      :class="[error ? 'border-red-400' : isFocused ? 'border-primary shadow-md' : 'border-gray-200']"
    >
      <div class="flex items-center justify-center w-12 h-12 shrink-0" style="background:rgba(207,70,56,0.08)">
        <!-- user icon -->
        <svg v-if="icon === 'user'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="#cf4638" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        <!-- phone icon -->
        <svg v-else-if="icon === 'phone'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="#cf4638" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
        <!-- store icon -->
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="#cf4638" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
        </svg>
      </div>
      <input
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        class="flex-1 py-3 pr-4 text-gray-800 bg-transparent text-sm font-semibold outline-none placeholder-gray-400"
        @input="$emit('update:modelValue', $event.target.value)"
        @focus="isFocused = true"
        @blur="isFocused = false; $emit('blur')"
      />
    </div>
    <p v-if="error" class="text-red-500 text-xs font-semibold pl-1">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
defineProps({ modelValue: String, label: String, placeholder: String, error: String, icon: String, type: { default: 'text' } })
defineEmits(['update:modelValue', 'blur', 'input'])
const isFocused = ref(false)
</script>
