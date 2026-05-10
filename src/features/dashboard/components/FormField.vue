<template>
  <div class="form-field">
    <label class="field-label">{{ label }}<span v-if="required" class="req">*</span></label>
    <slot />
    <p v-if="error" class="field-error">{{ error }}</p>
  </div>
</template>
<script setup>
defineProps({ label: String, required: Boolean, error: String })
</script>
<style scoped>
.form-field { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 11px; font-weight: 700; color: #cf4638; text-transform: uppercase; letter-spacing: 0.4px; }
.req { color: #ef4444; margin-left: 2px; }
.field-error { font-size: 11px; color: #ef4444; font-weight: 600; }
</style>
