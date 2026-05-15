<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ t('record_sales') }}</h3>
        <button class="close-btn" @click="$emit('close')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Customer info -->
        <div class="form-section">
          <h4 class="section-title">{{ t('customer') }}</h4>
          <div class="form-row">
            <FormField :label="t('customer_name')" required>
              <input v-model="form.customerName" type="text" :placeholder="t('walk_in_customer')" class="field-input" />
            </FormField>
            <FormField :label="t('phone')">
              <input v-model="form.customerPhone" type="tel" placeholder="0712345678" class="field-input" />
            </FormField>
          </div>
        </div>

        <!-- Products -->
        <div class="form-section">
          <div class="section-header">
            <h4 class="section-title">{{ t('products') }}</h4>
            <button class="add-product-btn" @click="showProductSearch = true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {{ t('add_product') }}
            </button>
          </div>

          <!-- Product search -->
          <div v-if="showProductSearch" class="product-search-box">
            <input v-model="productSearch" type="text" :placeholder="t('search_product')" class="field-input"
              @input="filterProducts" autofocus />
            <div class="product-results">
              <div v-if="filteredProducts.length === 0" class="no-products">{{ t('no_results') }}</div>
              <button v-for="p in filteredProducts" :key="p.id" class="product-result-item" @click="addProduct(p)">
                <div class="pr-info">
                  <span class="pr-name">{{ p.name }}</span>
                  <span class="pr-stock">{{ p.type === 'Product' ? `${p.quantity} in stock` : 'Service' }}</span>
                </div>
                <span class="pr-price">TZS {{ formatCurrency(p.sellingPrice) }}</span>
              </button>
            </div>
          </div>

          <!-- Added products -->
          <div v-if="form.products.length" class="products-list">
            <div v-for="(item, idx) in form.products" :key="idx" class="product-row">
              <div class="product-row-info">
                <span class="product-row-name">{{ item.name }}</span>
                <span class="product-row-price">TZS {{ formatCurrency(item.price) }} each</span>
              </div>
              <div class="product-row-controls">
                <button class="qty-btn" @click="item.quantity = Math.max(1, item.quantity - 1)">-</button>
                <input v-model.number="item.quantity" type="number" min="1" class="qty-input" />
                <button class="qty-btn" @click="item.quantity++">+</button>
                <span class="product-row-total">TZS {{ formatCurrency(item.price * item.quantity) }}</span>
                <button class="remove-btn" @click="form.products.splice(idx, 1)">×</button>
              </div>
            </div>
          </div>

          <!-- Quick add (name + price) -->
          <button class="quick-add-btn" @click="addManualProduct">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {{ t('add_custom_product') }}
          </button>
        </div>

        <!-- Payment -->
        <div class="form-section">
          <h4 class="section-title">{{ t('payment_details') }}</h4>
          <div class="form-row">
            <FormField :label="t('discount')">
              <input v-model.number="form.discount" type="number" min="0" class="field-input" />
            </FormField>
            <FormField :label="t('payment_method')">
              <select v-model="form.paymentMethod" class="field-input">
                <option value="Cash">Cash</option>
                <option value="M-Pesa">M-Pesa</option>
                <option value="Airtel Money">Airtel Money</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit">Credit</option>
              </select>
            </FormField>
          </div>
          <div class="form-row">
            <FormField :label="t('amount_paid')">
              <input v-model.number="form.paid" type="number" min="0" class="field-input" />
            </FormField>
            <FormField :label="t('status')">
              <select v-model="form.status" class="field-input">
                <option value="paid">Paid</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </FormField>
          </div>
        </div>

        <!-- Summary -->
        <div class="sale-summary">
          <div class="summary-row"><span>{{ t('subtotal') }}</span><span>TZS {{ formatCurrency(subTotal) }}</span></div>
          <div class="summary-row"><span>{{ t('discount') }}</span><span class="text-red-500">-TZS {{
            formatCurrency(form.discount) }}</span></div>
          <div class="summary-row total"><span>{{ t('total') }}</span><span>TZS {{ formatCurrency(total) }}</span></div>
          <div class="summary-row"><span>{{ t('paid') }}</span><span class="text-green-600">TZS {{
            formatCurrency(form.paid) }}</span></div>
          <div class="summary-row" :class="remain > 0 ? 'text-red-500' : 'text-green-600'">
            <span>{{ t('balance') }}</span><span>TZS {{ formatCurrency(remain) }}</span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')">{{ t('cancel') }}</button>
        <button class="btn-save" :disabled="saving || form.products.length === 0" @click="saveSale">
          <span v-if="saving" class="spinner" />
          {{ saving ? t('loading') : t('save_sale') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDashboardStore } from '../../../../stores/dashboardStore.js'
import { useAuthStore } from '../../../../stores/authStore.js'
import { formatCurrency } from '../../services/calculationService.js'
import FormField from '../FormField.vue'

const emit = defineEmits(['close', 'saved'])
const { t } = useI18n()
const dashStore = useDashboardStore()
const authStore = useAuthStore()

const saving = ref(false)
const showProductSearch = ref(false)
const productSearch = ref('')
const filteredProducts = ref([...dashStore.productsList])

const form = reactive({
  customerName: '',
  customerPhone: '',
  products: [],
  discount: 0,
  paymentMethod: 'Cash',
  paid: 0,
  status: 'paid',
})

const subTotal = computed(() => form.products.reduce((s, p) => s + p.price * p.quantity, 0))
const total = computed(() => Math.max(0, subTotal.value - form.discount))
const remain = computed(() => Math.max(0, total.value - form.paid))

function filterProducts() {
  const q = productSearch.value.toLowerCase()
  filteredProducts.value = dashStore.productsList.filter(p =>
    !p.isDeleted && (p.name.toLowerCase().includes(q) || p.barcode?.includes(productSearch.value))
  )
}

function addProduct(product) {
  const existing = form.products.find(p => p.productId === product.id)
  if (existing) {
    existing.quantity++
  } else {
    form.products.push({
      productId: product.id,
      name: product.name,
      type: product.type,
      price: product.sellingPrice,
      purchasePrice: product.purchasePrice,
      quantity: 1,
    })
  }
  showProductSearch.value = false
  productSearch.value = ''
}

function addManualProduct() {
  form.products.push({ productId: null, name: 'Custom Item', type: 'Product', price: 0, purchasePrice: 0, quantity: 1 })
}

async function saveSale() {
  if (form.products.length === 0) return
  saving.value = true
  try {
    await dashStore.addSale(authStore.userId, {
      customerName: form.customerName || 'Walk-in Customer',
      customerPhone: form.customerPhone,
      products: JSON.parse(JSON.stringify(form.products)),
      subTotal: subTotal.value,
      total: total.value,
      discount: form.discount,
      paid: form.paid,
      remainAmount: remain.value,
      paymentMethod: form.paymentMethod,
      status: form.status,
      saleDate: new Date().toISOString().split('T')[0],
    })
    emit('saved')
  } catch (err) {
    console.error('[AddSaleModal]', err)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #f9fafb;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 520px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.field-input {
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1.5px solid #e5e7eb;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}

.field-input:focus {
  border-color: #cf4638;
}

.add-product-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1.5px dashed #cf4638;
  background: none;
  color: #cf4638;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.product-search-box {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.product-results {
  max-height: 200px;
  overflow-y: auto;
}

.product-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: none;
  cursor: pointer;
  border-top: 1px solid #f9fafb;
  text-align: left;
}

.product-result-item:hover {
  background: #fef2f2;
}

.pr-info {
  display: flex;
  flex-direction: column;
}

.pr-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.pr-stock {
  font-size: 11px;
  color: #9ca3af;
}

.pr-price {
  font-size: 13px;
  font-weight: 700;
  color: #cf4638;
}

.no-products {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
}

.products-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.product-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #f3f4f6;
  flex-wrap: wrap;
  gap: 8px;
}

.product-row-info {
  flex: 1;
}

.product-row-name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.product-row-price {
  font-size: 11px;
  color: #9ca3af;
}

.product-row-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qty-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: white;
  cursor: pointer;
  font-weight: 700;
}

.qty-input {
  width: 50px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
}

.product-row-total {
  font-size: 13px;
  font-weight: 700;
  color: #cf4638;
  min-width: 80px;
  text-align: right;
}

.remove-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #fef2f2;
  color: #ef4444;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1.5px dashed #e5e7eb;
  background: none;
  color: #9ca3af;
  font-size: 12px;
  cursor: pointer;
  align-self: flex-start;
}

.sale-summary {
  background: #fafafa;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid #f3f4f6;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #374151;
}

.summary-row.total {
  font-size: 16px;
  font-weight: 800;
  color: #111827;
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
  margin-top: 4px;
}

.text-red-500 {
  color: #ef4444;
}

.text-green-600 {
  color: #16a34a;
}

.btn-cancel {
  padding: 10px 20px;
  border-radius: 10px;
  border: 1.5px solid #e5e7eb;
  background: white;
  color: #374151;
  font-weight: 600;
  cursor: pointer;
}

.btn-save {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #cf4638, #f16657);
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
