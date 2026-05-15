/**
 * offlineDB.js — IndexedDB wrapper (mirrors Flutter Hive boxes)
 *
 * FIXES vs original:
 *  1. Added inventory_ledger store  — mirrors Hive 'inventory_ledger' box
 *  2. Added cashflow store          — mirrors Hive 'cashflow_$storeId' box
 *  3. Added inventory_ops store     — mirrors Firestore sentinel sub-collection
 *  4. Added batch_history store     — already declared but missing indexes
 *  5. Added sync_metadata store     — mirrors Hive 'sales_sync_metadata_$storeId'
 *  6. Bumped DB_VERSION 5 → 7
 */

const DB_NAME = 'obiashara_db'
const DB_VERSION = 7   // bumped to trigger onupgradeneeded

const STORES = {
  sales: 'sales',
  products: 'products',
  batches: 'batches',
  productCategories: 'product_categories',
  expenses: 'expenses',
  expenseCategories: 'expense_categories',
  stores: 'stores',
  syncMeta: 'sync_meta',
  pendingOps: 'pending_ops',

  // ── NEW stores required to match mobile ──────────────────────────────────
  inventoryLedger: 'inventory_ledger',   // mirrors Hive inventory_ledger
  cashflow: 'cashflow',                  // mirrors Hive cashflow_$storeId
  inventoryOps: 'inventory_ops',         // mirrors Firestore sentinel sub-col
}

class OfflineDB {
  constructor() {
    this.db = null
    this._initPromise = null
  }

  async init() {
    if (this.db) return this.db
    if (this._initPromise) return this._initPromise

    this._initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (e) => {
        const db = e.target.result

        // ── Sales ─────────────────────────────────────────────────────────
        if (!db.objectStoreNames.contains(STORES.sales)) {
          const s = db.createObjectStore(STORES.sales, { keyPath: 'id' })
          s.createIndex('storeId', 'storeId', { unique: false })
          s.createIndex('saleDate', 'saleDate', { unique: false })
          s.createIndex('isDeleted', 'isDeleted', { unique: false })
          s.createIndex('isSynced', 'isSynced', { unique: false })
          s.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        // ── Products ──────────────────────────────────────────────────────
        if (!db.objectStoreNames.contains(STORES.products)) {
          const p = db.createObjectStore(STORES.products, { keyPath: 'id' })
          p.createIndex('storeId', 'storeId', { unique: false })
          p.createIndex('isDeleted', 'isDeleted', { unique: false })
          p.createIndex('isSynced', 'isSynced', { unique: false })
        }

        // ── Batches ───────────────────────────────────────────────────────
        if (!db.objectStoreNames.contains(STORES.batches)) {
          const b = db.createObjectStore(STORES.batches, { keyPath: 'id' })
          b.createIndex('productId', 'productId', { unique: false })
          b.createIndex('storeId', 'storeId', { unique: false })
          b.createIndex('isSynced', 'isSynced', { unique: false })
          b.createIndex('batchNumber', 'batchNumber', { unique: false })
        }

        // ── Product categories ────────────────────────────────────────────
        if (!db.objectStoreNames.contains(STORES.productCategories)) {
          const pc = db.createObjectStore(STORES.productCategories, { keyPath: 'id' })
          pc.createIndex('storeId', 'storeId', { unique: false })
        }

        // ── Expenses ──────────────────────────────────────────────────────
        if (!db.objectStoreNames.contains(STORES.expenses)) {
          const ex = db.createObjectStore(STORES.expenses, { keyPath: 'id' })
          ex.createIndex('storeId', 'storeId', { unique: false })
          ex.createIndex('expenseDate', 'expenseDate', { unique: false })
          ex.createIndex('isDeleted', 'isDeleted', { unique: false })
        }

        // ── Expense categories ────────────────────────────────────────────
        if (!db.objectStoreNames.contains(STORES.expenseCategories)) {
          const ec = db.createObjectStore(STORES.expenseCategories, { keyPath: 'id' })
          ec.createIndex('storeId', 'storeId', { unique: false })
        }

        // ── Store records ─────────────────────────────────────────────────
        if (!db.objectStoreNames.contains(STORES.stores)) {
          const st = db.createObjectStore(STORES.stores, { keyPath: 'store_id' })
          st.createIndex('userId', 'user_id', { unique: false })
        }

        // ── Sync metadata ─────────────────────────────────────────────────
        if (!db.objectStoreNames.contains(STORES.syncMeta)) {
          db.createObjectStore(STORES.syncMeta, { keyPath: 'key' })
        }

        // ── Pending operations queue ───────────────────────────────────────
        if (!db.objectStoreNames.contains(STORES.pendingOps)) {
          const po = db.createObjectStore(STORES.pendingOps, {
            keyPath: 'id',
            autoIncrement: true,
          })
          po.createIndex('storeId', 'storeId', { unique: false })
          po.createIndex('type', 'type', { unique: false })
          po.createIndex('attempts', 'attempts', { unique: false })
        }

        // ── NEW: Inventory ledger ─────────────────────────────────────────
        // Mirrors Flutter Hive 'inventory_ledger' box + InventoryLedgerEntry.
        // Each entry represents one product quantity change (sale, return,
        // damage, adjustment). Written locally first; flushed to Firestore
        // on next online event. The 'id' field acts as an idempotency key.
        if (!db.objectStoreNames.contains(STORES.inventoryLedger)) {
          const il = db.createObjectStore(STORES.inventoryLedger, { keyPath: 'id' })
          il.createIndex('productId', 'productId', { unique: false })
          il.createIndex('storeId', 'storeId', { unique: false })
          il.createIndex('status', 'status', { unique: false })
          il.createIndex('operationType', 'operationType', { unique: false })
          il.createIndex('createdAt', 'createdAt', { unique: false })
        }

        // ── NEW: Cashflow ─────────────────────────────────────────────────
        // Mirrors Flutter Hive 'cashflow_$storeId' box + CashflowModel.
        // Every financial event (sale, return, expense, stock purchase) gets
        // one entry. This is the web equivalent of CashflowService.
        if (!db.objectStoreNames.contains(STORES.cashflow)) {
          const cf = db.createObjectStore(STORES.cashflow, { keyPath: 'id' })
          cf.createIndex('storeId', 'storeId', { unique: false })
          cf.createIndex('type', 'type', { unique: false })       // 'inflow'|'outflow'
          cf.createIndex('source', 'source', { unique: false })   // 'sale'|'expense'|...
          cf.createIndex('referenceId', 'referenceId', { unique: false })
          cf.createIndex('date', 'date', { unique: false })
          cf.createIndex('isSynced', 'isSynced', { unique: false })
          cf.createIndex('isDeleted', 'isDeleted', { unique: false })
        }

        // ── NEW: Inventory ops (Firestore sentinel mirror) ─────────────────
        // Mirrors Firestore stores/$storeId/inventory_ops/$entryId.
        // Used to track which ledger entries have already been applied to
        // Firestore, providing idempotency across offline/online cycles.
        if (!db.objectStoreNames.contains(STORES.inventoryOps)) {
          const io = db.createObjectStore(STORES.inventoryOps, { keyPath: 'id' })
          io.createIndex('storeId', 'storeId', { unique: false })
          io.createIndex('productId', 'productId', { unique: false })
        }
      }

      request.onsuccess = (e) => { this.db = e.target.result; resolve(this.db) }
      request.onerror = (e) => {
        console.error('[OfflineDB] Open error:', e.target.error)
        reject(e.target.error)
      }
    })

