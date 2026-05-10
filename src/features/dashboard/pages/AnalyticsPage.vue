<template>
  <div class="analytics-page">
    <div class="page-header">
      <div>
        <h2 class="page-h2">{{ t('analytics') }}</h2>
        <p class="page-sub">{{ t('business_overview') }}</p>
      </div>
      <select v-model="period" class="period-select" @change="load">
        <option value="week">{{ t('week') }}</option>
        <option value="month">{{ t('month') }}</option>
        <option value="year">{{ t('year') }}</option>
      </select>
    </div>

    <!-- KPI Row -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">{{ t('total_revenue') }}</span>
        <span class="kpi-value">TZS {{ formatCurrency(stats.totalIncome) }}</span>
        <span class="kpi-sub">{{ stats.totalOrders }} {{ t('orders') }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">{{ t('total_expenses') }}</span>
        <span class="kpi-value text-red">TZS {{ formatCurrency(stats.totalExpenses) }}</span>
        <span class="kpi-sub">{{ t('operational_costs') }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">{{ t('net_profit') }}</span>
        <span class="kpi-value" :class="stats.totalProfit >= 0 ? 'text-green' : 'text-red'">
          TZS {{ formatCurrency(stats.totalProfit) }}
        </span>
        <span class="kpi-sub">{{ profitMargin }}% {{ t('margin') }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">{{ t('avg_sale') }}</span>
        <span class="kpi-value">TZS {{ formatCurrency(avgSale) }}</span>
        <span class="kpi-sub">{{ t('per_order') }}</span>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
      <div class="chart-card wide">
        <h4 class="chart-title">{{ t('revenue_vs_expenses') }}</h4>
        <canvas ref="barChart" height="260"></canvas>
      </div>
      <div class="chart-card">
        <h4 class="chart-title">{{ t('payment_methods') }}</h4>
        <canvas ref="pieChart" height="260"></canvas>
      </div>
    </div>

    <!-- Top Products -->
    <div class="section-card">
      <h4 class="section-title">{{ t('top_products') }}</h4>
      <div v-if="topProducts.length === 0" class="empty-sm">{{ t('no_data') }}</div>
      <div v-else class="top-list">
        <div v-for="(p, i) in topProducts" :key="p.name" class="top-item">
          <div class="rank" :style="{ background: rankColor(i) }">{{ i + 1 }}</div>
          <div class="top-info">
            <span class="top-name">{{ p.name }}</span>
            <span class="top-sub">{{ p.qty }} {{ t('units_sold') }}</span>
          </div>
          <span class="top-revenue">TZS {{ formatCurrency(p.revenue) }}</span>
          <div class="top-bar-wrap">
            <div class="top-bar" :style="{ width: (p.revenue / topProducts[0].revenue * 100) + '%' }" />
          </div>
        </div>
      </div>
    </div>

    <!-- Expense breakdown -->
    <div class="section-card">
      <h4 class="section-title">{{ t('expense_breakdown') }}</h4>
      <div v-if="expCats.length === 0" class="empty-sm">{{ t('no_data') }}</div>
      <div v-else class="cat-breakdown">
        <div v-for="(c, i) in expCats" :key="c.name" class="cat-row">
          <div class="cat-dot" :style="{ background: CAT_COLORS[i % CAT_COLORS.length] }" />
          <span class="cat-name">{{ c.name }}</span>
          <div class="cat-bar-wrap">
            <div class="cat-bar" :style="{ width: c.pct + '%', background: CAT_COLORS[i % CAT_COLORS.length] }" />
          </div>
          <span class="cat-pct">{{ c.pct.toFixed(1) }}%</span>
          <span class="cat-total">TZS {{ formatCurrency(c.total) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDashboardStore } from '../../../stores/dashboardStore.js'
import { formatCurrency, getDateRange } from '../services/calculationService.js'
import { db, STORES } from '../services/offlineDB.js'

const { t } = useI18n()
const dashStore = useDashboardStore()
const period = ref('month')
const barChart = ref(null)
const pieChart = ref(null)
let barInst = null, pieInst = null

const CAT_COLORS = ['#cf4638','#6366f1','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#14b8a6']

const stats = computed(() => dashStore.stats)
const avgSale = computed(() => stats.value.totalOrders ? stats.value.totalIncome / stats.value.totalOrders : 0)
const profitMargin = computed(() => stats.value.totalIncome ? ((stats.value.totalProfit / stats.value.totalIncome) * 100).toFixed(1) : 0)

// Top products from sales
const topProducts = ref([])
const expCats = ref([])

async function load() {
  dashStore.setFilter(period.value)
  await computeAnalytics()
  await nextTick()
  buildCharts()
}

async function computeAnalytics() {
  const { start, end } = getDateRange(period.value)
  const storeId = dashStore.selectedStoreId
  if (!storeId) return

  const [sales, expenses] = await Promise.all([
    db.getAllByIndex(STORES.sales, 'storeId', storeId),
    db.getAllByIndex(STORES.expenses, 'storeId', storeId),
  ])

  const filtSales = sales.filter(s => !s.isDeleted && new Date(s.saleDate) >= start && new Date(s.saleDate) <= end)
  const filtExp = expenses.filter(e => !e.isDeleted && new Date(e.expenseDate) >= start && new Date(e.expenseDate) <= end)

  // Top products
  const prodMap = {}
  filtSales.forEach(s => {
    ;(s.products || []).forEach(p => {
      if (!prodMap[p.name]) prodMap[p.name] = { name: p.name, qty: 0, revenue: 0 }
      prodMap[p.name].qty += p.quantity || 0
      prodMap[p.name].revenue += (p.price || 0) * (p.quantity || 0)
    })
  })
  topProducts.value = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8)

  // Expense categories
  const catMap = {}
  const totalExp = filtExp.reduce((s, e) => s + e.amount, 0)
  filtExp.forEach(e => {
    const cat = e.category || 'General'
    catMap[cat] = (catMap[cat] || 0) + e.amount
  })
  expCats.value = Object.entries(catMap)
    .map(([name, total]) => ({ name, total, pct: totalExp ? (total / totalExp * 100) : 0 }))
    .sort((a, b) => b.total - a.total)
}

async function buildCharts() {
  if (!barChart.value && !pieChart.value) return
  try {
    const { Chart, registerables } = await import('chart.js')
    Chart.register(...registerables)

    // Bar chart — daily income vs expenses
    const { start } = getDateRange(period.value)
    const labels = []
    const incomeData = []
    const expData = []
    const days = period.value === 'week' ? 7 : period.value === 'month' ? 30 : 12

    const storeId = dashStore.selectedStoreId
    const [sales, expenses] = await Promise.all([
      db.getAllByIndex(STORES.sales, 'storeId', storeId),
      db.getAllByIndex(STORES.expenses, 'storeId', storeId),
    ])

    if (period.value !== 'year') {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        labels.push(d.toLocaleDateString('en', { day: '2-digit', month: 'short' }))
        incomeData.push(sales.filter(s => !s.isDeleted && s.saleDate === key).reduce((s, x) => s + x.totalAmount, 0))
        expData.push(expenses.filter(e => !e.isDeleted && e.expenseDate === key).reduce((s, x) => s + x.amount, 0))
      }
    } else {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      const year = new Date().getFullYear()
      months.forEach((m, idx) => {
        labels.push(m)
        incomeData.push(sales.filter(s => !s.isDeleted && new Date(s.saleDate).getFullYear() === year && new Date(s.saleDate).getMonth() === idx).reduce((s, x) => s + x.totalAmount, 0))
        expData.push(expenses.filter(e => !e.isDeleted && new Date(e.expenseDate).getFullYear() === year && new Date(e.expenseDate).getMonth() === idx).reduce((s, x) => s + x.amount, 0))
      })
    }

    if (barInst) barInst.destroy()
    if (barChart.value) {
      barInst = new Chart(barChart.value, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Income', data: incomeData, backgroundColor: 'rgba(207,70,56,0.8)', borderRadius: 4 },
            { label: 'Expenses', data: expData, backgroundColor: 'rgba(99,102,241,0.8)', borderRadius: 4 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: '#f3f4f6' }, ticks: { callback: v => 'TZS ' + new Intl.NumberFormat('en', { notation: 'compact' }).format(v) } },
          },
        },
      })
    }

    // Pie chart — payment methods
    const payMap = {}
    sales.filter(s => !s.isDeleted).forEach(s => {
      const m = s.paymentMethod || 'Cash'
      payMap[m] = (payMap[m] || 0) + s.totalAmount
    })
    if (pieInst) pieInst.destroy()
    if (pieChart.value && Object.keys(payMap).length) {
      pieInst = new Chart(pieChart.value, {
        type: 'doughnut',
        data: {
          labels: Object.keys(payMap),
          datasets: [{ data: Object.values(payMap), backgroundColor: CAT_COLORS, borderWidth: 2, borderColor: '#fff' }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: { callbacks: { label: ctx => `TZS ${formatCurrency(ctx.raw)}` } },
          },
          cutout: '65%',
        },
      })
    }
  } catch (err) {
    console.warn('[Analytics] Chart build error:', err.message)
  }
}

