// src/stores/dashboardStore.js
//
// UPDATED vs original:
//  1. salesService now imported from corrected salesService.js which mirrors
//     the full Flutter SalesService lifecycle (inventory + cashflow + ledger)
//  2. productsService imported from corrected productsService.js
//  3. cashflowService imported and exposed for the Cashflow dashboard
//  4. inventorySyncService imported and initialized
//  5. init() now calls salesService.init(storeId) to start real-time listener
//     and periodic sync (mirrors Flutter SalesService.init())
//  6. addSale / deleteSale / restoreSale now delegate entirely to salesService
//     (no direct IndexedDB writes in the store — consistency guaranteed)
//  7. Added cashflow actions: getCashflowSummary, getCashflowEntries
//  8. listens to the 'sales:updated' custom event fired by the real-time
//     listener so the UI reactively refreshes without polling

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  calcStatsLocal,
  syncStoreData,
  fetchUserStores,
  emptyResult,
} from '../features/dashboard/services/calculationService.js'
import { db, STORES } from '../features/dashboard/services/offlineDB.js'
import { salesService } from '../features/dashboard/services/salesService.js'
import { productsService } from '../features/dashboard/services/productsService.js'
import { expensesService } from '../features/dashboard/services/expensesService.js'
import { cashflowService } from '../features/dashboard/services/cashflowservice.js'
import { inventorySyncService } from '../features/dashboard/services/inventorysyncservice.js'

