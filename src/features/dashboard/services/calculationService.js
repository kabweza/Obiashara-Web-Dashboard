// src/features/dashboard/services/calculationService.js
// Mirrors Flutter's CalculationService — offline-first stats from IndexedDB

import { db as localDb, STORES } from './offlineDB.js'
import { collection, query, where, getDocs, orderBy, limit, getDoc, doc } from 'firebase/firestore'
import { db as firestore } from '../../../plugins/firebase.js'

/**
 * Get date range for a filter key (today/week/month/year)
 * Mirrors Flutter _getDateRange()
 */
export function getDateRange(filter, customRange = null) {
  const now = new Date()

  if (filter === 'custom' && customRange) {
    const start = new Date(customRange.start)
    start.setHours(0, 0, 0, 0)
    const end = new Date(customRange.end)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  let start
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  switch (filter) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      break
    case 'week': {
      const day = now.getDay() === 0 ? 6 : now.getDay() - 1 // Monday start
      start = new Date(now)
      start.setDate(now.getDate() - day)
      start.setHours(0, 0, 0, 0)
      break
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      break
    case 'year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      break
    default:
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  }

  return { start, end }
}

/**
 * Calculate stats from local IndexedDB — instant, no network
 * Mirrors Flutter fetchData()
 */
export async function calcStatsLocal(storeId, filter, customRange = null) {
  try {
    const { start, end } = getDateRange(filter, customRange)

    const [allSales, allExpenses] = await Promise.all([
      localDb.getAllByIndex(STORES.sales, 'storeId', storeId),
      localDb.getAllByIndex(STORES.expenses, 'storeId', storeId),
    ])

    const sales = allSales.filter(s => {
      if (s.isDeleted) return false
      const d = new Date(s.saleDate)
      return d >= start && d <= end
    })

    const expenses = allExpenses.filter(e => {
      if (e.isDeleted) return false
      const d = new Date(e.expenseDate)
      return d >= start && d <= end
    })

    let totalIncome = 0
    let totalProductCost = 0
    sales.forEach(s => {
      totalIncome += s.totalAmount || 0
        ; (s.products || []).forEach(p => {
          const pp = p.purchasePrice ?? p.purchase_price ?? (p.price * 0.7)
          totalProductCost += pp * (p.quantity || 0)
        })
    })

    let totalExpenses = 0
    expenses.forEach(e => { totalExpenses += e.amount || 0 })

    return {
      totalOrders: sales.length,
      totalIncome,
      totalExpenses,
      totalProductCost,
      totalProfit: totalIncome - totalProductCost - totalExpenses,
    }
  } catch (err) {
    console.error('[calcStatsLocal]', err)
    return emptyResult()
  }
}

/**
 * Pull fresh data from Firestore and store in IndexedDB
 * Mirrors Flutter fetchDataFromFirebase()
 */
export async function syncStoreData(storeId) {
  try {
    console.log('[calcService] Syncing store data:', storeId)

    const [salesSnap, expensesSnap, productsSnap] = await Promise.all([
      getDocs(query(
        collection(firestore, 'stores', storeId, 'sales'),
        orderBy('updated_at', 'desc'),
        limit(500)
      )),
      getDocs(query(
        collection(firestore, 'stores', storeId, 'expenses'),
        orderBy('updated_at', 'desc'),
        limit(500)
      )),
      getDocs(query(
        collection(firestore, 'stores', storeId, 'products'),
        orderBy('updated_at', 'desc'),
        limit(500)
      )),
    ])

    const sales = salesSnap.docs.map(d => ({
      id: d.id,
      storeId,
      orderId: d.data().order_id ?? '',
      saleDate: d.data().sale_date ?? new Date().toISOString().split('T')[0],
      customerName: d.data().customer_name ?? '',
      customerPhone: d.data().customer_phone ?? '',
      totalAmount: d.data().total ?? 0,
      subTotal: d.data().sub_total ?? 0,
      discount: d.data().discount ?? 0,
      paidAmount: d.data().paid ?? 0,
      remainingAmount: d.data().remain_amount ?? 0,
      paymentMethod: d.data().payment_method ?? '',
      status: d.data().status ?? '',
      products: d.data().products ?? [],
      isDeleted: d.data().isDeleted ?? false,
      createdAt: d.data().created_at?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      updatedAt: d.data().updated_at?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      isSynced: true,
    }))

    const expenses = expensesSnap.docs.map(d => ({
      id: d.id,
      storeId,
      expenseType: d.data().expense_type ?? '',
      amount: d.data().amount ?? 0,
      category: d.data().category ?? '',
      expenseDate: d.data().expense_date ?? new Date().toISOString().split('T')[0],
      extraDetails: d.data().extra_details ?? '',
      isDeleted: d.data().isDeleted ?? false,
      createdAt: d.data().created_at?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      updatedAt: d.data().updated_at?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      isSynced: true,
    }))

    const products = productsSnap.docs.map(d => ({
      id: d.id,
      storeId,
      name: d.data().name ?? '',
      type: d.data().type ?? 'Product',
      category: d.data().category ?? '',
      purchasePrice: d.data().purchase_price ?? 0,
      sellingPrice: d.data().selling_price ?? 0,
      quantity: d.data().quantity ?? 0,
      status: d.data().status ?? 'Available',
      imageUrl: d.data().image_url ?? '',
      barcode: d.data().barcode ?? '',
      isDeleted: d.data().isDeleted ?? false,
      updatedAt: d.data().updated_at?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      isSynced: true,
    }))

    // Save to IndexedDB
    await Promise.all([
      localDb.putMany(STORES.sales, sales),
      localDb.putMany(STORES.expenses, expenses),
      localDb.putMany(STORES.products, products),
    ])

    await Promise.all([
      localDb.setLastSync(storeId, 'sales'),
      localDb.setLastSync(storeId, 'expenses'),
      localDb.setLastSync(storeId, 'products'),
    ])

    console.log(`[calcService] Synced: ${sales.length} sales, ${expenses.length} expenses, ${products.length} products`)
    return { sales, expenses, products }
  } catch (err) {
    console.error('[syncStoreData]', err)
    throw err
  }
}

/**
 * Fetch user's stores from Firestore and cache in IndexedDB
 */
export async function fetchUserStores(userId) {
  try {
    const userDoc = await getDoc(doc(firestore, 'users', userId))
    if (!userDoc.exists()) return []

    const storeIds = userDoc.data().stores ?? []
    const results = []

    for (const storeId of storeIds) {
      const storeDoc = await getDoc(doc(firestore, 'stores', storeId))
      if (storeDoc.exists()) {
        const data = { store_id: storeId, user_id: userId, ...storeDoc.data() }
        await localDb.put(STORES.stores, data)
        results.push(data)
      }
    }

    return results
  } catch (err) {
    console.error('[fetchUserStores]', err)
    // Fallback to cached
    return localDb.getAllByIndex(STORES.stores, 'userId', userId)
  }
}

export function emptyResult() {
  return { totalOrders: 0, totalIncome: 0, totalExpenses: 0, totalProductCost: 0, totalProfit: 0 }
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('sw-TZ', { maximumFractionDigits: 0 }).format(amount || 0)
}