function rankColor(i) {
  return ['#f59e0b','#9ca3af','#cd7c2f'][i] ?? '#e5e7eb'
}

onMounted(load)
watch(() => dashStore.selectedStoreId, load)
</script>

<style scoped>
.analytics-page { display: flex; flex-direction: column; gap: 24px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-h2 { font-size: 22px; font-weight: 800; color: #111827; }
.page-sub { font-size: 13px; color: #9ca3af; margin-top: 4px; }
.period-select { padding: 8px 14px; border-radius: 10px; border: 1.5px solid #e5e7eb; font-size: 13px; font-weight: 600; outline: none; }

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
@media (max-width: 1024px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .kpi-grid { grid-template-columns: 1fr; } }
.kpi-card { background: white; border-radius: 16px; padding: 20px 24px; border: 1px solid #f3f4f6; display: flex; flex-direction: column; gap: 4px; }
.kpi-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
.kpi-value { font-size: 22px; font-weight: 800; color: #111827; }
.kpi-sub { font-size: 12px; color: #9ca3af; }
.text-green { color: #16a34a; }
.text-red { color: #dc2626; }

.charts-row { display: grid; grid-template-columns: 1fr 380px; gap: 20px; }
@media (max-width: 1100px) { .charts-row { grid-template-columns: 1fr; } }
.chart-card { background: white; border-radius: 16px; padding: 20px 24px; border: 1px solid #f3f4f6; }
.chart-title { font-size: 14px; font-weight: 700; color: #374151; margin-bottom: 16px; }

.section-card { background: white; border-radius: 16px; padding: 20px 24px; border: 1px solid #f3f4f6; }
.section-title { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 16px; }
.empty-sm { font-size: 13px; color: #9ca3af; text-align: center; padding: 20px; }

.top-list { display: flex; flex-direction: column; gap: 10px; }
.top-item { display: flex; align-items: center; gap: 12px; }
.rank { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: white; flex-shrink: 0; }
.top-info { flex: 1; min-width: 0; }
.top-name { display: block; font-size: 13px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.top-sub { font-size: 11px; color: #9ca3af; }
.top-revenue { font-size: 13px; font-weight: 700; color: #cf4638; white-space: nowrap; min-width: 120px; text-align: right; }
.top-bar-wrap { width: 80px; height: 6px; background: #f3f4f6; border-radius: 3px; overflow: hidden; flex-shrink: 0; }
.top-bar { height: 100%; background: linear-gradient(90deg, #cf4638, #f16657); border-radius: 3px; }

.cat-breakdown { display: flex; flex-direction: column; gap: 12px; }
.cat-row { display: flex; align-items: center; gap: 10px; }
.cat-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.cat-name { font-size: 13px; font-weight: 600; color: #374151; min-width: 100px; }
.cat-bar-wrap { flex: 1; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
.cat-bar { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
.cat-pct { font-size: 12px; font-weight: 700; color: #6b7280; min-width: 44px; text-align: right; }
.cat-total { font-size: 12px; font-weight: 600; color: #374151; min-width: 100px; text-align: right; }
</style>
