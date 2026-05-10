<template>
    <div class="expenses-page">
        <div class="page-header">
            <div>
                <h2 class="page-h2">{{ t('expenses_label') }}</h2>
                <p class="page-sub">{{ displayed.length }} {{ t('records') }} · TZS {{ formatCurrency(totalExpenses) }}
                </p>
            </div>
            <div class="header-actions">
                <select v-model="filterPeriod" class="period-select" @change="load">
                    <option value="today">{{ t('today') }}</option>
                    <option value="week">{{ t('week') }}</option>
                    <option value="month">{{ t('month') }}</option>
                    <option value="year">{{ t('year') }}</option>
                </select>
                <button class="btn-add" @click="showAdd = true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    {{ t('add_expense') }}
                </button>
            </div>
        </div>

        <!-- Category breakdown -->
        <div class="category-cards" v-if="categoryTotals.length">
            <div v-for="cat in categoryTotals" :key="cat.name" class="cat-card">
                <span class="cat-name">{{ cat.name || 'General' }}</span>
                <span class="cat-amount">TZS {{ formatCurrency(cat.total) }}</span>
                <div class="cat-bar">
                    <div class="cat-fill" :style="{ width: cat.pct + '%', background: cat.color }" />
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
            <button class="tab" :class="{ active: tab === 'active' }" @click="tab = 'active'; load()">{{ t('active')
                }}</button>
            <button class="tab" :class="{ active: tab === 'deleted' }" @click="tab = 'deleted'; loadDeleted()">{{
                t('deleted') }}</button>
        </div>

        <!-- Table -->
        <div class="table-card">
            <div v-if="displayed.length === 0" class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-12 h-12">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
                </svg>
                <p>{{ t('no_expenses_yet') }}</p>
            </div>
            <div v-else class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>{{ t('date') }}</th>
                            <th>{{ t('expense_type') }}</th>
                            <th>{{ t('category') }}</th>
                            <th>{{ t('amount') }}</th>
                            <th>{{ t('details') }}</th>
                            <th>{{ t('actions') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="e in displayed" :key="e.id">
                            <td>{{ formatDate(e.expenseDate) }}</td>
                            <td class="font-semibold">{{ e.expenseType }}</td>
                            <td><span class="cat-badge">{{ e.category || 'General' }}</span></td>
                            <td class="font-bold text-red-600">TZS {{ formatCurrency(e.amount) }}</td>
                            <td class="text-gray">{{ e.extraDetails || '-' }}</td>
                            <td>
                                <div class="action-btns">
                                    <button v-if="tab === 'active'" class="action-btn danger" @click="confirmDelete(e)">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                            class="w-4 h-4">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916" />
                                        </svg>
                                    </button>
                                    <button v-else class="action-btn success" @click="handleRestore(e.id)">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                            class="w-4 h-4">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <Teleport to="body">
            <AddExpenseModal v-if="showAdd" @close="showAdd = false" @saved="onSaved" />
            <ConfirmModal v-if="deleteTarget" :title="t('delete_expense')" :message="t('delete_expense_confirm')"
                @confirm="handleDelete" @cancel="deleteTarget = null" />
        </Teleport>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDashboardStore } from '../../../stores/dashboardStore.js'
import { useAuthStore } from '../../../stores/authStore.js'
import { expensesService } from '../services/expensesService.js'
import { formatCurrency } from '../services/calculationService.js'
import AddExpenseModal from '../components/AddExpenseModal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'

const { t } = useI18n()
const dashStore = useDashboardStore()
const authStore = useAuthStore()

const tab = ref('active')
const filterPeriod = ref('month')
const showAdd = ref(false)
const deleteTarget = ref(null)
const expenseList = ref([])
const deletedList = ref([])

const COLORS = ['#cf4638', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899']

const displayed = computed(() => tab.value === 'active' ? expenseList.value : deletedList.value)
const totalExpenses = computed(() => expenseList.value.reduce((s, e) => s + (e.amount || 0), 0))

const categoryTotals = computed(() => {
    const map = {}
    expenseList.value.forEach(e => {
        const cat = e.category || 'General'
        map[cat] = (map[cat] || 0) + (e.amount || 0)
    })
    const max = Math.max(...Object.values(map), 1)
    return Object.entries(map).map(([name, total], i) => ({
        name, total, pct: (total / max) * 100, color: COLORS[i % COLORS.length]
    })).sort((a, b) => b.total - a.total).slice(0, 6)
})

async function load() {
    expenseList.value = await expensesService.getAll(dashStore.selectedStoreId, { filter: filterPeriod.value })
}

async function loadDeleted() {
    deletedList.value = await expensesService.getAll(dashStore.selectedStoreId, { includeDeleted: true })
}

function confirmDelete(e) { deleteTarget.value = e }

async function handleDelete() {
    if (!deleteTarget.value) return
    await dashStore.deleteExpense(deleteTarget.value.id)
    expenseList.value = expenseList.value.filter(e => e.id !== deleteTarget.value.id)
    deleteTarget.value = null
}

async function handleRestore(id) {
    await expensesService.restore(dashStore.selectedStoreId, id)
    deletedList.value = deletedList.value.filter(e => e.id !== id)
    await load()
}

async function onSaved() { showAdd.value = false; await load() }

function formatDate(d) {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(load)
</script>

<style scoped>
.expenses-page {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
}

.page-h2 {
    font-size: 22px;
    font-weight: 800;
    color: #111827;
}

.page-sub {
    font-size: 13px;
    color: #9ca3af;
    margin-top: 4px;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.period-select {
    padding: 8px 12px;
    border-radius: 10px;
    border: 1.5px solid #e5e7eb;
    font-size: 13px;
    outline: none;
}

.btn-add {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    border-radius: 10px;
    border: none;
    background: linear-gradient(135deg, #cf4638, #f16657);
    color: white;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(207, 70, 56, 0.3);
}

.category-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
}

.cat-card {
    background: white;
    border-radius: 12px;
    padding: 14px 16px;
    border: 1px solid #f3f4f6;
}

.cat-name {
    display: block;
    font-size: 11px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-bottom: 4px;
}

.cat-amount {
    display: block;
    font-size: 15px;
    font-weight: 800;
    color: #111827;
    margin-bottom: 8px;
}

.cat-bar {
    height: 4px;
    background: #f3f4f6;
    border-radius: 2px;
    overflow: hidden;
}

.cat-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
}

.tabs {
    display: flex;
    gap: 4px;
    background: #f9fafb;
    padding: 4px;
    border-radius: 10px;
    width: fit-content;
}

.tab {
    padding: 7px 20px;
    border-radius: 8px;
    border: none;
    background: transparent;
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
    cursor: pointer;
}

.tab.active {
    background: white;
    color: #cf4638;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-card {
    background: white;
    border-radius: 16px;
    border: 1px solid #f3f4f6;
    overflow: hidden;
}

.table-wrap {
    overflow-x: auto;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.data-table th {
    text-align: left;
    padding: 12px 16px;
    font-size: 11px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: #fafafa;
    border-bottom: 1px solid #f3f4f6;
    white-space: nowrap;
}

.data-table td {
    padding: 13px 16px;
    border-bottom: 1px solid #f9fafb;
    vertical-align: middle;
    color: #374151;
}

.data-table tr:last-child td {
    border-bottom: none;
}

.data-table tr:hover td {
    background: #fafafa;
}

.font-semibold {
    font-weight: 600;
    color: #111827;
}

.font-bold {
    font-weight: 700;
}

.text-red-600 {
    color: #dc2626;
}

.text-gray {
    color: #9ca3af;
}

.cat-badge {
    background: #f3f4f6;
    color: #374151;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
}

.action-btns {
    display: flex;
    gap: 6px;
}

.action-btn {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.action-btn.danger {
    background: #fef2f2;
    color: #ef4444;
}

.action-btn.danger:hover {
    background: #ef4444;
    color: white;
}

.action-btn.success {
    background: #f0fdf4;
    color: #16a34a;
}

.action-btn.success:hover {
    background: #16a34a;
    color: white;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 60px 20px;
    color: #d1d5db;
}

.empty-state p {
    font-size: 14px;
    color: #9ca3af;
    font-weight: 500;
}
</style>