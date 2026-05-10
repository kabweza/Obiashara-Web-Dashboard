<template>
  <Transition name="sheet">
    <div class="fixed inset-0 z-50 flex items-end justify-center" @click.self="$emit('close')">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')" />
      <div class="relative bg-white w-full max-w-lg rounded-t-3xl max-h-[75vh] flex flex-col overflow-hidden shadow-2xl">
        <!-- Handle -->
        <div class="flex justify-center pt-3 pb-1">
          <div class="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 class="text-lg font-bold text-gray-800">{{ title }}</h3>
          <button type="button" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors" @click="$emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5 text-gray-500">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <!-- Search (optional) -->
        <div v-if="searchable" class="px-5 py-3 border-b border-gray-100">
          <div class="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="#cf4638" class="w-4 h-4 shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              v-model="search"
              type="text"
              placeholder="Search..."
              class="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400"
            />
          </div>
        </div>
        <!-- Content -->
        <div class="overflow-y-auto flex-1 overscroll-contain">
          <slot :search="search" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue'
defineProps({ title: String, searchable: Boolean })
defineEmits(['close'])
const search = ref('')
</script>

<style scoped>
.sheet-enter-active, .sheet-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .relative, .sheet-leave-to .relative { transform: translateY(100%); }
</style>
