<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ product ? t('edit_product') : t('add_product') }}</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <FormField :label="t('product_name')" required>
            <input v-model="form.name" type="text" class="field-input" :placeholder="t('product_name_hint')" />
          </FormField>
          <FormField :label="t('type')">
            <select v-model="form.type" class="field-input">
              <option value="Product">Product</option>
              <option value="Service">Service</option>
            </select>
          </FormField>
        </div>
        <div class="form-row">
          <FormField :label="t('selling_price')" required>
            <input v-model.number="form.sellingPrice" type="number" min="0" class="field-input" />
          </FormField>
          <FormField :label="t('purchase_price')">
            <input v-model.number="form.purchasePrice" type="number" min="0" class="field-input" />
          </FormField>
        </div>
        <div class="form-row">
          <FormField v-if="form.type === 'Product'" :label="t('quantity')">
            <input v-model.number="form.quantity" type="number" min="0" class="field-input" />
          </FormField>
          <FormField :label="t('category')">
            <input v-model="form.category" type="text" class="field-input" :placeholder="t('category_hint')" />
          </FormField>
        </div>
        <FormField :label="t('barcode')">
          <input v-model="form.barcode" type="text" class="field-input" placeholder="Optional" />
        </FormField>
        <FormField :label="t('description')">
          <textarea v-model="form.description" class="field-input field-textarea" rows="2" placeholder="Optional description" />
        </FormField>

        <!-- Margin preview -->
        <div v-if="form.sellingPrice && form.purchasePrice" class="margin-preview">
          <span>Margin:</span>
          <span :class="margin >= 0 ? 'text-green-600' : 'text-red-500'">
            TZS {{ formatCurrency(margin) }} ({{ marginPct }}%)
          </span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')">{{ t('cancel') }}</button>
        <button class="btn-save" :disabled="saving || !form.name" @click="save">
          <span v-if="saving" class="spinner" />
          {{ saving ? t('loading') : (product ? t('save_changes') : t('add_product')) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDashboardStore } from '../../../stores/dashboardStore.js'
import { useAuthStore } from '../../../stores/authStore.js'
import { formatCurrency } from '../services/calculationService.js'
import FormField from './FormField.vue'

const props = defineProps({ product: Object })
const emit = defineEmits(['close', 'saved'])
const { t } = useI18n()
const dashStore = useDashboardStore()
const authStore = useAuthStore()
const saving = ref(false)

const form = reactive({
  name: props.product?.name ?? '',
  type: props.product?.type ?? 'Product',
  sellingPrice: props.product?.sellingPrice ?? 0,
  purchasePrice: props.product?.purchasePrice ?? 0,
  quantity: props.product?.quantity ?? 0,
  category: props.product?.category ?? '',
  barcode: props.product?.barcode ?? '',
  description: props.product?.description ?? '',
})

const margin = computed(() => form.sellingPrice - form.purchasePrice)
const marginPct = computed(() => form.sellingPrice ? ((margin.value / form.sellingPrice) * 100).toFixed(1) : 0)

async function save() {
  if (!form.name) return
  saving.value = true
  try {
    if (props.product) {
      await dashStore.updateProduct(props.product.id, form)
    } else {
      await dashStore.addProduct(authStore.userId, form)
    }
    emit('saved')
  } catch (e) {
    console.error('[AddProductModal]', e)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal { background: white; border-radius: 20px; width: 100%; max-width: 540px; max-height: 90vh; display: flex; flex-direction: column; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f3f4f6; }
.modal-header h3 { font-size: 18px; font-weight: 700; color: #111827; }
.close-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: #f9fafb; cursor: pointer; font-size: 20px; color: #6b7280; display: flex; align-items: center; justify-content: center; }
.modal-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { padding: 16px 24px; border-top: 1px solid #f3f4f6; display: flex; gap: 10px; justify-content: flex-end; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }
.field-input { width: 100%; padding: 9px 12px; border-radius: 10px; border: 1.5px solid #e5e7eb; font-size: 13px; outline: none; box-sizing: border-box; }
.field-input:focus { border-color: #cf4638; }
.field-textarea { resize: vertical; min-height: 64px; font-family: inherit; }
.margin-preview { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #f9fafb; border-radius: 10px; font-size: 13px; font-weight: 600; color: #374151; }
.text-green-600 { color: #16a34a; }
.text-red-500 { color: #ef4444; }
.btn-cancel { padding: 10px 20px; border-radius: 10px; border: 1.5px solid #e5e7eb; background: white; color: #374151; font-weight: 600; cursor: pointer; }
.btn-save { display: flex; align-items: center; gap: 8px; padding: 10px 24px; border-radius: 10px; border: none; background: linear-gradient(135deg, #cf4638, #f16657); color: white; font-weight: 700; cursor: pointer; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; animation: spin 0.8s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
