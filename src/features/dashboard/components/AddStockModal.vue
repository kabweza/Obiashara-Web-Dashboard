<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <div>
          <h3>{{ t('add_stock') }}</h3>
          <p class="sub">{{ product.name }} · {{ t('current') }}: {{ product.quantity }}</p>
        </div>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <FormField :label="t('quantity_to_add')" required>
          <input v-model.number="qty" type="number" min="1" class="field-input" />
        </FormField>
        <div class="form-row">
          <FormField :label="t('purchase_price')">
            <input v-model.number="purchasePrice" type="number" min="0" class="field-input" />
          </FormField>
          <FormField :label="t('selling_price')">
            <input v-model.number="sellingPrice" type="number" min="0" class="field-input" />
          </FormField>
        </div>
        <div class="preview">
          <span>{{ t('new_qty') }}:</span>
          <span class="preview-val">{{ (product.quantity ?? 0) + qty }}</span>
          <span class="preview-cost">· Cost: TZS {{ formatCurrency(purchasePrice * qty) }}</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')">{{ t('cancel') }}</button>
        <button class="btn-save" :disabled="saving || qty < 1" @click="save">
          <span v-if="saving" class="spinner" />
          {{ saving ? t('loading') : t('add_stock') }}
        </button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDashboardStore } from '../../../stores/dashboardStore.js'
import { formatCurrency } from '../services/calculationService.js'
import FormField from './FormField.vue'
const props = defineProps({ product: Object })
const emit = defineEmits(['close', 'saved'])
const { t } = useI18n()
const dashStore = useDashboardStore()
const saving = ref(false)
const qty = ref(1)
const purchasePrice = ref(props.product?.purchasePrice ?? 0)
const sellingPrice = ref(props.product?.sellingPrice ?? 0)
async function save() {
  if (qty.value < 1) return
  saving.value = true
  try {
    await dashStore.addStock(props.product.id, { purchasePrice: purchasePrice.value, sellingPrice: sellingPrice.value, quantity: qty.value })
    emit('saved')
  } catch (e) { console.error(e) } finally { saving.value = false }
}
</script>
<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal { background: white; border-radius: 20px; width: 100%; max-width: 420px; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f3f4f6; }
.modal-header h3 { font-size: 18px; font-weight: 700; color: #111827; }
.sub { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.close-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: #f9fafb; cursor: pointer; font-size: 20px; color: #6b7280; display: flex; align-items: center; justify-content: center; }
.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { padding: 16px 24px; border-top: 1px solid #f3f4f6; display: flex; gap: 10px; justify-content: flex-end; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-input { width: 100%; padding: 9px 12px; border-radius: 10px; border: 1.5px solid #e5e7eb; font-size: 13px; outline: none; box-sizing: border-box; }
.field-input:focus { border-color: #cf4638; }
.preview { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #f0fdf4; border-radius: 10px; font-size: 13px; font-weight: 600; color: #374151; }
.preview-val { font-size: 18px; font-weight: 800; color: #16a34a; }
.preview-cost { color: #9ca3af; font-weight: 400; font-size: 12px; }
.btn-cancel { padding: 10px 20px; border-radius: 10px; border: 1.5px solid #e5e7eb; background: white; color: #374151; font-weight: 600; cursor: pointer; }
.btn-save { display: flex; align-items: center; gap: 8px; padding: 10px 24px; border-radius: 10px; border: none; background: linear-gradient(135deg, #cf4638, #f16657); color: white; font-weight: 700; cursor: pointer; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
