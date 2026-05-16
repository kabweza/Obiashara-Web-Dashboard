<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-panel">

      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <div class="modal-header">
        <div class="modal-title-block">
          <div class="modal-icon">
            <svg viewBox="0 0 24 24" fill="white" class="w-5 h-5">
              <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"/>
            </svg>
          </div>
          <div>
            <h2 class="modal-title">New Sale</h2>
            <p class="modal-sub">Add products and confirm payment</p>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- ── Body: two-column ───────────────────────────────────────────── -->
      <div class="modal-body">

        <!-- LEFT: Product Search + Cart ───────────────────────── -->
        <div class="col-left">

          <!-- Product search -->
          <div class="section-label">Products</div>
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-ico">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
            </svg>
            <input
              v-model="productSearch"
              type="text"
              placeholder="Search products..."
              class="search-input"
              @focus="showDropdown = true"
              @blur="onSearchBlur"
            />
          </div>

          <!-- Product dropdown -->
          <div v-if="showDropdown && filteredProducts.length" class="product-dropdown">
            <button
              v-for="p in filteredProducts"
              :key="p.id"
              class="product-option"
              :class="{ 'out-of-stock': (p.quantity ?? 0) <= 0 }"
              @mousedown.prevent="addToCart(p)"
            >
              <div class="product-option-info">
                <span class="product-option-name">{{ p.name }}</span>
                <span class="product-option-stock" :class="(p.quantity ?? 0) <= 0 ? 'no-stock' : ''">
                  {{ (p.quantity ?? 0) > 0 ? `${p.quantity} in stock` : 'Out of stock' }}
                </span>
              </div>
              <span class="product-option-price">TZS {{ formatNum(getSellingPrice(p)) }}</span>
            </button>
          </div>

          <div v-if="showDropdown && filteredProducts.length === 0 && productSearch" class="dropdown-empty">
            No products found for "{{ productSearch }}"
          </div>

          <!-- Cart items -->
          <div class="cart-area">
            <div v-if="cart.length === 0" class="cart-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-10 h-10">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"/>
              </svg>
              <p>Search and add products above</p>
            </div>

            <transition-group name="cart-item" tag="div" class="cart-list">
              <div v-for="item in cart" :key="item.productId" class="cart-row">
                <div class="cart-row-main">
                  <div class="cart-info">
                    <span class="cart-name">{{ item.name }}</span>
                    <span class="cart-unit-price">TZS {{ formatNum(item.price) }} each</span>
                  </div>
                  <div class="cart-controls">
                    <button class="qty-btn" @click="decrementQty(item)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="w-3 h-3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15"/>
                      </svg>
                    </button>
                    <input
                      v-model.number="item.quantity"
                      type="number"
                      min="1"
                      class="qty-input"
                      @input="onQtyChange(item)"
                    />
                    <button class="qty-btn" @click="incrementQty(item)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="w-3 h-3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                      </svg>
                    </button>
                  </div>
                  <div class="cart-line-total">TZS {{ formatNum(item.price * item.quantity) }}</div>
                  <button class="cart-remove" @click="removeFromCart(item.productId)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
                <!-- Low stock warning -->
                <div v-if="item.quantity > item.availableStock" class="stock-warn">
                  <svg viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3">
                    <path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"/>
                  </svg>
                  Only {{ item.availableStock }} in stock
                </div>
              </div>
            </transition-group>
          </div>
        </div>

        <!-- RIGHT: Summary + Payment ──────────────────────────── -->
        <div class="col-right">

          <!-- Totals card -->
          <div class="totals-card">
            <div class="section-label">Summary</div>

            <div class="totals-rows">
              <div class="totals-row">
                <span>Subtotal</span>
                <span>TZS {{ formatNum(subTotal) }}</span>
              </div>
              <div class="totals-row discount-row">
                <span>Discount</span>
                <div class="discount-input-wrap">
                  <span class="currency-prefix">TZS</span>
                  <input
                    v-model.number="form.discount"
                    type="number"
                    min="0"
                    :max="subTotal"
                    class="inline-input"
                    placeholder="0"
                    @input="onDiscountChange"
                  />
                </div>
              </div>
              <div class="totals-divider" />
              <div class="totals-row total-row">
                <span>Net Total</span>
                <span class="net-total-val">TZS {{ formatNum(netTotal) }}</span>
              </div>
            </div>
          </div>

          <!-- Payment section -->
          <div class="payment-card">
            <div class="section-label">Payment</div>

            <!-- Payment method -->
            <div class="field-group">
              <label class="field-label">Method</label>
              <div class="payment-methods">
                <button
                  v-for="m in paymentMethods"
                  :key="m.value"
                  class="method-btn"
                  :class="{ active: form.paymentMethod === m.value }"
                  @click="form.paymentMethod = m.value"
                >
                  <span class="method-icon">{{ m.icon }}</span>
                  <span>{{ m.label }}</span>
                </button>
              </div>
            </div>

            <!-- ── Owing / Credit toggle ──────────────────────── -->
            <div class="owing-toggle" @click="toggleOwing">
              <div class="toggle-track" :class="{ 'is-on': form.isOwing }">
                <div class="toggle-thumb" />
              </div>
              <div class="toggle-labels">
                <span class="toggle-title">Sell on Credit / Owing</span>
                <span class="toggle-sub">Customer will pay later or partially</span>
              </div>
            </div>

            <!-- Paid amount (shown when owing OR always for reference) -->
            <div class="paid-section" :class="{ 'owing-active': form.isOwing }">

              <div class="field-group">
                <label class="field-label">
                  {{ form.isOwing ? 'Amount Paid Now' : 'Paid Amount' }}
                </label>
                <div class="amount-input-wrap">
                  <span class="currency-tag">TZS</span>
                  <input
                    v-model.number="form.paidAmount"
                    type="number"
                    min="0"
                    :max="netTotal"
                    class="amount-input"
                    :readonly="!form.isOwing"
                    :class="{ 'readonly-field': !form.isOwing }"
                    @input="onPaidAmountChange"
                  />
                </div>
                <p v-if="!form.isOwing" class="field-hint">Full amount. Enable credit to change.</p>
                <p v-else class="field-hint">Enter what the customer is paying now.</p>
              </div>

              <!-- Remaining amount — only shown when owing -->
              <transition name="fade">
                <div v-if="form.isOwing" class="remaining-block">
                  <div class="remaining-row">
                    <div class="remaining-labels">
                      <span class="remaining-title">Remaining Balance</span>
                      <span class="remaining-sub">Customer owes this amount</span>
                    </div>
                    <span class="remaining-val" :class="remainingAmount > 0 ? 'has-balance' : 'no-balance'">
                      TZS {{ formatNum(remainingAmount) }}
                    </span>
                  </div>
                  <!-- Visual bar -->
                  <div class="payment-bar">
                    <div class="payment-bar-fill" :style="{ width: paidPercent + '%' }" />
                  </div>
                  <div class="payment-bar-labels">
                    <span>Paid {{ paidPercent }}%</span>
                    <span>Remaining {{ 100 - paidPercent }}%</span>
                  </div>
                </div>
              </transition>
            </div>

            <!-- Status badge preview -->
            <div class="status-preview">
              <span class="status-dot" :class="statusClass" />
              <span class="status-text">Status: <strong>{{ statusLabel }}</strong></span>
            </div>
          </div>

          <!-- Customer section -->
          <div class="customer-card">
            <div class="section-label">Customer <span class="optional-tag">optional</span></div>
            <div class="field-row">
              <div class="field-group">
                <label class="field-label">Name</label>
                <input v-model="form.customerName" type="text" placeholder="Walk-in Customer" class="field-input" />
              </div>
              <div class="field-group">
                <label class="field-label">Phone</label>
                <input v-model="form.customerPhone" type="tel" placeholder="0712 345 678" class="field-input" />
              </div>
            </div>
            <div class="field-row">
              <div class="field-group">
                <label class="field-label">Sale Date</label>
                <input v-model="form.saleDate" type="date" class="field-input" />
              </div>
              <div class="field-group">
                <label class="field-label">Note</label>
                <input v-model="form.description" type="text" placeholder="Optional note..." class="field-input" />
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- ── Footer ─────────────────────────────────────────────────────── -->
      <div class="modal-footer">
        <div class="footer-summary">
          <span class="footer-items">{{ cart.length }} item{{ cart.length !== 1 ? 's' : '' }}</span>
          <span class="footer-total">TZS {{ formatNum(netTotal) }}</span>
        </div>
        <div class="footer-actions">
          <button class="btn-cancel" @click="$emit('close')">Cancel</button>
          <button
            class="btn-save"
            :disabled="cart.length === 0 || saving || !isValidSale"
            @click="handleSave"
          >
            <span v-if="saving" class="btn-spinner" />
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
            {{ saving ? 'Saving…' : 'Confirm Sale' }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted } from 'vue'
