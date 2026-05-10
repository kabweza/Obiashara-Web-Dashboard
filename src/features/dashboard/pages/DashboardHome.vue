<template>
  <div class="home-page">
    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-chips">
        <button
          v-for="f in filters"
          :key="f.key"
          class="chip"
          :class="{ active: dashStore.filter === f.key && !dashStore.customRange }"
          @click="dashStore.setFilter(f.key)"
        >{{ f.label }}</button>

        <!-- Date range picker trigger -->
        <button class="chip chip-date" :class="{ active: dashStore.filter === 'custom' }" @click="showDatePicker = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
          </svg>
          {{ dashStore.customRange ? formatDateRange(dashStore.customRange) : t('custom_range') }}
          <button v-if="dashStore.customRange" class="clear-range" @click.stop="dashStore.setFilter('today')">×</button>
        </button>
      </div>

      <div class="filter-date">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-gray-400">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5"/>
        </svg>
        {{ todayLabel }}
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <StatCard
        :label="t('total_orders')"
        :value="stats.totalOrders"
        icon="orders"
        color="#f59e0b"
        :loading="dashStore.isLoading"
      />
      <StatCard
        :label="t('income')"
        :value="formatCurrency(stats.totalIncome)"
        prefix="TZS"
        icon="income"
        color="#10b981"
        :loading="dashStore.isLoading"
      />
      <StatCard
        :label="t('expenses_tsh')"
        :value="formatCurrency(stats.totalExpenses)"
        prefix="TZS"
        icon="expenses"
        color="#ef4444"
        :loading="dashStore.isLoading"
      />
      <StatCard
        :label="t('profit')"
        :value="formatCurrency(stats.totalProfit)"
        prefix="TZS"
        icon="profit"
        :color="stats.totalProfit >= 0 ? '#6366f1' : '#ef4444'"
        :loading="dashStore.isLoading"
      />
    </div>

    <!-- Charts + Quick Actions Row -->
    <div class="content-row">
      <!-- Sales chart -->
      <div class="chart-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">{{ t('sales_overview') }}</h3>
            <p class="card-sub">{{ t('last_7_days') }}</p>
          </div>
          <div class="chart-legend">
            <span class="legend-dot income"></span><span>{{ t('income') }}</span>
            <span class="legend-dot profit" style="margin-left:12px"></span><span>{{ t('profit') }}</span>
          </div>
        </div>
        <div class="chart-area">
          <canvas ref="chartCanvas" height="200"></canvas>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="quick-actions-card">
        <h3 class="card-title mb-4">{{ t('quick_actions') }}</h3>
        <div class="action-list">
          <ActionItem
            :label="t('record_sales')"
            icon="add-sale"
            color="#cf4638"
            @click="$emit('navigate', 'sales'); showAddSale = true"
          />
          <ActionItem :label="t('products')" icon="products" color="#6366f1" @click="dashStore.activePage = 'products'" />
          <ActionItem :label="t('quick_sale')" icon="flash" color="#8b5cf6" @click="showQuickSale = true" />
          <ActionItem :label="t('add_expense')" icon="expense" color="#ef4444" @click="dashStore.activePage = 'expenses'; showAddExpense = true" />
          <ActionItem :label="t('analytics')" icon="analytics" color="#10b981" @click="dashStore.activePage = 'analytics'" />
        </div>
      </div>
    </div>

    <!-- Recent Sales Table -->
    <div class="table-card">
      <div class="card-header">
        <h3 class="card-title">{{ t('recent_sales') }}</h3>
        <button class="view-all-btn" @click="dashStore.activePage = 'sales'">{{ t('view_all') }} →</button>
      </div>

      <div v-if="recentSales.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-12 h-12 text-gray-300">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25"/>
        </svg>
        <p>{{ t('no_sales_yet') }}</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('order_id') }}</th>
              <th>{{ t('customer') }}</th>
              <th>{{ t('date') }}</th>
              <th>{{ t('amount') }}</th>
              <th>{{ t('payment') }}</th>
              <th>{{ t('status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sale in recentSales" :key="sale.id">
              <td><span class="mono">{{ sale.orderId?.slice(-12) ?? '-' }}</span></td>
              <td>{{ sale.customerName }}</td>
              <td>{{ formatDate(sale.saleDate) }}</td>
              <td class="font-semibold">TZS {{ formatCurrency(sale.totalAmount) }}</td>
              <td>{{ sale.paymentMethod }}</td>
              <td><span class="status-badge" :class="statusClass(sale.status)">{{ sale.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Low Stock Warning -->
    <div v-if="lowStockProducts.length > 0" class="alert-card">
      <div class="alert-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5 text-orange-500">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
        </svg>
        <span class="alert-title">{{ t('low_stock_alert') }} ({{ lowStockProducts.length }})</span>
        <button class="view-all-btn ml-auto" @click="dashStore.activePage = 'products'">{{ t('manage') }} →</button>
      </div>
      <div class="low-stock-list">
        <div v-for="p in lowStockProducts.slice(0,5)" :key="p.id" class="low-stock-item">
          <span class="product-name">{{ p.name }}</span>
          <span class="stock-qty" :class="p.quantity === 0 ? 'out' : 'low'">
            {{ p.quantity === 0 ? 'Out of stock' : `${p.quantity} left` }}
          </span>
        </div>
      </div>
    </div>

    <!-- Date Picker Modal -->
    <Teleport to="body">
      <div v-if="showDatePicker" class="modal-overlay" @click.self="showDatePicker = false">
        <div class="date-picker-modal">
          <h3 class="modal-title">{{ t('select_date_range') }}</h3>
          <div class="date-inputs">
            <div class="date-field">
              <label>{{ t('from') }}</label>
              <input type="date" v-model="pickerStart" class="date-input" />
            </div>
            <div class="date-field">
              <label>{{ t('to') }}</label>
              <input type="date" v-model="pickerEnd" class="date-input" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showDatePicker = false">{{ t('cancel') }}</button>
            <button class="btn-primary" @click="applyDateRange">{{ t('apply') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDashboardStore } from '../../../stores/dashboardStore.js'
import { formatCurrency } from '../services/calculationService.js'
import StatCard from '../components/StatCard.vue'
import ActionItem from '../components/ActionItem.vue'

const { t } = useI18n()
const dashStore = useDashboardStore()
const emit = defineEmits(['navigate'])

const showDatePicker = ref(false)
const showAddSale = ref(false)
const showQuickSale = ref(false)
const showAddExpense = ref(false)
const pickerStart = ref('')
const pickerEnd = ref('')
const chartCanvas = ref(null)
let chartInstance = null

const filters = [
  { key: 'today', label: computed(() => t('today')).value || 'Today' },
  { key: 'week', label: computed(() => t('week')).value || 'Week' },
  { key: 'month', label: computed(() => t('month')).value || 'Month' },
  { key: 'year', label: computed(() => t('year')).value || 'Year' },
]

const stats = computed(() => dashStore.stats)
const recentSales = computed(() => dashStore.salesList.slice(0, 10))
const lowStockProducts = computed(() => dashStore.productsList.filter(p => p.type === 'Product' && (p.quantity ?? 0) <= 5))
const todayLabel = computed(() => new Date().toLocaleDateString('en-TZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateRange(range) {
  const f = (d) => new Date(d).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short' })
  return `${f(range.start)} → ${f(range.end)}`
}

function statusClass(status) {
  if (!status) return 'status-default'
  const s = status.toLowerCase()
  if (s === 'completed' || s === 'paid') return 'status-success'
  if (s === 'pending') return 'status-warning'
  if (s === 'cancelled') return 'status-danger'
  return 'status-default'
}

function applyDateRange() {
  if (!pickerStart.value || !pickerEnd.value) return
  dashStore.setCustomRange({ start: pickerStart.value, end: pickerEnd.value })
  showDatePicker.value = false
}

// ── Chart ──────────────────────────────────────────────────────────────────
async function buildChart() {
  if (!chartCanvas.value) return
  try {
    const { Chart, registerables } = await import('chart.js')
    Chart.register(...registerables)

    if (chartInstance) { chartInstance.destroy(); chartInstance = null }

    // Build last 7 days labels + data
    const days = []
    const incomeData = []
    const profitData = []
    const salesByDay = {}

    dashStore.salesList.forEach(s => {
      const d = s.saleDate?.split('T')[0]
      if (!d) return
      if (!salesByDay[d]) salesByDay[d] = { income: 0, cost: 0 }
      salesByDay[d].income += s.totalAmount || 0
      ;(s.products || []).forEach(p => {
        const pp = p.purchasePrice ?? p.purchase_price ?? (p.price * 0.7)
        salesByDay[d].cost += pp * (p.quantity || 0)
      })
    })

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      days.push(d.toLocaleDateString('en', { weekday: 'short' }))
      incomeData.push(salesByDay[key]?.income ?? 0)
      profitData.push(salesByDay[key] ? salesByDay[key].income - salesByDay[key].cost : 0)
    }

    chartInstance = new Chart(chartCanvas.value, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: 'rgba(207,70,56,0.15)',
            borderColor: '#cf4638',
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Profit',
            data: profitData,
            backgroundColor: 'rgba(99,102,241,0.15)',
            borderColor: '#6366f1',
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 12 } } },
          y: {
            grid: { color: '#f3f4f6' },
            ticks: {
              font: { size: 11 },
              callback: v => 'TZS ' + new Intl.NumberFormat('en', { notation: 'compact' }).format(v),
            },
          },
        },
      },
    })
  } catch (err) {
    console.warn('[HomeChart] Chart.js not available:', err.message)
  }
}

