// src/features/dashboard/services/salesService.js
import { db as localDb, STORES } from './offlineDB.js'
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, limit, where,
  serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db as firestore } from '../../../plugins/firebase.js'
import { v4 as uuidv4 } from 'uuid'

class SalesService {
  /**
   * Add a sale — saves locally first, then syncs (mirrors Flutter addSale)
   */
  async addSale(storeId, userId, payload) {
    const saleId = uuidv4()
    const now = new Date().toISOString()
    const orderId = this._generateOrderId(storeId, userId)

    const sale = {
      id: saleId,
      storeId,
      orderId,
      userId,
      saleDate: payload.saleDate ?? now.split('T')[0],
      customerName: payload.customerName ?? 'Walk-in Customer',
      customerPhone: payload.customerPhone ?? '',
      customerId: payload.customerId ?? '',
      discount: payload.discount ?? 0,
      products: payload.products ?? [],
      subTotal: payload.subTotal ?? 0,
      totalAmount: payload.total ?? 0,
      status: payload.status ?? 'Completed',
      paidAmount: payload.paid ?? payload.total ?? 0,
      remainingAmount: payload.remainAmount ?? 0,
      paymentMethod: payload.paymentMethod ?? 'Cash',
      description: payload.description ?? '',
      isDeleted: false,
      isSynced: false,
      createdAt: now,
      updatedAt: now,
    }

    await localDb.put(STORES.sales, sale)

    // Queue for cloud sync
    await localDb.queueOperation({
      storeId,
      type: 'sale_add',
      payload: sale,
    })

    // Non-blocking cloud push
    this._pushSaleToCloud(storeId, sale).catch(console.warn)

    return sale
  }

  /**
   * Soft delete sale + return stock (mirrors Flutter softDeleteSale)
   */
  async softDeleteSale(storeId, saleId) {
    const sale = await localDb.get(STORES.sales, saleId)
    if (!sale || sale.isDeleted) return

    sale.isDeleted = true
    sale.isSynced = false
    sale.updatedAt = new Date().toISOString()
    await localDb.put(STORES.sales, sale)

    await localDb.queueOperation({
      storeId,
      type: 'sale_delete',
      payload: { saleId },
    })

    this._syncDeleteToCloud(storeId, saleId).catch(console.warn)
    return sale
  }

  /**
   * Restore deleted sale
   */
  async restoreSale(storeId, saleId) {
    const sale = await localDb.get(STORES.sales, saleId)
    if (!sale) return

    sale.isDeleted = false
    sale.isSynced = false
    sale.updatedAt = new Date().toISOString()
    await localDb.put(STORES.sales, sale)

    this._syncRestoreToCloud(storeId, saleId).catch(console.warn)
    return sale
  }

  /**
   * Get all sales for a store filtered by date
   */
  async getSales(storeId, { filter = 'today', customRange = null, includeDeleted = false } = {}) {
    const { getDateRange } = await import('./calculationService.js')
    const { start, end } = getDateRange(filter, customRange)

    const all = await localDb.getAllByIndex(STORES.sales, 'storeId', storeId)
    return all
      .filter(s => {
        if (!includeDeleted && s.isDeleted) return false
        if (includeDeleted && !s.isDeleted) return false
        const d = new Date(s.saleDate)
        return d >= start && d <= end
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  async getAllSales(storeId, includeDeleted = false) {
    const all = await localDb.getAllByIndex(STORES.sales, 'storeId', storeId)
    return all
      .filter(s => includeDeleted ? true : !s.isDeleted)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  async getDeletedSales(storeId) {
    const all = await localDb.getAllByIndex(STORES.sales, 'storeId', storeId)
    return all.filter(s => s.isDeleted).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }

  // ─── Cloud sync helpers ───────────────────────────────────────────────────

  async _pushSaleToCloud(storeId, sale) {
    try {
      const docRef = doc(db, 'stores', storeId, 'sales', sale.id)
      await setDoc(docRef, {
        order_id: sale.orderId,
        user_id: sale.userId,
        customer_name: sale.customerName,
        customer_phone: sale.customerPhone,
        sale_date: sale.saleDate,
        discount: sale.discount,
        products: sale.products,
        sub_total: sale.subTotal,
        total: sale.totalAmount,
        status: sale.status,
        paid: sale.paidAmount,
        remain_amount: sale.remainingAmount,
        payment_method: sale.paymentMethod,
        description: sale.description,
        isDeleted: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      }, { merge: true })

      sale.isSynced = true
      await localDb.put(STORES.sales, sale)
    } catch (e) {
      console.warn('[SalesService] Push failed, will retry:', e.message)
    }
  }

  async _syncDeleteToCloud(storeId, saleId) {
    try {
      await updateDoc(doc(db, 'stores', storeId, 'sales', saleId), {
        isDeleted: true,
        updated_at: serverTimestamp(),
      })
      const sale = await localDb.get(STORES.sales, saleId)
      if (sale) { sale.isSynced = true; await localDb.put(STORES.sales, sale) }
    } catch (e) {
      console.warn('[SalesService] Delete sync failed:', e.message)
    }
  }

  async _syncRestoreToCloud(storeId, saleId) {
    try {
      await updateDoc(doc(db, 'stores', storeId, 'sales', saleId), {
        isDeleted: false,
        updated_at: serverTimestamp(),
      })
      const sale = await localDb.get(STORES.sales, saleId)
      if (sale) { sale.isSynced = true; await localDb.put(STORES.sales, sale) }
    } catch (e) {
      console.warn('[SalesService] Restore sync failed:', e.message)
    }
  }

  /**
   * Flush pending ops queue
   */
  async flushPendingOps(storeId) {
    const pending = await localDb.getPendingOps(storeId)
    for (const op of pending) {
      try {
        if (op.type === 'sale_add') await this._pushSaleToCloud(storeId, op.payload)
        if (op.type === 'sale_delete') await this._syncDeleteToCloud(storeId, op.payload.saleId)
        await localDb.deletePendingOp(op.id)
      } catch (e) {
        console.warn('[SalesService] Flush op failed:', e.message)
      }
    }
  }

  _generateOrderId(storeId, userId) {
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, '')
    const time = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`
    const storeSuffix = storeId.slice(-4).padStart(4, '0')
    const userSuffix = userId.slice(-4).padStart(4, '0')
    return `ORD-${storeSuffix}-${date}-${time}-${userSuffix}`
  }
}

export const salesService = new SalesService()
export default salesService
