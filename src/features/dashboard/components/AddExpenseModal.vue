<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ t('add_expense') }}</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <FormField :label="t('expense_type')" required>
          <input v-model="form.expenseType" type="text" class="field-input" :placeholder="t('expense_type_hint')" />
        </FormField>
        <div class="form-row">
          <FormField :label="t('amount')" required>
            <input v-model.number="form.amount" type="number" min="0" class="field-input" />
          </FormField>
          <FormField :label="t('date')">
            <input v-model="form.expenseDate" type="date" class="field-input" />
          </FormField>
        </div>
        <FormField :label="t('category')">
          <select v-model="form.category" class="field-input">
            <option value="">General</option>
            <option v-for="c in categories" :key="c.id" :value="c.name">{{ c.name }}</option>
          </select>
        </FormField>
        <FormField :label="t('details')">
          <textarea v-model="form.extraDetails" class="field-input field-textarea" rows="2" :placeholder="t('optional')" />
        </FormField>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')">{{ t('cancel') }}</button>
        <button class="btn-save" :disabled="saving || !form.expenseType || !form.amount" @click="save">
          <span v-if="saving" class="spinner" />
          {{ saving ? t('loading') : t('save') }}
        </button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDashboardStore } from '../../../stores/dashboardStore.js'
import { useAuthStore } from '../../../stores/authStore.js'
import { expensesService } from '../services/expensesService.js'
import FormField from './FormField.vue'
const emit = defineEmits(['close', 'saved'])
const { t } = useI18n()
const dashStore = useDashboardStore()
const authStore = useAuthStore()
const saving = ref(false)
const categories = ref([])
const form = reactive({
  expenseType: '', amount: 0,
  expenseDate: new Date().toISOString().split('T')[0],
  category: '', extraDetails: '',
})
async function save() {
  if (!form.expenseType || !form.amount) return
  saving.value = true
  try {
    await dashStore.addExpense(authStore.userId, form)
    emit('saved')
  } catch (e) { console.error(e) } finally { saving.value = false }
}
onMounted(async () => {
  categories.value = await expensesService.getCategories(dashStore.selectedStoreId)
})
</script>
<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal { background: white; border-radius: 20px; width: 100%; max-width: 460px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f3f4f6; }
.modal-header h3 { font-size: 18px; font-weight: 700; color: #111827; }
.close-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: #f9fafb; cursor: pointer; font-size: 20px; color: #6b7280; display: flex; align-items: center; justify-content: center; }
.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { padding: 16px 24px; border-top: 1px solid #f3f4f6; display: flex; gap: 10px; justify-content: flex-end; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-input { width: 100%; padding: 9px 12px; border-radius: 10px; border: 1.5px solid #e5e7eb; font-size: 13px; outline: none; box-sizing: border-box; }
.field-input:focus { border-color: #cf4638; }
.field-textarea { resize: vertical; min-height: 60px; font-family: inherit; }
.btn-cancel { padding: 10px 20px; border-radius: 10px; border: 1.5px solid #e5e7eb; background: white; color: #374151; font-weight: 600; cursor: pointer; }
.btn-save { display: flex; align-items: center; gap: 8px; padding: 10px 24px; border-radius: 10px; border: none; background: linear-gradient(135deg, #cf4638, #f16657); color: white; font-weight: 700; cursor: pointer; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
