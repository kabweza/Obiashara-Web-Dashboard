/**
 * productsService.js
 *
 * Web equivalent of Flutter's ProductService, extended with the two local
 * quantity management methods that were missing and caused stock to never
 * change on the web when sales were made or reversed.
 *
 * NEW methods (direct mirrors of Flutter):
 *  reduceProductQuantitiesLocalOnly(products, saleId)
 *  returnProductQuantitiesLocalOnly(products, saleId)
 *
 * These manipulate IndexedDB immediately (offline-safe) exactly as the
 * Flutter equivalents manipulate Hive boxes. The InventorySyncService
 * then handles pushing the changes to Firestore asynchronously.
 */

import {
  doc,
  collection,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db as firestore } from '../../../plugins/firebase.js'
import { db as localDb, STORES } from './offlineDB.js'
import { v4 as uuidv4 } from 'uuid'

class ProductsService {
  // ── Inventory: local-only mutations ───────────────────────────────────────

  /**
   * Reduces product quantities locally in IndexedDB (Hive equivalent).
   * Called immediately after a sale is saved — before the Firestore push.
   * Mirrors: ProductService.reduceProductQuantitiesLocalOnly(products, saleId)
   *
   * @param {object[]} products - Array of { id|product_id, type, quantity }
   * @param {string}   saleId   - Used for dedup tracking in caller only
   */
  async reduceProductQuantitiesLocalOnly(products, saleId) {
    for (const p of products) {
      const productId = p.id ?? p.product_id
      if (!productId) continue

      const type = p.type ?? 'Product'
      if (type !== 'Product') continue  // services don't affect stock

      const qty = Math.abs(parseInt(p.quantity, 10) || 0)
      if (qty <= 0) continue

      await this._applyQuantityDeltaLocally(productId, -qty, saleId)
    }
  }

  /**
   * Returns product quantities locally in IndexedDB (Hive equivalent).
   * Called immediately when a sale is soft-deleted.
   * Mirrors: ProductService.returnProductQuantitiesLocalOnly(products, saleId)
   *
   * @param {object[]} products - Array of { id|product_id, type, quantity }
   * @param {string}   saleId   - Used for dedup tracking in caller only
   */
  async returnProductQuantitiesLocalOnly(products, saleId) {
    for (const p of products) {
      const productId = p.id ?? p.product_id
      if (!productId) continue

      const type = p.type ?? 'Product'
      if (type !== 'Product') continue

      const qty = Math.abs(parseInt(p.quantity, 10) || 0)
      if (qty <= 0) continue

      await this._applyQuantityDeltaLocally(productId, +qty, saleId)
    }
  }