import { useDashboardStore } from '../../../../stores/dashboardStore.js'
import { useAuthStore } from '../../../../stores/authStore.js'

const emit = defineEmits(['close', 'saved'])

const dashStore = useDashboardStore()
const authStore = useAuthStore()

// ── Products ────────────────────────────────────────────────────────────────

const allProducts = computed(() =>
  dashStore.productsList.filter(p => !p.isDeleted && p.type !== 'Service')
)

const productSearch = ref('')
const showDropdown = ref(false)

const filteredProducts = computed(() => {
  const q = productSearch.value.toLowerCase().trim()
  if (!q) return allProducts.value.slice(0, 20)
  return allProducts.value.filter(p =>
    p.name?.toLowerCase().includes(q) ||
    p.category?.toLowerCase().includes(q)
  ).slice(0, 20)
})

function getSellingPrice(product) {
  return product.sellingPrice ?? product.selling_price ?? product.price ?? 0
}

function getProductStock(product) {
  return product.quantity ?? 0
}

function onSearchBlur() {
  setTimeout(() => { showDropdown.value = false }, 150)
}

// ── Cart ────────────────────────────────────────────────────────────────────

const cart = ref([])

function addToCart(product) {
  const existing = cart.value.find(i => i.productId === product.id)
  if (existing) {
    existing.quantity = Math.min(existing.quantity + 1, existing.availableStock || 9999)
  } else {
    cart.value.push({
      productId: product.id,
      name: product.name,
      type: product.type ?? 'Product',
      price: getSellingPrice(product),
      purchasePrice: product.buyingPrice ?? product.buying_price ?? product.purchasePrice ?? 0,
      availableStock: getProductStock(product),
      quantity: 1,
    })
  }
  productSearch.value = ''
  showDropdown.value = false
}

