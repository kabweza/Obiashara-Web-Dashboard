/**
 * offlineDB.js — IndexedDB wrapper (replaces Flutter's Hive for web)
 * Provides the same offline-first pattern: read local → show UI → sync background
 */

const DB_NAME = 'obiashara_db'
const DB_VERSION = 3

const STORES = {
  sales: 'sales',
  products: 'products',
  expenses: 'expenses',
  expenseCategories: 'expense_categories',
  stores: 'stores',
  syncMeta: 'sync_meta',
  pendingOps: 'pending_ops',
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

        // Sales store
        if (!db.objectStoreNames.contains(STORES.sales)) {
          const s = db.createObjectStore(STORES.sales, { keyPath: 'id' })
          s.createIndex('storeId', 'storeId', { unique: false })
          s.createIndex('saleDate', 'saleDate', { unique: false })
          s.createIndex('isDeleted', 'isDeleted', { unique: false })
          s.createIndex('isSynced', 'isSynced', { unique: false })
        }

        // Products store
        if (!db.objectStoreNames.contains(STORES.products)) {
          const p = db.createObjectStore(STORES.products, { keyPath: 'id' })
          p.createIndex('storeId', 'storeId', { unique: false })
          p.createIndex('isDeleted', 'isDeleted', { unique: false })
          p.createIndex('isSynced', 'isSynced', { unique: false })
        }

        // Expenses store
        if (!db.objectStoreNames.contains(STORES.expenses)) {
          const ex = db.createObjectStore(STORES.expenses, { keyPath: 'id' })
          ex.createIndex('storeId', 'storeId', { unique: false })
          ex.createIndex('expenseDate', 'expenseDate', { unique: false })
          ex.createIndex('isDeleted', 'isDeleted', { unique: false })
        }

        // Expense categories
        if (!db.objectStoreNames.contains(STORES.expenseCategories)) {
          const ec = db.createObjectStore(STORES.expenseCategories, { keyPath: 'id' })
          ec.createIndex('storeId', 'storeId', { unique: false })
        }

        // Stores
        if (!db.objectStoreNames.contains(STORES.stores)) {
          const st = db.createObjectStore(STORES.stores, { keyPath: 'store_id' })
          st.createIndex('userId', 'user_id', { unique: false })
        }

        // Sync metadata
        if (!db.objectStoreNames.contains(STORES.syncMeta)) {
          db.createObjectStore(STORES.syncMeta, { keyPath: 'key' })
        }

        // Pending operations queue (offline mutations)
        if (!db.objectStoreNames.contains(STORES.pendingOps)) {
          const po = db.createObjectStore(STORES.pendingOps, { keyPath: 'id', autoIncrement: true })
          po.createIndex('storeId', 'storeId', { unique: false })
          po.createIndex('type', 'type', { unique: false })
        }
      }

      request.onsuccess = (e) => {
        this.db = e.target.result
        resolve(this.db)
      }

      request.onerror = (e) => {
        console.error('[OfflineDB] Open error:', e.target.error)
        reject(e.target.error)
      }
    })

    return this._initPromise
  }

  // ─── Generic CRUD ──────────────────────────────────────────────────────────

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

  // ─── Sync metadata helpers ─────────────────────────────────────────────────

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

  // ─── Pending operations (offline queue) ───────────────────────────────────

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
}

export const db = new OfflineDB()
export { STORES }
export default db
