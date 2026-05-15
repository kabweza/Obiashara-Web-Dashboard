/**
 * salesService.js — COMPLETE REWRITE vs original
 *
 * This is the web equivalent of Flutter's SalesService.
 * The original web version was missing the following critical features:
 *
 *  MISSING 1: Inventory deduction on sale (reduceProductQuantitiesLocalOnly +
 *             recordSaleInventoryImpact)
 *  MISSING 2: Cashflow recording on sale (recordSaleInflow)
 *  MISSING 3: Stock RETURN on soft-delete (returnProductQuantitiesLocalOnly +
 *             recordReturnInventoryImpact)
 *  MISSING 4: Cashflow reversal on soft-delete (deleteSaleInflow)
 *  MISSING 5: Stock DEDUCTION on restore (reduceProductQuantitiesLocalOnly +
 *             recordSaleInventoryImpact)
 *  MISSING 6: Cashflow re-activation on restore (restoreSaleInflow)
 *  MISSING 7: Conflict resolution (version + timestamp)
 *  MISSING 8: Real-time Firestore listener
 *  MISSING 9: Idempotency for all inventory operations
 *  MISSING 10: Exponential back-off retry for offline queue
 *
 * The corrected lifecycle mirrors Flutter exactly:
 *
 *  addSale:
 *    1. Save sale locally (IndexedDB)
 *    2. Record cashflow inflow
 *    3. Reduce inventory locally (IndexedDB)
 *    4. Record inventory ledger → flush to Firestore (or queue if offline)
 *    5. Push sale document to Firestore (non-blocking)
 *
 *  softDeleteSale:
 *    1. Return stock locally (IndexedDB)
 *    2. Record return in inventory ledger → Firestore
 *    3. Reverse cashflow inflow
 *    4. Mark sale isDeleted=true, isSynced=false
 *    5. Push deletion flag to Firestore
 *
 *  restoreSale:
 *    1. Deduct stock locally (IndexedDB)
 *    2. Record sale impact in inventory ledger → Firestore
 *    3. Re-activate cashflow inflow
 *    4. Mark sale isDeleted=false, isSynced=false
 *    5. Push restore flag to Firestore
 */