function removeFromCart(productId) {
  cart.value = cart.value.filter(i => i.productId !== productId)
}

function incrementQty(item) {
  const maxQty = item.availableStock || 9999
  item.quantity = Math.min(item.quantity + 1, maxQty)
}

function decrementQty(item) {
  if (item.quantity <= 1) {
    removeFromCart(item.productId)
  } else {
    item.quantity -= 1
  }
}

function onQtyChange(item) {
  const val = parseInt(item.quantity, 10)
  if (isNaN(val) || val < 1) item.quantity = 1
}

// ── Totals ───────────────────────────────────────────────────────────────────

const subTotal = computed(() =>
  cart.value.reduce((sum, i) => sum + i.price * i.quantity, 0)
)

const netTotal = computed(() =>
  Math.max(0, subTotal.value - (form.discount || 0))
)

const remainingAmount = computed(() =>
  form.isOwing ? Math.max(0, netTotal.value - (form.paidAmount || 0)) : 0
)

const paidPercent = computed(() => {
  if (!netTotal.value) return 100
  return Math.min(100, Math.round(((form.paidAmount || 0) / netTotal.value) * 100))
})

// ── Form state ───────────────────────────────────────────────────────────────

const form = reactive({
  customerName: '',
  customerPhone: '',
  discount: 0,
  paymentMethod: 'cash',
  paidAmount: 0,
  isOwing: false,
  saleDate: new Date().toISOString().split('T')[0],
  description: '',
})

watch(netTotal, (val) => {
  if (!form.isOwing) {
    form.paidAmount = val
  }
}, { immediate: true })

function onDiscountChange() {
  if (form.discount > subTotal.value) form.discount = subTotal.value
  if (!form.isOwing) form.paidAmount = netTotal.value
}

function onPaidAmountChange() {
  const val = parseFloat(form.paidAmount) || 0
  if (val > netTotal.value) form.paidAmount = netTotal.value
  if (val < 0) form.paidAmount = 0
}

function toggleOwing() {
  form.isOwing = !form.isOwing
  if (!form.isOwing) {
    form.paidAmount = netTotal.value
  } else {
    form.paidAmount = 0
  }
}

// ── Payment methods ──────────────────────────────────────────────────────────

const paymentMethods = [
  { value: 'cash',   label: 'Cash',   icon: '💵' },
  { value: 'mobile', label: 'Mobile', icon: '📱' },
  { value: 'bank',   label: 'Bank',   icon: '🏦' },
  { value: 'credit', label: 'Credit', icon: '📋' },
]