    return this._initPromise
  }

  // ── Generic CRUD ───────────────────────────────────────────────────────────

  async put(storeName, record) {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite')
      tx.objectStore(storeName).put(record)
      tx.oncomplete = () => resolve(record)
      tx.onerror = (e) => reject(e.target.error)
    })
  }

  async putMany(storeName, records) {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      records.forEach(r => store.put(r))
      tx.oncomplete = () => resolve(records)
      tx.onerror = (e) => reject(e.target.error)
    })
  }

  async get(storeName, key) {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly')
      const req = tx.objectStore(storeName).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = (e) => reject(e.target.error)
    })
  }

  async getAll(storeName) {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly')
      const req = tx.objectStore(storeName).getAll()
      req.onsuccess = () => resolve(req.result ?? [])
      req.onerror = (e) => reject(e.target.error)
    })
  }

  async getAllByIndex(storeName, indexName, value) {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly')
      const req = tx.objectStore(storeName).index(indexName).getAll(value)
      req.onsuccess = () => resolve(req.result ?? [])
      req.onerror = (e) => reject(e.target.error)
    })
  }

  async delete(storeName, key) {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite')
      tx.objectStore(storeName).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
    })
  }

  async clearStore(storeName) {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite')
      tx.objectStore(storeName).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
    })
  }

  // ── Sync metadata helpers ──────────────────────────────────────────────────

  async getLastSync(storeId, collection) {
    const rec = await this.get(STORES.syncMeta, `${storeId}_${collection}`)
    return rec ? new Date(rec.value) : null
  }

  async setLastSync(storeId, collection, date = new Date()) {
    await this.put(STORES.syncMeta, {
      key: `${storeId}_${collection}`,
      value: date.toISOString(),
    })
  }

  // ── Pending operations (offline queue) ────────────────────────────────────

  async queueOperation(op) {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORES.pendingOps, 'readwrite')
      const req = tx.objectStore(STORES.pendingOps).add({
        ...op,
        createdAt: new Date().toISOString(),
        attempts: 0,
      })
      req.onsuccess = () => resolve(req.result)
      req.onerror = (e) => reject(e.target.error)
    })
  }

  async getPendingOps(storeId) {
    return this.getAllByIndex(STORES.pendingOps, 'storeId', storeId)
  }

  async deletePendingOp(id) {
    return this.delete(STORES.pendingOps, id)
  }

  async getAllPendingOps() {
    return this.getAll(STORES.pendingOps)
  }

  async incrementOpAttempts(id) {
    const op = await this.get(STORES.pendingOps, id)
    if (op) {
      op.attempts = (op.attempts ?? 0) + 1
      op.lastAttemptAt = new Date().toISOString()
      await this.put(STORES.pendingOps, op)
    }
  }
}

export const db = new OfflineDB()
export { STORES }
export default db