  /**
   * Applies a quantity delta to a product and its FIFO batches in IndexedDB.
   * Mirrors the local Hive manipulation logic in Flutter's ProductService.
   *
   * For reductions:  FIFO — oldest batch first
   * For returns:     Headroom-aware — fills batches with space first,
   *                  falls back to oldest batch
   *
   * @private
   */
  async _applyQuantityDeltaLocally(productId, delta, saleId) {
    const product = await localDb.get(STORES.products, productId)
    if (!product) {
      console.warn(`[ProductsService] Product not found locally: ${productId}`)
      return
    }

    const isReduction = delta < 0
    let remaining = Math.abs(delta)

    // ── Update batch quantities (FIFO / headroom-aware) ────────────────────
    const batches = await localDb.getAllByIndex(STORES.batches, 'productId', productId)
    batches.sort((a, b) => (a.batchNumber ?? 0) - (b.batchNumber ?? 0))

    if (isReduction) {
      // FIFO deduction: drain from oldest batch first
      for (const batch of batches) {
        if (remaining <= 0) break
        const currentQty = batch.quantity ?? 0
        if (currentQty > 0) {
          const take = Math.min(remaining, currentQty)
          batch.quantity = currentQty - take
          batch.remainingQuantity = Math.max(0, (batch.remainingQuantity ?? currentQty) - take)
          batch.isSynced = false
          batch.updatedAt = new Date().toISOString()
          await localDb.put(STORES.batches, batch)
          remaining -= take
        }
      }
    } else {
      // Return: fill batches with headroom first, then fallback to oldest
      let distributed = false
      for (const batch of batches) {
        if (remaining <= 0) break
        const currentQty = batch.quantity ?? 0
        const originalQty = batch.originalQuantity ?? batch.quantity ?? 0
        const headroom = originalQty - currentQty
        if (headroom > 0) {
          const add = Math.min(remaining, headroom)
          batch.quantity = currentQty + add
          batch.remainingQuantity = (batch.remainingQuantity ?? currentQty) + add
          batch.isSynced = false
          batch.updatedAt = new Date().toISOString()
          await localDb.put(STORES.batches, batch)
          remaining -= add
          distributed = true
        }
      }
      // Fallback: push remainder into oldest batch
      if (remaining > 0 && batches.length > 0) {
        const oldest = batches[0]
        oldest.quantity = (oldest.quantity ?? 0) + remaining
        oldest.remainingQuantity = (oldest.remainingQuantity ?? 0) + remaining
        oldest.isSynced = false
        oldest.updatedAt = new Date().toISOString()
        await localDb.put(STORES.batches, oldest)
        if (!distributed) {
          console.warn(`[ProductsService] Return overflow (${remaining}) pushed to oldest batch for ${productId}`)
        }
      }
    }

    // ── Update product-level quantity ──────────────────────────────────────
    product.quantity = Math.max(0, (product.quantity ?? 0) + delta)
    product.isSynced = false
    product.updatedAt = new Date().toISOString()
    await localDb.put(STORES.products, product)
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async addProduct(storeId, userId, payload) {
    const productId = uuidv4()
    const now = new Date().toISOString()

    const product = {
      id: productId,
      storeId,
      userId,
      name: payload.name,
      type: payload.type ?? 'Product',
      category: payload.category ?? '',
      sellingPrice: payload.sellingPrice ?? 0,
      purchasePrice: payload.purchasePrice ?? 0,
      quantity: payload.quantity ?? 0,
      barcode: payload.barcode ?? '',
      imageUrl: payload.imageUrl ?? '',
      description: payload.description ?? '',
      isDeleted: false,
      isSynced: false,
      createdAt: now,
      updatedAt: now,
    }

    await localDb.put(STORES.products, product)
    this._pushProductToCloud(storeId, product).catch(console.warn)
    return product
  }

  async updateProduct(storeId, productId, updates) {
    const product = await localDb.get(STORES.products, productId)
    if (!product) throw new Error('Product not found')

    const updated = {
      ...product,
      ...updates,
      isSynced: false,
      updatedAt: new Date().toISOString(),
    }

    await localDb.put(STORES.products, updated)
    this._pushProductUpdateToCloud(storeId, updated).catch(console.warn)
    return updated
  }

  async softDelete(storeId, productId) {
    const product = await localDb.get(STORES.products, productId)
    if (!product) return

    product.isDeleted = true
    product.isSynced = false
    product.updatedAt = new Date().toISOString()
    await localDb.put(STORES.products, product)
    this._pushProductUpdateToCloud(storeId, product).catch(console.warn)
  }

  async restoreProduct(storeId, productId) {
    const product = await localDb.get(STORES.products, productId)
    if (!product) return

    product.isDeleted = false
    product.isSynced = false
    product.updatedAt = new Date().toISOString()
    await localDb.put(STORES.products, product)
    this._pushProductUpdateToCloud(storeId, product).catch(console.warn)
  }

  /**
   * Add stock batch to a product.
   * Creates a batch entry, updates product quantity locally, queues Firestore push.
   */
  async addStock(storeId, productId, stockData) {
    const product = await localDb.get(STORES.products, productId)
    if (!product) throw new Error('Product not found')

    const qty = parseInt(stockData.quantity, 10) || 0
    const batchId = uuidv4()
    const now = new Date().toISOString()

    // Get highest batch number
    const existingBatches = await localDb.getAllByIndex(STORES.batches, 'productId', productId)
    const maxBatchNumber = existingBatches.reduce((max, b) => Math.max(max, b.batchNumber ?? 0), 0)

    const batch = {
      id: batchId,
      productId,
      storeId,
      batchNumber: maxBatchNumber + 1,
      purchasePrice: stockData.purchasePrice ?? product.purchasePrice ?? 0,
      sellingPrice: stockData.sellingPrice ?? product.sellingPrice ?? 0,
      quantity: qty,
      originalQuantity: qty,   // IMMUTABLE — used for headroom calc on returns
      remainingQuantity: qty,
      expiryDate: stockData.expiryDate ?? null,
      isSynced: false,
      createdAt: now,
      updatedAt: now,
    }

    await localDb.put(STORES.batches, batch)

    product.quantity = (product.quantity ?? 0) + qty
    product.isSynced = false
    product.updatedAt = now
    await localDb.put(STORES.products, product)

    this._pushBatchToCloud(storeId, productId, batch).catch(console.warn)

    return product
  }

  async getProducts(storeId, { includeDeleted = false } = {}) {
    const all = await localDb.getAllByIndex(STORES.products, 'storeId', storeId)
    return all
      .filter(p => includeDeleted ? true : !p.isDeleted)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  async getDeletedProducts(storeId) {
    const all = await localDb.getAllByIndex(STORES.products, 'storeId', storeId)
    return all.filter(p => p.isDeleted)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }

  // ── Cloud sync helpers ─────────────────────────────────────────────────────

  async _pushProductToCloud(storeId, product) {
    const docRef = doc(firestore, 'stores', storeId, 'products', product.id)
    await setDoc(docRef, {
      name: product.name,
      type: product.type,
      category: product.category,
      selling_price: product.sellingPrice,
      purchase_price: product.purchasePrice,
      quantity: product.quantity,
      barcode: product.barcode,
      image_url: product.imageUrl,
      description: product.description,
      user_id: product.userId,
      isDeleted: false,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    }, { merge: true })

    product.isSynced = true
    await localDb.put(STORES.products, product)
  }

  async _pushProductUpdateToCloud(storeId, product) {
    const docRef = doc(firestore, 'stores', storeId, 'products', product.id)
    await updateDoc(docRef, {
      quantity: product.quantity,
      isDeleted: product.isDeleted,
      updated_at: serverTimestamp(),
    })
    product.isSynced = true
    await localDb.put(STORES.products, product)
  }

  async _pushBatchToCloud(storeId, productId, batch) {
    const batchRef = doc(
      firestore,
      'stores', storeId,
      'products', productId,
      'price_history', batch.id
    )
    await setDoc(batchRef, {
      batch_number: batch.batchNumber,
      purchase_price: batch.purchasePrice,
      selling_price: batch.sellingPrice,
      quantity: batch.quantity,
      original_quantity: batch.originalQuantity,
      remaining_quantity: batch.remainingQuantity,
      expiry_date: batch.expiryDate,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    }, { merge: true })

    batch.isSynced = true
    await localDb.put(STORES.batches, batch)
  }

  /**
   * Flush any locally modified products to Firestore.
   */
  async flushUnsyncedProducts(storeId) {
    if (!navigator.onLine) return
    const all = await localDb.getAllByIndex(STORES.products, 'storeId', storeId)
    const unsynced = all.filter(p => !p.isSynced)
    for (const p of unsynced) {
      try {
        await this._pushProductUpdateToCloud(storeId, p)
      } catch (err) {
        console.warn('[ProductsService] Flush failed for', p.id, err.message)
      }
    }
  }
}

export const productsService = new ProductsService()
export default productsService