// ── Status ───────────────────────────────────────────────────────────────────

const saleStatus = computed(() => {
  if (!form.isOwing) return 'paid'
  if (form.paidAmount <= 0) return 'owing'
  if (form.paidAmount < netTotal.value) return 'partial'
  return 'paid'
})

const statusLabel = computed(() => {
  const map = { paid: 'Paid ✓', owing: 'Owing', partial: 'Partially Paid' }
  return map[saleStatus.value] ?? 'Paid'
})

const statusClass = computed(() => {
  return {
    paid: 'dot-green',
    owing: 'dot-red',
    partial: 'dot-orange',
  }[saleStatus.value] ?? 'dot-green'
})

// ── Validation ───────────────────────────────────────────────────────────────

const isValidSale = computed(() => {
  if (cart.value.length === 0) return false
  if (netTotal.value <= 0) return false
  if (form.paidAmount < 0) return false
  return true
})

// ── Save ─────────────────────────────────────────────────────────────────────
// ✅ FIXED: matching the working modal's store call signature and payload structure
const saving = ref(false)

async function handleSave() {
  if (!isValidSale.value || saving.value) return
  saving.value = true

  try {
    const userId = authStore.user?.uid ?? authStore.userId
    if (!userId) throw new Error('User not authenticated')

    // Deep copy products to avoid reactivity issues
    const productsCopy = JSON.parse(JSON.stringify(cart.value.map(item => ({
      productId: item.productId,
      name: item.name,
      type: item.type,
      price: item.price,
      purchasePrice: item.purchasePrice,
      quantity: item.quantity,
    }))))

    const payload = {
      customerName: form.customerName.trim() || 'Walk-in Customer',
      customerPhone: form.customerPhone.trim(),
      products: productsCopy,
      subTotal: subTotal.value,
      total: netTotal.value,
      discount: form.discount || 0,
      paid: form.paidAmount,               // ✅ paid amount stored
      remainAmount: remainingAmount.value,
      paymentMethod: form.paymentMethod,
      status: saleStatus.value,
      saleDate: form.saleDate,
      description: form.description.trim(),
    }

    // ✅ Correct signature: addSale(userId, payload)
    await dashStore.addSale(userId, payload)

    emit('saved')
  } catch (err) {
    console.error('[AddSaleModal] Save failed:', err)
    alert('Failed to save sale. Please try again.')
  } finally {
    saving.value = false
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatNum(n) {
  return (n ?? 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 })
}
</script>

<style scoped>

/* ── Overlay ──────────────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  animation: overlay-in 0.2s ease;
}

@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ── Panel ────────────────────────────────────────────────────────────────── */
.modal-panel {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 900px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 32px 64px -12px rgba(0,0,0,0.35);
  animation: panel-in 0.25s cubic-bezier(0.34,1.56,0.64,1);
}

@keyframes panel-in {
  from { opacity: 0; transform: scale(0.96) translateY(12px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);    }
}

/* ── Header ───────────────────────────────────────────────────────────────── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
}

.modal-title-block {
  display: flex;
  align-items: center;
  gap: 14px;
}

.modal-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #cf4638, #f16657);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(207,70,56,0.35);
}

.modal-title {
  font-size: 18px;
  font-weight: 800;
  color: #111827;
  margin: 0;
}

.modal-sub {
  font-size: 12px;
  color: #9ca3af;
  margin: 2px 0 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1.5px solid #e5e7eb;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
  transition: background 0.2s, color 0.2s;
}

.close-btn:hover { background: #fef2f2; color: #ef4444; border-color: #fca5a5; }

/* ── Body ─────────────────────────────────────────────────────────────────── */
.modal-body {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 0;
  flex: 1;
  overflow: hidden;
}

/* ── Left column ─────────────────────────────────────────────────────── */
.col-left {
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 12px;
  overflow-y: auto;
  border-right: 1px solid #f3f4f6;
  position: relative;
}

.section-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #9ca3af;
  margin-bottom: 2px;
}