export const useDashboardStore = defineStore('dashboard', () => {
  // ─── State ──────────────────────────────────────────────────────────────────
  const stats = ref({ ...emptyResult() })
  const stores = ref([])
  const selectedStoreId = ref(localStorage.getItem('storeId') ?? '')
  const selectedStore = ref(null)
  const filter = ref('today')
  const customRange = ref(null)
  const isLoading = ref(false)
  const isSyncing = ref(false)
  const isOnline = ref(navigator.onLine)
  const lastSyncTime = ref(null)
  const userRole = ref(localStorage.getItem('user_role') ?? 'owner')
  const sidebarOpen = ref(true)
  const activePage = ref('dashboard')

  // Data lists
  const salesList = ref([])
  const productsList = ref([])
  const expensesList = ref([])
  const categoriesList = ref([])
  const cashflowList = ref([])

  // Cashflow summary
  const cashflowSummary = ref({
    totalInflow: 0,
    totalOutflow: 0,
    netCashflow: 0,
    cashBalance: 0,
  })

  // ─── Computed ────────────────────────────────────────────────────────────────
  const selectedStoreName = computed(() => {
    const s = stores.value.find(s => s.store_id === selectedStoreId.value)
    return s?.business_name ?? 'Select Store'
  })

  const lowStockCount = computed(() =>
    productsList.value.filter(
      p => p.type === 'Product' && (p.quantity ?? 0) <= 5 && !p.isDeleted
    ).length
  )

  const timeSinceSync = computed(() => {
    if (!lastSyncTime.value) return 'Never synced'
    const diff = Date.now() - lastSyncTime.value.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins / 60)}h ago`
  })

  // ─── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Phase 1: Load cached data instantly (no network)
   * Phase 2: Background network sync
   * Phase 3: Initialize real-time listener
   *
   * Mirrors: Flutter SalesService.init() + MobileSalesPage._initService()
   */
  async function initialize(userId) {
    isLoading.value = true

    try {
      // Phase 1: Load from IndexedDB immediately — show UI right away
      await loadFromCache()
      isLoading.value = false

      // Phase 2: Init services (inventory sync + real-time listener)
      if (selectedStoreId.value) {
        await inventorySyncService.init()
        await salesService.init(selectedStoreId.value, { startPeriodicSync: true })
      }

      // Phase 3: Background sync from Firestore
      setTimeout(() => backgroundSync(userId), 500)

      // ── Event listeners ──────────────────────────────────────────────────

      // Real-time sale updates from salesService listener
      // Fires whenever Firestore pushes a change (mirrors Flutter eventBus)
      window.addEventListener('sales:updated', async (event) => {
        if (event.detail?.storeId === selectedStoreId.value) {
          await _refreshSalesList()
          await recalcStats()
        }
      })

      // Connectivity
      window.addEventListener('online', async () => {
        isOnline.value = true
        await backgroundSync(userId)
      })
      window.addEventListener('offline', () => { isOnline.value = false })

    } catch (err) {
      console.error('[dashboardStore] init error:', err)
      isLoading.value = false
    }
  }

  async function loadFromCache() {
    if (!selectedStoreId.value) return

    const [cachedSales, cachedProducts, cachedExpenses] = await Promise.all([
      db.getAllByIndex(STORES.sales, 'storeId', selectedStoreId.value),
      db.getAllByIndex(STORES.products, 'storeId', selectedStoreId.value),
      db.getAllByIndex(STORES.expenses, 'storeId', selectedStoreId.value),
    ])

    salesList.value = cachedSales
      .filter(s => !s.isDeleted)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    productsList.value = cachedProducts.filter(p => !p.isDeleted)
    expensesList.value = cachedExpenses.filter(e => !e.isDeleted)

    await recalcStats()
    await _refreshCashflow()
  }

  async function recalcStats() {
    if (!selectedStoreId.value) { stats.value = emptyResult(); return }
    stats.value = await calcStatsLocal(selectedStoreId.value, filter.value, customRange.value)
  }

  async function backgroundSync(userId) {
    if (!navigator.onLine || isSyncing.value) return
    isSyncing.value = true
    try {
      if (!stores.value.length) {
        const fetched = await fetchUserStores(userId)
        stores.value = fetched
        if (fetched.length && !selectedStoreId.value) {
          await switchStore(fetched[0].store_id)
        }
      }

      if (!selectedStoreId.value) return

      const { sales, expenses, products } = await syncStoreData(selectedStoreId.value)

      salesList.value = sales.filter(s => !s.isDeleted)
      productsList.value = products.filter(p => !p.isDeleted)
      expensesList.value = expenses.filter(e => !e.isDeleted)

      await recalcStats()
      await _refreshCashflow()
      lastSyncTime.value = new Date()

      // Flush any offline-queued operations
      await salesService.flushPendingOps(selectedStoreId.value)
      await inventorySyncService.flushPendingLedger(selectedStoreId.value)
      await cashflowService.flushPendingCashflow(selectedStoreId.value)
    } catch (err) {
      console.warn('[dashboardStore] backgroundSync error:', err)
    } finally {
      isSyncing.value = false
    }
  }

  async function switchStore(storeId) {
    // Dispose old listener before switching
    salesService.dispose()

    selectedStoreId.value = storeId
    localStorage.setItem('storeId', storeId)
    selectedStore.value = stores.value.find(s => s.store_id === storeId) ?? null

    await loadFromCache()

    // Re-init services for new store
    await salesService.init(storeId, { startPeriodicSync: true })
  }

  function setFilter(newFilter) {
    filter.value = newFilter
    customRange.value = null
    recalcStats()
  }

  function setCustomRange(range) {
    customRange.value = range
    filter.value = 'custom'
    recalcStats()
  }

  // ─── Sales actions ─────────────────────────────────────────────────────────

  /**
   * Delegates entirely to salesService which handles:
   *  - local save, cashflow, inventory, ledger, cloud push
   * Mirrors: Flutter MobileSalesPage → SalesService.addSale()
   */
  async function addSale(userId, payload) {
    if (!selectedStoreId.value) throw new Error('No store selected')

    const sale = await salesService.addSale(selectedStoreId.value, userId, payload)

    // Optimistically update the list (real-time listener will confirm)
    salesList.value.unshift(sale)
    await recalcStats()
    await _refreshCashflow()

    return sale
  }

  /**
   * Soft-deletes a sale (returns stock + reverses cashflow).
   * Mirrors: Flutter SalesService.softDeleteSale()
   */
  async function deleteSale(saleId, userId) {
    await salesService.softDeleteSale(selectedStoreId.value, saleId, userId)
    salesList.value = salesList.value.filter(s => s.id !== saleId)
    await recalcStats()
    await _refreshCashflow()
  }

  /**
   * Restores a deleted sale (deducts stock + re-activates cashflow).
   * Mirrors: Flutter SalesService.restoreSale()
   */
  async function restoreSale(saleId, userId) {
    const sale = await salesService.restoreSale(selectedStoreId.value, saleId, userId)
    if (sale) salesList.value.unshift(sale)
    await recalcStats()
    await _refreshCashflow()
    return sale
  }

  // ─── Product actions ────────────────────────────────────────────────────────

  async function addProduct(userId, payload) {
    if (!selectedStoreId.value) throw new Error('No store selected')
    const product = await productsService.addProduct(selectedStoreId.value, userId, payload)
    productsList.value.unshift(product)
    return product
  }

  async function updateProduct(productId, updates) {
    const product = await productsService.updateProduct(
      selectedStoreId.value, productId, updates
    )
    const idx = productsList.value.findIndex(p => p.id === productId)
    if (idx !== -1) productsList.value[idx] = product
    return product
  }

  async function deleteProduct(productId) {
    await productsService.softDelete(selectedStoreId.value, productId)
    productsList.value = productsList.value.filter(p => p.id !== productId)
  }

  async function addStock(productId, stockData) {
    const product = await productsService.addStock(
      selectedStoreId.value, productId, stockData
    )
    const idx = productsList.value.findIndex(p => p.id === productId)
    if (idx !== -1) productsList.value[idx] = product
    return product
  }

  // ─── Expense actions ────────────────────────────────────────────────────────

  async function addExpense(userId, payload) {
    if (!selectedStoreId.value) throw new Error('No store selected')
    const expense = await expensesService.addExpense(selectedStoreId.value, userId, payload)
    expensesList.value.unshift(expense)

    // Record cashflow outflow for expense
    await cashflowService.recordExpenseOutflow({ ...expense, storeId: selectedStoreId.value })

    await recalcStats()
    await _refreshCashflow()
    return expense
  }

  async function deleteExpense(expenseId) {
    await expensesService.softDelete(selectedStoreId.value, expenseId)
    expensesList.value = expensesList.value.filter(e => e.id !== expenseId)
    await recalcStats()
    await _refreshCashflow()
  }

  async function loadCategories() {
    if (!selectedStoreId.value) return
    categoriesList.value = await expensesService.getCategories(selectedStoreId.value)
  }

  async function addCategory(userId, name) {
    const cat = await expensesService.addCategory(selectedStoreId.value, userId, name)
    categoriesList.value.push(cat)
    return cat
  }

  // ─── Cashflow actions ───────────────────────────────────────────────────────

  /**
   * Returns cashflow summary for the current filter period.
   * Mirrors: Flutter CashflowService summary computation.
   */
  async function getCashflowSummary(dateRange = null) {
    if (!selectedStoreId.value) return cashflowSummary.value
    const summary = await cashflowService.getCashflowSummary(
      selectedStoreId.value,
      dateRange ?? _getDateRangeForFilter()
    )
    cashflowSummary.value = summary
    return summary
  }

  async function getCashflowEntries(dateRange = null) {
    if (!selectedStoreId.value) return []
    const entries = await cashflowService.getCashflow(
      selectedStoreId.value,
      dateRange ?? _getDateRangeForFilter()
    )
    cashflowList.value = entries
    return entries
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  async function _refreshSalesList() {
    const sales = await salesService.getAllSales(selectedStoreId.value, {
      filter: filter.value,
      startDate: customRange.value?.start,
      endDate: customRange.value?.end,
    })
    salesList.value = sales
  }

  async function _refreshCashflow() {
    if (!selectedStoreId.value) return
    await getCashflowSummary()
    await getCashflowEntries()
  }

  function _getDateRangeForFilter() {
    const now = new Date()
    if (filter.value === 'today') {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        end: new Date(),
      }
    }
    if (filter.value === 'week') {
      const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
      return {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek),
        end: new Date(),
      }
    }
    if (filter.value === 'month') {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(),
      }
    }
    if (filter.value === 'custom' && customRange.value) {
      return customRange.value
    }
    return null
  }

  return {
    // State
    stats, stores, selectedStoreId, selectedStore, filter, customRange,
    isLoading, isSyncing, isOnline, lastSyncTime, userRole,
    sidebarOpen, activePage,
    salesList, productsList, expensesList, categoriesList,
    cashflowList, cashflowSummary,
    // Computed
    selectedStoreName, lowStockCount, timeSinceSync,
    // Actions
    initialize, loadFromCache, backgroundSync, switchStore,
    setFilter, setCustomRange, recalcStats,
    addSale, deleteSale, restoreSale,
    addProduct, updateProduct, deleteProduct, addStock,
    addExpense, deleteExpense, loadCategories, addCategory,
    getCashflowSummary, getCashflowEntries,
  }
})