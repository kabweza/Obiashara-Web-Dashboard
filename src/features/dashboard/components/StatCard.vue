<template>
  <div class="stat-card">
    <div class="stat-top">
      <div class="stat-icon" :style="{ background: color + '1a' }">
        <svg v-if="icon === 'orders'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5" :style="{ color }">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <svg v-else-if="icon === 'income'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5" :style="{ color }">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
        </svg>
        <svg v-else-if="icon === 'expenses'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5" :style="{ color }">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5" :style="{ color }">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3h18V6z"/>
        </svg>
      </div>
      <div class="stat-decoration" :style="{ background: color + '0d' }" />
    </div>

    <div v-if="loading" class="skeleton-line" />
    <div v-else class="stat-value">
      <span v-if="prefix" class="stat-prefix">{{ prefix }}</span>
      {{ value }}
    </div>
    <div class="stat-label">{{ label }}</div>
  </div>
</template>

<script setup>
defineProps({
  label: String, value: [String, Number],
  icon: String, color: { default: '#cf4638' },
  prefix: String, loading: Boolean,
})
</script>

<style scoped>
.stat-card {
  background: white; border-radius: 16px; padding: 24px;
  border: 1px solid #f3f4f6; position: relative; overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04); transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.stat-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
.stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.stat-decoration { position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; border-radius: 50%; }
.stat-value { font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 4px; display: flex; align-items: baseline; gap: 4px; }
.stat-prefix { font-size: 12px; font-weight: 600; color: #9ca3af; }
.stat-label { font-size: 13px; color: #6b7280; font-weight: 500; }
.skeleton-line { height: 28px; background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 6px; margin-bottom: 4px; }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
</style>