.optional-tag {
  font-size: 9px;
  background: #f3f4f6;
  color: #9ca3af;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 6px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

/* Search */
.search-box {
  position: relative;
}

.search-ico {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #9ca3af;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 34px;
  border-radius: 10px;
  border: 1.5px solid #e5e7eb;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
  background: #fafafa;
  transition: border-color 0.2s, background 0.2s;
}

.search-input:focus {
  border-color: #cf4638;
  background: white;
}

/* Product dropdown */
.product-dropdown {
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  max-height: 220px;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  animation: dropdown-in 0.15s ease;
}

@keyframes dropdown-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.product-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
  gap: 12px;
}

.product-option:hover { background: #fef7f6; }
.product-option.out-of-stock { opacity: 0.5; cursor: not-allowed; }

.product-option-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.product-option-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-option-stock {
  font-size: 11px;
  color: #6b7280;
}

.product-option-stock.no-stock { color: #ef4444; }

.product-option-price {
  font-size: 13px;
  font-weight: 700;
  color: #cf4638;
  white-space: nowrap;
  flex-shrink: 0;
}

.dropdown-empty {
  padding: 12px 16px;
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
}

/* Cart */
.cart-area {
  flex: 1;
  min-height: 0;
}

.cart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 16px;
  color: #d1d5db;
}

.cart-empty p {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 500;
  text-align: center;
}

.cart-list { display: flex; flex-direction: column; gap: 8px; }

.cart-row {
  background: #fafafa;
  border-radius: 12px;
  padding: 12px;
  border: 1.5px solid #f3f4f6;
  transition: border-color 0.2s;
}

.cart-row:hover { border-color: #ffd4d0; }

.cart-row-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cart-info {
  flex: 1;
  min-width: 0;
}

.cart-name {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cart-unit-price {
  font-size: 11px;
  color: #9ca3af;
}

.cart-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  padding: 2px 4px;
}

.qty-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #374151;
  transition: background 0.15s;
}

.qty-btn:hover { background: #f3f4f6; }

.qty-input {
  width: 38px;
  text-align: center;
  border: none;
  outline: none;
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  background: transparent;
  -moz-appearance: textfield;
}

.qty-input::-webkit-outer-spin-button,
.qty-input::-webkit-inner-spin-button { -webkit-appearance: none; }

.cart-line-total {
  font-size: 13px;
  font-weight: 800;
  color: #111827;
  white-space: nowrap;
  min-width: 90px;
  text-align: right;
}

.cart-remove {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #d1d5db;
  transition: background 0.2s, color 0.2s;
  flex-shrink: 0;
}

.cart-remove:hover { background: #fef2f2; color: #ef4444; }

.stock-warn {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  font-size: 11px;
  color: #f59e0b;
  font-weight: 600;
}

/* Cart list animation */
.cart-item-enter-active { animation: cart-in 0.2s ease; }
.cart-item-leave-active { animation: cart-out 0.15s ease forwards; }

@keyframes cart-in {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes cart-out {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(8px); }
}

/* ── Right column ─────────────────────────────────────────────────────── */
.col-right {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  background: #fafafa;
}

.totals-card,
.payment-card,
.customer-card {
  padding: 20px;
  border-bottom: 1px solid #f3f4f6;
}

/* Totals */
.totals-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #6b7280;
}

.discount-row {
  color: #374151;
}

.discount-input-wrap {
  display: flex;
  align-items: center;
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  padding-left: 8px;
  transition: border-color 0.2s;
}

.discount-input-wrap:focus-within { border-color: #cf4638; }

.currency-prefix {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 600;
  margin-right: 4px;
  white-space: nowrap;
}

.inline-input {
  border: none;
  outline: none;
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  width: 80px;
  padding: 6px 8px 6px 0;
  text-align: right;
  background: transparent;
  -moz-appearance: textfield;
}

.inline-input::-webkit-outer-spin-button,
.inline-input::-webkit-inner-spin-button { -webkit-appearance: none; }

.totals-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0;
}

.total-row {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.net-total-val {
  color: #cf4638;
  font-size: 16px;
  font-weight: 800;
}

/* Payment */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 14px;
}

.field-group:last-child { margin-bottom: 0; }

.field-label {
  font-size: 11px;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.payment-methods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.method-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1.5px solid #e5e7eb;
  background: white;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  transition: all 0.2s;
}

.method-btn:hover { border-color: #fca5a5; background: #fff5f5; }
.method-btn.active { border-color: #cf4638; background: #fff1f0; color: #cf4638; }

.method-icon { font-size: 14px; }

/* Owing toggle */
.owing-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1.5px solid #e5e7eb;
  background: white;
  cursor: pointer;
  margin-bottom: 14px;
  transition: border-color 0.2s, background 0.2s;
  user-select: none;
}

.owing-toggle:hover { border-color: #fca5a5; }

.toggle-track {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: #d1d5db;
  position: relative;
  transition: background 0.25s;
  flex-shrink: 0;
}

.toggle-track.is-on { background: #cf4638; }

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
  transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
}

.toggle-track.is-on .toggle-thumb {
  transform: translateX(18px);
}

.toggle-labels {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.toggle-title {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}

.toggle-sub {
  font-size: 11px;
  color: #9ca3af;
}

/* Paid section */
.paid-section {
  border-radius: 12px;
  padding: 14px;
  background: white;
  border: 1.5px solid #e5e7eb;
  transition: border-color 0.2s, background 0.2s;
}

.paid-section.owing-active {
  border-color: #fca5a5;
  background: #fff8f7;
}

.amount-input-wrap {
  display: flex;
  align-items: center;
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.amount-input-wrap:focus-within { border-color: #cf4638; }

.currency-tag {
  padding: 10px 10px;
  background: #f9fafb;
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  border-right: 1px solid #e5e7eb;
  white-space: nowrap;
}

.amount-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 10px 12px;
  font-size: 15px;
  font-weight: 800;
  color: #111827;
  background: transparent;
  -moz-appearance: textfield;
}

.amount-input::-webkit-outer-spin-button,
.amount-input::-webkit-inner-spin-button { -webkit-appearance: none; }

.amount-input.readonly-field {
  color: #6b7280;
  background: #f9fafb;
}

.field-hint {
  font-size: 11px;
  color: #9ca3af;
  margin: 3px 0 0;
}

/* Remaining block */
.remaining-block {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #fca5a5;
}

.remaining-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.remaining-labels {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.remaining-title {
  font-size: 12px;
  font-weight: 700;
  color: #374151;
}

.remaining-sub {
  font-size: 11px;
  color: #9ca3af;
}

.remaining-val {
  font-size: 16px;
  font-weight: 800;
}

.remaining-val.has-balance { color: #dc2626; }
.remaining-val.no-balance  { color: #16a34a; }

/* Payment bar */
.payment-bar {
  height: 7px;
  background: #fee2e2;
  border-radius: 4px;
  overflow: hidden;
}

.payment-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #16a34a, #22c55e);
  border-radius: 4px;
  transition: width 0.4s ease;
}

.payment-bar-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #9ca3af;
  font-weight: 600;
  margin-top: 5px;
}

/* Status preview */
.status-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  font-size: 12px;
  color: #6b7280;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-green  { background: #22c55e; }
.dot-red    { background: #ef4444; }
.dot-orange { background: #f97316; }

.status-text strong { color: #111827; }

/* Customer */
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
}

.field-input {
  padding: 9px 12px;
  border-radius: 9px;
  border: 1.5px solid #e5e7eb;
  font-size: 13px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  background: white;
  transition: border-color 0.2s;
}

.field-input:focus { border-color: #cf4638; }

/* ── Footer ───────────────────────────────────────────────────────────────── */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid #f3f4f6;
  background: white;
  flex-shrink: 0;
}

.footer-summary {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.footer-items {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 600;
}

.footer-total {
  font-size: 20px;
  font-weight: 900;
  color: #111827;
}

.footer-actions {
  display: flex;
  gap: 10px;
}

.btn-cancel {
  padding: 10px 20px;
  border-radius: 10px;
  border: 1.5px solid #e5e7eb;
  background: white;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-cancel:hover { background: #f9fafb; }

.btn-save {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 22px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #cf4638, #f16657);
  color: white;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(207,70,56,0.35);
  transition: opacity 0.2s, transform 0.15s;
}

.btn-save:hover:not(:disabled) { transform: translateY(-1px); }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.btn-spinner {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: white;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Fade transition for remaining block */
.fade-enter-active { animation: fade-drop 0.25s ease; }
.fade-leave-active { animation: fade-drop 0.2s ease reverse; }

@keyframes fade-drop {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 700px) {
  .modal-body {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .col-left  { border-right: none; border-bottom: 1px solid #f3f4f6; max-height: 55vh; }
  .col-right { overflow-y: visible; }

  .field-row { grid-template-columns: 1fr; }
  .payment-methods { grid-template-columns: repeat(4, 1fr); }
}
</style>