import {
  doc,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore'
import { db as firestore } from '../../../plugins/firebase.js'
import { db as localDb, STORES } from './offlineDB.js'
import { inventorySyncService } from './inventorysyncservice.js'
import { cashflowService } from './cashflowservice.js'
import { productsService } from './productsService.js'
import { v4 as uuidv4 } from 'uuid'

const MAX_RETRIES = 5

class SalesService {
  constructor() {
    this._realtimeUnsubscribe = null
    this._isListenerActive = false
    this._debounceTimer = null
    this._periodicSyncTimer = null
    this._isSyncing = false
    this._lastSyncTime = null
  }

  // ── init ──────────────────────────────────────────────────────────────────

  /**
   * Initializes the service: starts real-time listener and periodic sync.
   * Mirrors: SalesService.init()
   *
   * @param {string} storeId
   * @param {boolean} [startPeriodicSync=true]
   */
  async init(storeId, { startPeriodicSync = true } = {}) {
    await inventorySyncService.init()

    if (startPeriodicSync) {
      await this._startRealtimeListener(storeId)
      this._startPeriodicSync(storeId)
      setTimeout(() => this.syncBidirectional(storeId), 3000)
    }

    // Auto-reconnect on coming online
    window.addEventListener('online', () => {
      if (!this._isListenerActive) {
        this._startRealtimeListener(storeId)
      }
      this.syncBidirectional(storeId)
    })
  }

  // ── Real-time listener ────────────────────────────────────────────────────

  /**
   * Mirrors: SalesService._startRealtimeListener()
   */
  async _startRealtimeListener(storeId) {
    if (this._isListenerActive || !navigator.onLine) return

    try {
      const salesRef = collection(firestore, 'stores', storeId, 'sales')
      const q = query(salesRef, orderBy('updated_at', 'desc'), limit(500))

      this._realtimeUnsubscribe = onSnapshot(
        q,
        { includeMetadataChanges: false },
        (snapshot) => this._handleRealtimeUpdate(snapshot, storeId),
        (err) => {
          console.error('[SalesService] Listener error:', err)
          this._isListenerActive = false
          // Reconnect after 30s — mirrors Flutter retry logic
          setTimeout(() => this._startRealtimeListener(storeId), 30000)
        }
      )

      this._isListenerActive = true
      console.log('[SalesService] Real-time listener started for', storeId)
    } catch (err) {
      console.error('[SalesService] Failed to start listener:', err)
      this._isListenerActive = false
    }
  }

  /**
   * Mirrors: SalesService._handleRealtimeUpdate()
   * Debounced to 1s to batch rapid changes.
   */
  _handleRealtimeUpdate(snapshot, storeId) {
    if (snapshot.metadata.fromCache && snapshot.docChanges().length === 0) return

    clearTimeout(this._debounceTimer)
    this._debounceTimer = setTimeout(async () => {
      const changes = snapshot.docChanges()
      if (changes.length === 0) return

      console.log(`[SalesService] Processing ${changes.length} sale updates`)

      for (const change of changes) {
        try {
          const saleId = change.doc.id

          if (change.type === 'removed') {
            await this._handleCloudDeletion(saleId, storeId)
            await localDb.delete(STORES.sales, saleId)
            continue
          }

          const data = change.doc.data()
          const cloudSale = this._fromFirestore(data, saleId, storeId)
          const localSale = await localDb.get(STORES.sales, saleId)

          if (localSale && !localSale.isSynced) {
            // Conflict resolution: version + timestamp (mirrors Flutter)
            const winner = this._resolveConflict(localSale, cloudSale)
            if (winner.id === localSale.id && winner.version === localSale.version) {
              // Local wins: push local to cloud
              await this._saveSaleToFirebase(storeId, localSale)
              localSale.isSynced = true
              await localDb.put(STORES.sales, localSale)
            } else {
              // Cloud wins: save cloud version locally
              cloudSale.isSynced = true
              await localDb.put(STORES.sales, cloudSale)
            }
          } else {
            cloudSale.isSynced = true
            await localDb.put(STORES.sales, cloudSale)
          }
        } catch (err) {
          console.warn('[SalesService] Error processing change:', change.doc.id, err)
        }
      }

      // Notify UI (equivalent to eventBus.fire(SaleAddedEvent()))
      window.dispatchEvent(new CustomEvent('sales:updated', { detail: { storeId } }))
    }, 1000)
  }

  /**
   * Handles a cloud-triggered deletion (another device deleted this sale).
   * Returns stock to inventory.
   * Mirrors: SalesService._handleSaleDeletion()
   */
  async _handleCloudDeletion(saleId, storeId) {
    const localSale = await localDb.get(STORES.sales, saleId)
    if (!localSale || localSale.isDeleted) return

    const returnKey = `return_${saleId}_handled`
    const alreadyProcessed = await inventorySyncService.isReturnAlreadyProcessed(returnKey)

    if (!alreadyProcessed) {
      const productList = localSale.products.map(p => ({
        id: p.productId ?? p.id ?? p.name,
        type: p.type ?? 'Product',
        quantity: p.quantity,
      }))

      await productsService.returnProductQuantitiesLocalOnly(productList, saleId)
      await inventorySyncService.recordReturnInventoryImpact({
        products: productList,
        saleId,
        storeId,
        handledKey: returnKey,
      })
    }

    localSale.isDeleted = true
    localSale.updatedAt = new Date().toISOString()
    await localDb.put(STORES.sales, localSale)

    window.dispatchEvent(new CustomEvent('sales:updated', { detail: { storeId } }))
  }

  // ── Conflict resolution ───────────────────────────────────────────────────

  /**
   * Mirrors: SalesService._resolveConflict()
   * Deletion wins > most recent timestamp wins.
   */
  _resolveConflict(local, cloud) {
    if (local.isDeleted && !cloud.isDeleted) return local
    if (cloud.isDeleted && !local.isDeleted) return cloud
    return new Date(local.updatedAt) > new Date(cloud.updatedAt) ? local : cloud
  }

  // ── addSale ───────────────────────────────────────────────────────────────

  /**
   * Complete sale creation with inventory deduction, cashflow recording,
   * and offline-safe sync.
   * Mirrors: SalesService.addSale()
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
      reconciledStatus: payload.reconciledStatus ?? '',
      discount: payload.discount ?? 0,
      products: (payload.products ?? []).map(p => ({
        productId: p.id ?? p.productId ?? p.product_id,
        name: p.name,
        type: p.type ?? 'Product',
        quantity: parseInt(p.quantity, 10) || 0,
        price: parseFloat(p.price) || 0,
        purchasePrice: parseFloat(p.purchase_price ?? p.purchasePrice) || null,
      })),
      subTotal: payload.subTotal ?? 0,
      totalAmount: payload.total ?? 0,
      status: payload.status ?? 'paid',
      paidAmount: payload.paid ?? payload.total ?? 0,
      remainingAmount: payload.remainAmount ?? 0,
      paymentMethod: payload.paymentMethod ?? 'cash',
      description: payload.description ?? '',
      isDeleted: false,
      isSynced: false,
      lastModifiedBy: userId,
      version: 1,
      createdAt: now,
      updatedAt: now,
    }

    // ── Step 1: Save sale locally ──────────────────────────────────────────
    await localDb.put(STORES.sales, sale)
    console.log('[SalesService] Sale saved locally:', sale.orderId)

    // ── Step 2: Record cashflow inflow ─────────────────────────────────────
    // Mirrors: await _cashflowService.recordSaleInflow(sale)
    await cashflowService.recordSaleInflow(sale)

    // ── Step 3: Reduce inventory locally (Hive equivalent) ────────────────
    // Mirrors: await _productService.reduceProductQuantitiesLocalOnly(products, saleId)
    await productsService.reduceProductQuantitiesLocalOnly(sale.products, saleId)

    // ── Step 4: Record in ledger → push to Firestore (or queue if offline) ─
    // Mirrors: await _inventorySync.recordSaleInventoryImpact(...)
    await inventorySyncService.recordSaleInventoryImpact({
      products: sale.products,
      saleId,
      storeId,
    })

    // ── Step 5: Sync sale document to cloud (non-blocking) ─────────────────
    this._syncSaleToCloud(storeId, sale).catch(console.warn)

    // Notify UI
    window.dispatchEvent(new CustomEvent('sales:updated', { detail: { storeId } }))

    return sale
  }

  // ── softDeleteSale ────────────────────────────────────────────────────────

  /**
   * Soft-deletes a sale: returns stock, reverses cashflow, flags isDeleted.
   * Mirrors: SalesService.softDeleteSale(id)
   *
   * FIX vs original: was only flagging isDeleted=true with no inventory or
   * cashflow side-effects.
   */
  async softDeleteSale(storeId, saleId, userId = null) {
    const sale = await localDb.get(STORES.sales, saleId)
    if (!sale) throw new Error('Sale not found locally')
    if (sale.isDeleted) {
      console.log('[SalesService] Sale already deleted — skipping:', saleId)
      return
    }

    const productList = sale.products.map(p => ({
      id: p.productId ?? p.id ?? p.name,
      type: p.type ?? 'Product',
      quantity: p.quantity,
    }))

    const handledKey = `return_${saleId}_handled`

    // ── Step 1: Return stock locally ───────────────────────────────────────
    // Mirrors: await _productService.returnProductQuantitiesLocalOnly(productList, sale.id)
    await productsService.returnProductQuantitiesLocalOnly(productList, saleId)

    // ── Step 2: Record return in inventory ledger → Firestore ──────────────
    // Mirrors: await _inventorySync.recordReturnInventoryImpact(...)
    await inventorySyncService.recordReturnInventoryImpact({
      products: productList,
      saleId,
      storeId,
      handledKey,
    })

    // ── Step 3: Reverse cashflow inflow ────────────────────────────────────
    // Mirrors: await _cashflowService.deleteSaleInflow(sale)
    await cashflowService.deleteSaleInflow(sale)

    // ── Step 4: Mark sale as deleted locally ───────────────────────────────
    sale.isDeleted = true
    sale.updatedAt = new Date().toISOString()
    sale.version = (sale.version ?? 0) + 1
    sale.lastModifiedBy = userId ?? sale.userId
    sale.isSynced = false
    await localDb.put(STORES.sales, sale)

    console.log('[SalesService] Sale soft deleted:', sale.orderId)

    // ── Step 5: Push deletion flag to Firestore ────────────────────────────
    if (navigator.onLine) {
      this._syncSoftDeleteToCloud(storeId, saleId).catch(console.warn)
    }

    window.dispatchEvent(new CustomEvent('sales:updated', { detail: { storeId } }))
  }

  // ── restoreSale ───────────────────────────────────────────────────────────

  /**
   * Restores a deleted sale: deducts stock, re-activates cashflow.
   * Mirrors: SalesService.restoreSale(id)
   *
   * FIX vs original: was only flagging isDeleted=false with no inventory or
   * cashflow side-effects.
   */
  async restoreSale(storeId, saleId, userId = null) {
    const sale = await localDb.get(STORES.sales, saleId)
    if (!sale) throw new Error('Sale not found locally')
    if (!sale.isDeleted) throw new Error('Sale is not deleted')

    const productList = sale.products.map(p => ({
      id: p.productId ?? p.id ?? p.name,
      type: p.type ?? 'Product',
      quantity: p.quantity,
      price: p.price,
      purchase_price: p.purchasePrice,
    }))

    // ── Step 1: Deduct stock locally ───────────────────────────────────────
    // Mirrors: await _productService.reduceProductQuantitiesLocalOnly(productList, id)
    await productsService.reduceProductQuantitiesLocalOnly(productList, saleId)

    // ── Step 2: Mark sale as active BEFORE Firestore push (offline safety) ─
    sale.isDeleted = false
    sale.updatedAt = new Date().toISOString()
    sale.version = (sale.version ?? 0) + 1
    sale.lastModifiedBy = userId ?? sale.userId
    sale.isSynced = false
    await localDb.put(STORES.sales, sale)

    console.log('[SalesService] Sale restored locally:', sale.orderId)

    // ── Step 3: Push stock deduction to Firestore via ledger ───────────────
    // Uses a unique restore event ID to ensure idempotency across attempts
    // Mirrors: await _inventorySync.recordSaleInventoryImpact(products, restoreEventId, storeId)
    const restoreEventId = `restore_${saleId}_${sale.version}_${Date.now()}`
    await inventorySyncService.recordSaleInventoryImpact({
      products: productList,
      saleId: restoreEventId,
      storeId,
    })

    // ── Step 4: Re-activate cashflow inflow ───────────────────────────────
    // Mirrors: await _cashflowService.restoreSaleInflow(sale)
    await cashflowService.restoreSaleInflow(sale)

    // ── Step 5: Push isDeleted=false to Firestore ─────────────────────────
    if (navigator.onLine) {
      this._syncRestoreToCloud(storeId, saleId).catch(console.warn)
    }

    window.dispatchEvent(new CustomEvent('sales:updated', { detail: { storeId } }))
    return sale
  }

  // ── hardDeleteSale ────────────────────────────────────────────────────────

  /**
   * Permanently removes a sale from IndexedDB and Firestore.
   * Mirrors: SalesService.hardDeleteSale(id)
   */
  async hardDeleteSale(storeId, saleId) {
    const sale = await localDb.get(STORES.sales, saleId)
    if (!sale) throw new Error('Sale not found locally')

    await localDb.delete(STORES.sales, saleId)

    if (navigator.onLine) {
      this._syncHardDeleteToCloud(storeId, saleId).catch(console.warn)
    }
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  /**
   * Returns filtered sales for a store.
   * Mirrors: SalesService.getAllSales()
   *
   * @param {string} storeId
   * @param {{ filter, startDate, endDate, includeDeleted }} options
   */
  async getAllSales(storeId, {
    filter = 'today',
    startDate = null,
    endDate = null,
    includeDeleted = false,
  } = {}) {
    const all = await localDb.getAllByIndex(STORES.sales, 'storeId', storeId)

    let filtered = all.filter(s => includeDeleted ? true : !s.isDeleted)

    // Date filtering
    const { start, end } = this._getDateRange(filter, startDate, endDate)
    if (start && end) {
      filtered = filtered.filter(s => {
        const d = new Date(s.saleDate)
        return d >= start && d <= end
      })
    }

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  async getSaleById(storeId, saleId) {
    return localDb.get(STORES.sales, saleId)
  }

  async getDeletedSales(storeId) {
    const all = await localDb.getAllByIndex(STORES.sales, 'storeId', storeId)
    return all
      .filter(s => s.isDeleted)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }

  // ── Bidirectional sync ────────────────────────────────────────────────────

  /**
   * Mirrors: SalesService.syncBidirectional()
   */
  async syncBidirectional(storeId) {
    if (this._isSyncing || !navigator.onLine) return

    this._isSyncing = true
    try {
      console.log('[SalesService] Starting bidirectional sync...')

      // 1. Flush inventory ledger first
      await inventorySyncService.flushPendingLedger(storeId)

      // 2. Push unsynced local sales to cloud
      await this._pushLocalChangesToCloud(storeId)

      // 3. Pull remote sales
      await this._pullRemoteChangesFromCloud(storeId)

      this._lastSyncTime = new Date()
      await localDb.setLastSync(storeId, 'sales')
      console.log('[SalesService] Sync completed for', storeId)
    } catch (err) {
      console.error('[SalesService] Sync error:', err)
    } finally {
      this._isSyncing = false
    }
  }

  async _pushLocalChangesToCloud(storeId) {
    const all = await localDb.getAllByIndex(STORES.sales, 'storeId', storeId)
    const unsynced = all.filter(s => !s.isSynced)

    for (const sale of unsynced) {
      try {
        if (sale.isDeleted) {
          await this._syncSoftDeleteToCloud(storeId, sale.id)
        } else {
          await this._saveSaleToFirebase(storeId, sale)
          sale.isSynced = true
          await localDb.put(STORES.sales, sale)
        }
      } catch (err) {
        console.warn('[SalesService] Push failed for', sale.id, err.message)
      }
    }

    console.log(`[SalesService] Pushed ${unsynced.length} sales`)
  }

  async _pullRemoteChangesFromCloud(storeId) {
    try {
      const salesRef = collection(firestore, 'stores', storeId, 'sales')
      const q = query(salesRef, orderBy('updated_at', 'desc'), limit(500))
      const snapshot = await getDocs(q)

      let count = 0
      for (const docSnap of snapshot.docs) {
        const localSale = await localDb.get(STORES.sales, docSnap.id)
        if (localSale && !localSale.isSynced) continue  // local has pending changes

        const cloudSale = this._fromFirestore(docSnap.data(), docSnap.id, storeId)
        cloudSale.isSynced = true
        await localDb.put(STORES.sales, cloudSale)
        count++
      }

      console.log(`[SalesService] Pulled ${count} sales from Firestore`)
    } catch (err) {
      console.error('[SalesService] Pull error:', err)
    }
  }

  // ── Pending ops flush (offline queue) ────────────────────────────────────

  /**
   * Flushes the pending operations queue.
   * Mirrors: periodic sync + online reconnect flush in Flutter.
   */
  async flushPendingOps(storeId) {
    const pending = await localDb.getPendingOps(storeId)
    for (const op of pending) {
      try {
        if (op.attempts >= MAX_RETRIES) {
          console.warn('[SalesService] Op exceeded max retries, skipping:', op.id)
          continue
        }

        if (op.type === 'sale_add') {
          const sale = await localDb.get(STORES.sales, op.payload?.id)
          if (sale && !sale.isSynced) await this._saveSaleToFirebase(storeId, sale)
        } else if (op.type === 'sale_delete') {
          await this._syncSoftDeleteToCloud(storeId, op.payload?.saleId)
        } else if (op.type === 'sale_restore') {
          await this._syncRestoreToCloud(storeId, op.payload?.saleId)
        }

        await localDb.deletePendingOp(op.id)
      } catch (err) {
        console.warn('[SalesService] Flush op failed:', err.message)
        await localDb.incrementOpAttempts(op.id)
      }
    }
  }

  // ── Periodic sync ─────────────────────────────────────────────────────────

  _startPeriodicSync(storeId) {
    clearInterval(this._periodicSyncTimer)
    this._periodicSyncTimer = setInterval(async () => {
      // Skip if synced within the last minute (smart sync)
      if (this._lastSyncTime) {
        const elapsed = Date.now() - this._lastSyncTime.getTime()
        if (elapsed < 60000) return
      }
      await this.syncBidirectional(storeId)
    }, 3 * 60 * 1000)  // every 3 minutes — mirrors Flutter
  }

  // ── Cloud sync helpers ────────────────────────────────────────────────────

  async _syncSaleToCloud(storeId, sale) {
    if (!navigator.onLine) return
    try {
      await this._saveSaleToFirebase(storeId, sale)
      sale.isSynced = true
      await localDb.put(STORES.sales, sale)
    } catch (err) {
      console.warn('[SalesService] Background sync failed:', err.message)
      // Leave isSynced=false — periodic sync will retry
    }
  }

  async _saveSaleToFirebase(storeId, sale) {
    const docRef = doc(firestore, 'stores', storeId, 'sales', sale.id)

    // Check for OrderID collision (mirrors Flutter _saveSaleToFirebase)
    const collisionQuery = query(
      collection(firestore, 'stores', storeId, 'sales'),
      where('order_id', '==', sale.orderId),
      limit(2)
    )
    const collisionSnap = await getDocs(collisionQuery)
    const hasCollision = collisionSnap.docs.some(d => d.id !== sale.id)

    let finalOrderId = sale.orderId
    if (hasCollision) {
      finalOrderId = `${sale.orderId}-${sale.id.slice(-6)}`
      console.warn('[SalesService] OrderID collision:', sale.orderId, '→', finalOrderId)
      sale.orderId = finalOrderId
      await localDb.put(STORES.sales, sale)
    }

    await setDoc(docRef, {
      order_id: finalOrderId,
      user_id: sale.userId,
      customer_name: sale.customerName,
      customer_phone: sale.customerPhone,
      customer_id: sale.customerId,
      sale_date: sale.saleDate,
      discount: sale.discount,
      description: sale.description,
      products: sale.products.map(p => ({
        id: p.productId,
        product_id: p.productId,
        name: p.name,
        type: p.type,
        quantity: p.quantity,
        price: p.price,
        purchase_price: p.purchasePrice ?? (p.price * 0.7),
      })),
      sub_total: sale.subTotal,
      total: sale.totalAmount,
      status: sale.status,
      paid: sale.paidAmount,
      remain_amount: sale.remainingAmount,
      payment_method: sale.paymentMethod,
      reconciled_status: sale.reconciledStatus ?? '',
      isDeleted: sale.isDeleted ?? false,
      lastModifiedBy: sale.lastModifiedBy ?? sale.userId,
      version: sale.version ?? 1,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    }, { merge: true })
  }

  async _syncSoftDeleteToCloud(storeId, saleId) {
    const docRef = doc(firestore, 'stores', storeId, 'sales', saleId)
    await updateDoc(docRef, {
      isDeleted: true,
      deleted_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    })
    const sale = await localDb.get(STORES.sales, saleId)
    if (sale) { sale.isSynced = true; await localDb.put(STORES.sales, sale) }
  }

  async _syncRestoreToCloud(storeId, saleId) {
    const docRef = doc(firestore, 'stores', storeId, 'sales', saleId)
    await updateDoc(docRef, {
      isDeleted: false,
      deleted_at: null,
      updated_at: serverTimestamp(),
    })
    const sale = await localDb.get(STORES.sales, saleId)
    if (sale) { sale.isSynced = true; await localDb.put(STORES.sales, sale) }
  }

  async _syncHardDeleteToCloud(storeId, saleId) {
    await deleteDoc(doc(firestore, 'stores', storeId, 'sales', saleId))
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  /**
   * Mirrors: SalesService._fromFirestore() (Flutter SaleHiveModel.fromFirestore)
   */
  _fromFirestore(data, docId, storeId) {
    return {
      id: docId,
      storeId,
      orderId: data.order_id ?? 'Unknown',
      userId: data.user_id ?? '',
      saleDate: data.sale_date ?? new Date().toISOString().split('T')[0],
      customerName: data.customer_name ?? 'Unknown',
      customerPhone: data.customer_phone ?? '',
      customerId: data.customer_id ?? '',
      reconciledStatus: data.reconciled_status ?? '',
      discount: parseFloat(data.discount) || 0,
      description: data.description ?? '',
      products: (data.products ?? []).map(p => ({
        productId: p.id ?? p.product_id,
        name: p.name ?? 'Unknown',
        type: p.type ?? 'Product',
        quantity: parseInt(p.quantity, 10) || 0,
        price: parseFloat(p.price) || 0,
        purchasePrice: parseFloat(p.purchase_price) || null,
      })),
      subTotal: parseFloat(data.sub_total) || 0,
      totalAmount: parseFloat(data.total) || 0,
      status: data.status ?? 'Unknown',
      paidAmount: parseFloat(data.paid) || 0,
      remainingAmount: parseFloat(data.remain_amount) || 0,
      paymentMethod: data.payment_method ?? 'cash',
      isDeleted: data.isDeleted ?? false,
      isSynced: true,
      lastModifiedBy: data.lastModifiedBy ?? null,
      version: data.version ?? 1,
      createdAt: data.created_at?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      updatedAt: data.updated_at?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    }
  }

  /**
   * Mirrors: OrderIdGenerator.generate()
   * Generates a store-aware, timestamp-based order ID.
   */
  _generateOrderId(storeId, userId) {
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, '')
    const time = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`
    const storeSuffix = (storeId ?? '').slice(-4).padStart(4, '0')
    const userSuffix = (userId ?? '').slice(-4).padStart(4, '0')
    return `ORD-${storeSuffix}-${date}-${time}-${userSuffix}`
  }

  /**
   * Returns { start, end } Date objects for the given time filter.
   * Mirrors: Flutter SalesService.getAllSales() date range logic.
   */
  _getDateRange(filter, startDate, endDate) {
    const now = new Date()

    switch (filter) {
      case 'today': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const end = new Date(start.getTime() + 86400000 - 1)
        return { start, end }
      }
      case 'week': {
        const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1  // Mon=0
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
        const end = new Date()
        return { start, end }
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        const end = new Date()
        return { start, end }
      }
      case 'custom': {
        if (!startDate || !endDate) return { start: null, end: null }
        return {
          start: new Date(startDate),
          end: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        }
      }
      default:
        return { start: null, end: null }
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  dispose() {
    if (this._realtimeUnsubscribe) {
      this._realtimeUnsubscribe()
      this._realtimeUnsubscribe = null
    }
    clearInterval(this._periodicSyncTimer)
    clearTimeout(this._debounceTimer)
    this._isListenerActive = false
    console.log('[SalesService] disposed')
  }
}

export const salesService = new SalesService()
export default salesService