onMounted(() => { nextTick(buildChart) })
watch(() => [dashStore.salesList, dashStore.filter], () => nextTick(buildChart), { deep: true })
</script>

<style scoped>
.home-page { display: flex; flex-direction: column; gap: 24px; }

/* Filter bar */
.filter-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.filter-chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.chip {
  padding: 6px 16px; border-radius: 20px; border: 1.5px solid #e5e7eb;
  background: white; font-size: 13px; font-weight: 600; color: #6b7280;
  cursor: pointer; transition: all 0.2s; white-space: nowrap;
}
.chip:hover { border-color: #cf4638; color: #cf4638; }
.chip.active { background: linear-gradient(135deg, #cf4638, #f16657); color: white; border-color: transparent; box-shadow: 0 4px 12px rgba(207,70,56,0.3); }
.chip-date { display: flex; align-items: center; gap: 6px; }
.clear-range { background: rgba(255,255,255,0.3); border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 12px; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center; padding: 0; }
.filter-date { font-size: 13px; color: #6b7280; display: flex; align-items: center; gap: 6px; }

/* Stats grid */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
@media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .stats-grid { grid-template-columns: 1fr; } }

/* Content row */
.content-row { display: grid; grid-template-columns: 1fr 340px; gap: 20px; }
@media (max-width: 1100px) { .content-row { grid-template-columns: 1fr; } }

/* Chart card */
.chart-card, .quick-actions-card, .table-card, .alert-card {
  background: white; border-radius: 16px; padding: 24px;
  border: 1px solid #f3f4f6;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.chart-area { height: 220px; margin-top: 16px; position: relative; }

/* Card header */
.card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.card-title { font-size: 16px; font-weight: 700; color: #111827; }
.card-sub { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.chart-legend { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; }
.legend-dot.income { background: #cf4638; }
.legend-dot.profit { background: #6366f1; }

/* Quick actions */
.action-list { display: flex; flex-direction: column; gap: 8px; }
.view-all-btn { font-size: 13px; font-weight: 600; color: #cf4638; background: none; border: none; cursor: pointer; white-space: nowrap; }

/* Table */
.table-wrap { overflow-x: auto; margin-top: 16px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th { text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f3f4f6; }
.data-table td { padding: 12px 12px; border-bottom: 1px solid #f9fafb; color: #374151; vertical-align: middle; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: #fafafa; }
.mono { font-family: 'Courier New', monospace; font-size: 12px; color: #6b7280; }

.status-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.status-success { background: #f0fdf4; color: #16a34a; }
.status-warning { background: #fffbeb; color: #d97706; }
.status-danger { background: #fef2f2; color: #dc2626; }
.status-default { background: #f9fafb; color: #6b7280; }

/* Low stock alert */
.alert-card { border: 1px solid #fed7aa; background: #fffbeb; }
.alert-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.alert-title { font-size: 14px; font-weight: 700; color: #92400e; }
.low-stock-list { display: flex; flex-direction: column; gap: 8px; }
.low-stock-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: white; border-radius: 8px; border: 1px solid #fde68a; }
.product-name { font-size: 13px; font-weight: 600; color: #374151; }
.stock-qty { font-size: 12px; font-weight: 700; }
.stock-qty.low { color: #d97706; }
.stock-qty.out { color: #dc2626; }

/* Empty state */
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; color: #9ca3af; }
.empty-state p { font-size: 14px; font-weight: 500; }
.mb-4 { margin-bottom: 16px; }
.ml-auto { margin-left: auto; }

/* Date picker modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.date-picker-modal { background: white; border-radius: 20px; padding: 32px; width: 100%; max-width: 420px; }
.modal-title { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 20px; }
.date-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
.date-field { display: flex; flex-direction: column; gap: 6px; }
.date-field label { font-size: 12px; font-weight: 700; color: #cf4638; }
.date-input { padding: 10px 12px; border-radius: 10px; border: 1.5px solid #e5e7eb; font-size: 14px; outline: none; }
.date-input:focus { border-color: #cf4638; }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
.btn-cancel { padding: 10px 20px; border-radius: 10px; border: 1.5px solid #e5e7eb; background: white; color: #374151; font-weight: 600; cursor: pointer; }
.btn-primary { padding: 10px 24px; border-radius: 10px; border: none; background: linear-gradient(135deg, #cf4638, #f16657); color: white; font-weight: 700; cursor: pointer; }
</style>
