<template>
  <div class="overlay" @click.self="$emit('cancel')">
    <div class="modal">
      <div class="icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" class="w-10 h-10">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
        </svg>
      </div>
      <h3 class="modal-title">{{ title }}</h3>
      <p class="modal-msg">{{ message }}</p>
      <div class="modal-actions">
        <button class="btn-cancel" @click="$emit('cancel')">Cancel</button>
        <button class="btn-confirm" @click="$emit('confirm')">Delete</button>
      </div>
    </div>
  </div>
</template>
<script setup>
defineProps({ title: String, message: String })
defineEmits(['confirm', 'cancel'])
</script>
<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
.modal { background: white; border-radius: 20px; padding: 32px; max-width: 400px; width: 100%; text-align: center; }
.icon-wrap { width: 64px; height: 64px; background: #fef2f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.modal-title { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 8px; }
.modal-msg { font-size: 14px; color: #6b7280; margin-bottom: 24px; line-height: 1.5; }
.modal-actions { display: flex; gap: 10px; justify-content: center; }
.btn-cancel { padding: 10px 24px; border-radius: 10px; border: 1.5px solid #e5e7eb; background: white; color: #374151; font-weight: 600; cursor: pointer; }
.btn-confirm { padding: 10px 24px; border-radius: 10px; border: none; background: #ef4444; color: white; font-weight: 700; cursor: pointer; }
</style>
