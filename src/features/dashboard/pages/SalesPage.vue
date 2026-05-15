<template>
  <div class="sales-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h2 class="page-h2">{{ t('sales') }}</h2>
        <p class="page-sub">{{ salesList.length }} {{ t('records') }} · {{ filterLabel }}</p>
      </div>
      <div class="header-actions">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
          </svg>
          <input v-model="search" type="text" :placeholder="t('search_hint')" class="search-input" />
        </div>
        <select v-model="filterPeriod" class="period-select" @change="loadSales">
          <option value="today">{{ t('today') }}</option>
          <option value="week">{{ t('week') }}</option>
          <option value="month">{{ t('month') }}</option>
          <option value="year">{{ t('year') }}</option>
        </select>
        <button class="btn-add" @click="showAdd = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          {{ t('record_sales') }}
        </button>
      </div>
    </div>

    <!-- Summary mini cards -->
    <div class="mini-stats">
      <div class="mini-stat">
        <span class="mini-label">{{ t('total_orders') }}</span>
        <span class="mini-val">{{ salesList.length }}</span>
      </div>
      <div class="mini-stat">
        <span class="mini-label">{{ t('income') }}</span>
        <span class="mini-val text-green-600">TZS {{ formatCurrency(totalIncome) }}</span>
      </div>
      <div class="mini-stat">
        <span class="mini-label">{{ t('avg_order') }}</span>
        <span class="mini-val">TZS {{ formatCurrency(avgOrder) }}</span>
      </div>
      <div class="mini-stat">
        <span class="mini-label">{{ t('profit') }}</span>
        <span class="mini-val" :class="totalProfit >= 0 ? 'text-indigo-600' : 'text-red-500'">TZS {{ formatCurrency(totalProfit) }}</span>
      </div>
    </div>

    <!-- Tabs: Active / Deleted -->
    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'active' }" @click="tab = 'active'">{{ t('active') }}</button>
      <button class="tab" :class="{ active: tab === 'deleted' }" @click="tab = 'deleted'; loadDeleted()">{{ t('deleted') }}</button>
    </div>

    <!-- Table -->
    <div class="table-card">
      <div v-if="loading" class="loading-rows">
        <div v-for="i in 5" :key="i" class="skeleton-row" />
      </div>

      <div v-else-if="displayed.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-12 h-12">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75"/>
        </svg>
        <p>{{ t('no_sales_yet') }}</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('order_id') }}</th>
              <th>{{ t('date') }}</th>
              <th>{{ t('customer') }}</th>
              <th>{{ t('products') }}</th>
              <th>{{ t('amount') }}</th>
              <th>{{ t('payment') }}</th>
              <th>{{ t('status') }}</th>
              <th>{{ t('actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sale in displayed" :key="sale.id">
              <td><span class="mono">{{ sale.orderId?.slice(-12) ?? '-' }}</span></td>
              <td>{{ formatDate(sale.saleDate) }}</td>
              <td>
                <div class="customer-cell">
                  <div class="customer-avatar">{{ initials(sale.customerName) }}</div>
                  <div>
                    <div class="customer-name">{{ sale.customerName }}</div>
                    <div class="customer-phone">{{ sale.customerPhone }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="products-preview">
                  <span v-for="(p, i) in (sale.products || []).slice(0, 2)" :key="i" class="product-tag">{{ p.name }} ×{{ p.quantity }}</span>
                  <span v-if="(sale.products || []).length > 2" class="product-more">+{{ sale.products.length - 2 }}</span>
                </div>
              </td>
              <td>
                <div class="amount-cell">
                  <span class="amount-total">TZS {{ formatCurrency(sale.totalAmount) }}</span>
                  <span v-if="sale.discount > 0" class="amount-discount">-{{ formatCurrency(sale.discount) }}</span>
                </div>
              </td>
              <td>
                <span class="payment-badge">{{ sale.paymentMethod }}</span>
              </td>
              <td><span class="status-badge" :class="statusClass(sale.status)">{{ sale.status }}</span></td>
              <td>
                <div class="action-btns">
                  <button v-if="tab === 'active'" class="action-btn danger" @click="confirmDelete(sale)" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                    </svg>
                  </button>
                  <button v-else class="action-btn success" @click="handleRestore(sale.id)" title="Restore">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Sale Modal -->
    <Teleport to="body">
      <AddSaleModal v-if="showAdd" @close="showAdd = false" @saved="onSaleSaved" />
      <ConfirmModal v-if="deleteTarget" :title="t('delete_sale')" :message="t('delete_sale_confirm')"
        @confirm="handleDelete" @cancel="deleteTarget = null" />
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDashboardStore } from '../../../stores/dashboardStore.js'
import { formatCurrency } from '../services/calculationService.js'
import { salesService } from '../services/salesService.js'
import AddSaleModal from '../components/sales/AddSaleModal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'

const { t } = useI18n()
const dashStore = useDashboardStore()

const tab = ref('active')
const search = ref('')
const filterPeriod = ref('today')
const loading = ref(false)
const showAdd = ref(false)
const deleteTarget = ref(null)
const salesList = ref([])
const deletedList = ref([])

const filterLabel = computed(() => ({
  today: t('today'), week: t('week'), month: t('month'), year: t('year')
})[filterPeriod.value] ?? '')

const displayed = computed(() => {
  const list = tab.value === 'active' ? salesList.value : deletedList.value
  if (!search.value) return list
  const q = search.value.toLowerCase()
  return list.filter(s =>
    s.customerName?.toLowerCase().includes(q) ||
    s.orderId?.toLowerCase().includes(q) ||
    s.paymentMethod?.toLowerCase().includes(q)
  )
})

const totalIncome = computed(() => salesList.value.reduce((s, x) => s + (x.totalAmount || 0), 0))
const totalProfit = computed(() => salesList.value.reduce((s, x) => {
  const cost = (x.products || []).reduce((c, p) => c + ((p.purchasePrice ?? p.purchase_price ?? p.price * 0.7) * p.quantity), 0)
  return s + (x.totalAmount || 0) - cost
}, 0))
const avgOrder = computed(() => salesList.value.length ? totalIncome.value / salesList.value.length : 0)

async function loadSales() {
  loading.value = true
  salesList.value = await salesService.getAllSales(dashStore.selectedStoreId, { filter: filterPeriod.value })
  loading.value = false
}

async function loadDeleted() {
  deletedList.value = await salesService.getDeletedSales(dashStore.selectedStoreId)
}

function confirmDelete(sale) { deleteTarget.value = sale }

async function handleDelete() {
  if (!deleteTarget.value) return
  await dashStore.deleteSale(deleteTarget.value.id)
  salesList.value = salesList.value.filter(s => s.id !== deleteTarget.value.id)
  deleteTarget.value = null
}

async function handleRestore(id) {
  await dashStore.restoreSale(id)
  deletedList.value = deletedList.value.filter(s => s.id !== id)
  await loadSales()
}

async function onSaleSaved() {
  showAdd.value = false
  await loadSales()
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function statusClass(s) {
  if (!s) return 'status-default'
  const low = s.toLowerCase()
  if (low === 'completed' || low === 'paid') return 'status-success'
  if (low === 'pending') return 'status-warning'
  if (low === 'cancelled') return 'status-danger'
  return 'status-default'
}

onMounted(loadSales)
</script>

<style scoped>
.sales-page { display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
.page-h2 { font-size: 22px; font-weight: 800; color: #111827; }
.page-sub { font-size: 13px; color: #9ca3af; margin-top: 4px; }
.header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.search-wrap { position: relative; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
.search-input { padding: 8px 12px 8px 32px; border-radius: 10px; border: 1.5px solid #e5e7eb; font-size: 13px; outline: none; width: 220px; }
.search-input:focus { border-color: #cf4638; }

.period-select { padding: 8px 12px; border-radius: 10px; border: 1.5px solid #e5e7eb; font-size: 13px; outline: none; cursor: pointer; }
.btn-add {
  display: flex; align-items: center; gap: 6px; padding: 9px 18px;
  border-radius: 10px; border: none; background: linear-gradient(135deg, #cf4638, #f16657);
  color: white; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap;
  box-shadow: 0 4px 12px rgba(207,70,56,0.3);
}

.mini-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
@media (max-width: 768px) { .mini-stats { grid-template-columns: repeat(2, 1fr); } }
.mini-stat { background: white; border-radius: 12px; padding: 16px 20px; border: 1px solid #f3f4f6; }
.mini-label { display: block; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.mini-val { font-size: 18px; font-weight: 800; color: #111827; }
.text-green-600 { color: #16a34a; }
.text-indigo-600 { color: #4f46e5; }
.text-red-500 { color: #ef4444; }

.tabs { display: flex; gap: 4px; background: #f9fafb; padding: 4px; border-radius: 10px; width: fit-content; }
.tab { padding: 7px 20px; border-radius: 8px; border: none; background: transparent; font-size: 13px; font-weight: 600; color: #6b7280; cursor: pointer; }
.tab.active { background: white; color: #cf4638; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

.table-card { background: white; border-radius: 16px; border: 1px solid #f3f4f6; overflow: hidden; }
.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; background: #fafafa; border-bottom: 1px solid #f3f4f6; white-space: nowrap; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: #fafafa; }

.mono { font-family: monospace; font-size: 11px; color: #6b7280; background: #f9fafb; padding: 2px 6px; border-radius: 4px; }
.customer-cell { display: flex; align-items: center; gap: 10px; }
.customer-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #cf4638, #f16657); color: white; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.customer-name { font-size: 13px; font-weight: 600; color: #111827; }
.customer-phone { font-size: 11px; color: #9ca3af; }
.products-preview { display: flex; flex-wrap: wrap; gap: 4px; }
.product-tag { background: #f3f4f6; color: #374151; font-size: 11px; padding: 2px 7px; border-radius: 10px; font-weight: 500; }
.product-more { background: #e5e7eb; color: #6b7280; font-size: 11px; padding: 2px 7px; border-radius: 10px; }
.amount-total { font-size: 13px; font-weight: 700; color: #111827; display: block; }
.amount-discount { font-size: 11px; color: #ef4444; }
.payment-badge { background: #f0fdf4; color: #16a34a; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
.status-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.status-success { background: #f0fdf4; color: #16a34a; }
.status-warning { background: #fffbeb; color: #d97706; }
.status-danger { background: #fef2f2; color: #dc2626; }
.status-default { background: #f9fafb; color: #6b7280; }
.action-btns { display: flex; gap: 6px; }
.action-btn { width: 30px; height: 30px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.action-btn.danger { background: #fef2f2; color: #ef4444; }
.action-btn.danger:hover { background: #ef4444; color: white; }
.action-btn.success { background: #f0fdf4; color: #16a34a; }
.action-btn.success:hover { background: #16a34a; color: white; }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 20px; color: #d1d5db; }
.empty-state p { font-size: 14px; color: #9ca3af; font-weight: 500; }
.skeleton-row { height: 56px; background: linear-gradient(90deg, #f9fafb 25%, #f3f4f6 50%, #f9fafb 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; margin: 1px 0; }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.loading-rows { padding: 8px; display: flex; flex-direction: column; gap: 4px; }
</style>
