// src/stores/dashboardStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { calcStatsLocal, syncStoreData, fetchUserStores, emptyResult } from '../features/dashboard/services/calculationService.js'
import { db, STORES } from '../features/dashboard/services/offlineDB.js'
import { salesService } from '../features/dashboard/services/salesService.js'
import { productsService } from '../features/dashboard/services/productsService.js'
import { expensesService } from '../features/dashboard/services/expensesService.js'

export const useDashboardStore = defineStore('dashboard', () => {
  // ─── State ─────────────────────────────────────────────────────────────────
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

  // ─── Computed ───────────────────────────────────────────────────────────────
  const selectedStoreName = computed(() => {
    const s = stores.value.find(s => s.store_id === selectedStoreId.value)
    return s?.business_name ?? 'Select Store'
  })

  const lowStockCount = computed(() =>
    productsList.value.filter(p => p.type === 'Product' && (p.quantity ?? 0) <= 5 && !p.isDeleted).length
  )

  const timeSinceSync = computed(() => {
    if (!lastSyncTime.value) return 'Never synced'
    const diff = Date.now() - lastSyncTime.value.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins / 60)}h ago`
  })

  // ─── Actions ────────────────────────────────────────────────────────────────

  /**
   * Phase 1: Load cached data instantly (no network)
   * Phase 2: Background network sync
   */
  async function initialize(userId) {
    isLoading.value = true

    try {
      // Phase 1: Load from IndexedDB immediately
      await loadFromCache()

      // Show UI right away
      isLoading.value = false

      // Phase 2: Background sync
      setTimeout(() => backgroundSync(userId), 500)

      // Setup connectivity listener
      window.addEventListener('online', () => {
        isOnline.value = true
        backgroundSync(userId)
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

    salesList.value = cachedSales.filter(s => !s.isDeleted)
    productsList.value = cachedProducts.filter(p => !p.isDeleted)
    expensesList.value = cachedExpenses.filter(e => !e.isDeleted)

    // Recalculate stats from cache
    await recalcStats()
  }

  async function recalcStats() {
    if (!selectedStoreId.value) { stats.value = emptyResult(); return }
    stats.value = await calcStatsLocal(selectedStoreId.value, filter.value, customRange.value)
  }

  async function backgroundSync(userId) {
    if (!navigator.onLine || isSyncing.value) return
    isSyncing.value = true
    try {
      // Fetch stores if needed
      if (!stores.value.length) {
        const fetched = await fetchUserStores(userId)
        stores.value = fetched
        if (fetched.length && !selectedStoreId.value) {
          await switchStore(fetched[0].store_id)
        }
      }

      if (!selectedStoreId.value) return

      // Sync store data from Firestore → IndexedDB
      const { sales, expenses, products } = await syncStoreData(selectedStoreId.value)

      // Update reactive lists
      salesList.value = sales.filter(s => !s.isDeleted)
      productsList.value = products.filter(p => !p.isDeleted)
      expensesList.value = expenses.filter(e => !e.isDeleted)

      await recalcStats()
      lastSyncTime.value = new Date()

      // Flush pending ops
      await salesService.flushPendingOps(selectedStoreId.value)
    } catch (err) {
      console.warn('[dashboardStore] backgroundSync error:', err)
    } finally {
      isSyncing.value = false
    }
  }

  async function switchStore(storeId) {
    selectedStoreId.value = storeId
    localStorage.setItem('storeId', storeId)
    selectedStore.value = stores.value.find(s => s.store_id === storeId) ?? null
    await loadFromCache()
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

  // ─── Sales actions ──────────────────────────────────────────────────────────

  async function addSale(userId, payload) {
    if (!selectedStoreId.value) throw new Error('No store selected')
    const sale = await salesService.addSale(selectedStoreId.value, userId, payload)
    salesList.value.unshift(sale)
    await recalcStats()
    return sale
  }

  async function deleteSale(saleId) {
    await salesService.softDeleteSale(selectedStoreId.value, saleId)
    salesList.value = salesList.value.filter(s => s.id !== saleId)
    await recalcStats()
  }

  async function restoreSale(saleId) {
    const sale = await salesService.restoreSale(selectedStoreId.value, saleId)
    if (sale) salesList.value.unshift(sale)
    await recalcStats()
  }

  // ─── Product actions ────────────────────────────────────────────────────────

  async function addProduct(userId, payload) {
    if (!selectedStoreId.value) throw new Error('No store selected')
    const product = await productsService.addProduct(selectedStoreId.value, userId, payload)
    productsList.value.unshift(product)
    return product
  }

  async function updateProduct(productId, updates) {
    const product = await productsService.updateProduct(selectedStoreId.value, productId, updates)
    const idx = productsList.value.findIndex(p => p.id === productId)
    if (idx !== -1) productsList.value[idx] = product
    return product
  }

  async function deleteProduct(productId) {
    await productsService.softDelete(selectedStoreId.value, productId)
    productsList.value = productsList.value.filter(p => p.id !== productId)
  }

  async function addStock(productId, stockData) {
    const product = await productsService.addStock(selectedStoreId.value, productId, stockData)
    const idx = productsList.value.findIndex(p => p.id === productId)
    if (idx !== -1) productsList.value[idx] = product
    return product
  }

  // ─── Expense actions ────────────────────────────────────────────────────────

  async function addExpense(userId, payload) {
    if (!selectedStoreId.value) throw new Error('No store selected')
    const expense = await expensesService.addExpense(selectedStoreId.value, userId, payload)
    expensesList.value.unshift(expense)
    await recalcStats()
    return expense
  }

  async function deleteExpense(expenseId) {
    await expensesService.softDelete(selectedStoreId.value, expenseId)
    expensesList.value = expensesList.value.filter(e => e.id !== expenseId)
    await recalcStats()
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

  return {
    // State
    stats, stores, selectedStoreId, selectedStore, filter, customRange,
    isLoading, isSyncing, isOnline, lastSyncTime, userRole,
    sidebarOpen, activePage,
    salesList, productsList, expensesList, categoriesList,
    // Computed
    selectedStoreName, lowStockCount, timeSinceSync,
    // Actions
    initialize, loadFromCache, backgroundSync, switchStore,
    setFilter, setCustomRange, recalcStats,
    addSale, deleteSale, restoreSale,
    addProduct, updateProduct, deleteProduct, addStock,
    addExpense, deleteExpense, loadCategories, addCategory,
  }
})
