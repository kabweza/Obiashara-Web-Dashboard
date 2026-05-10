// src/features/dashboard/services/productsService.js
import { db as localDb, STORES } from './offlineDB.js'
import {
  doc, setDoc, updateDoc, getDocs,
  collection, query, orderBy, limit, serverTimestamp
} from 'firebase/firestore'
import { db as firestore } from '../../../plugins/firebase.js'
import { v4 as uuidv4 } from 'uuid'

class ProductsService {
  async addProduct(storeId, userId, payload) {
    const id = uuidv4()
    const now = new Date().toISOString()
    const product = {
      id, storeId, userId,
      name: payload.name ?? '',
      type: payload.type ?? 'Product',
      category: payload.category ?? '',
      purchasePrice: payload.purchasePrice ?? 0,
      sellingPrice: payload.sellingPrice ?? 0,
      quantity: payload.quantity ?? 0,
      status: payload.status ?? 'Available',
      barcode: payload.barcode ?? '',
      description: payload.description ?? '',
      imageUrl: payload.imageUrl ?? '',
      isDeleted: false,
      isSynced: false,
      createdAt: now,
      updatedAt: now,
    }
    await localDb.put(STORES.products, product)
    this._push(storeId, product).catch(console.warn)
    return product
  }

  async updateProduct(storeId, id, updates) {
    const product = await localDb.get(STORES.products, id)
    if (!product) throw new Error('Product not found')
    const updated = { ...product, ...updates, isSynced: false, updatedAt: new Date().toISOString() }
    await localDb.put(STORES.products, updated)
    this._push(storeId, updated).catch(console.warn)
    return updated
  }

  async softDelete(storeId, id) {
    const product = await localDb.get(STORES.products, id)
    if (!product) return
    product.isDeleted = true
    product.isSynced = false
    product.updatedAt = new Date().toISOString()
    await localDb.put(STORES.products, product)
    this._syncDelete(storeId, id).catch(console.warn)
  }

  async restore(storeId, id) {
    const product = await localDb.get(STORES.products, id)
    if (!product) return
    product.isDeleted = false
    product.isSynced = false
    product.updatedAt = new Date().toISOString()
    await localDb.put(STORES.products, product)
    this._push(storeId, product).catch(console.warn)
  }

  async addStock(storeId, id, { purchasePrice, sellingPrice, quantity }) {
    const product = await localDb.get(STORES.products, id)
    if (!product) throw new Error('Product not found')
    product.quantity = (product.quantity ?? 0) + quantity
    product.purchasePrice = purchasePrice
    product.sellingPrice = sellingPrice
    product.isSynced = false
    product.updatedAt = new Date().toISOString()
    await localDb.put(STORES.products, product)
    this._push(storeId, product).catch(console.warn)
    return product
  }

  async getAll(storeId, { includeDeleted = false } = {}) {
    const all = await localDb.getAllByIndex(STORES.products, 'storeId', storeId)
    return all
      .filter(p => includeDeleted ? p.isDeleted : !p.isDeleted)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }

  async getDeleted(storeId) {
    return this.getAll(storeId, { includeDeleted: true })
  }

  async search(storeId, q) {
    const all = await this.getAll(storeId)
    if (!q) return all
    const lower = q.toLowerCase()
    return all.filter(p => p.name.toLowerCase().includes(lower) || p.barcode?.includes(q))
  }

  async getLowStock(storeId, threshold = 5) {
    const all = await this.getAll(storeId)
    return all.filter(p => p.type === 'Product' && (p.quantity ?? 0) <= threshold)
  }

  async _push(storeId, product) {
    try {
      await setDoc(doc(db, 'stores', storeId, 'products', product.id), {
        id: product.id,
        name: product.name,
        type: product.type,
        user_id: product.userId,
        category: product.category,
        purchase_price: product.purchasePrice,
        selling_price: product.sellingPrice,
        quantity: product.quantity,
        status: product.status,
        barcode: product.barcode,
        description: product.description,
        image_url: product.imageUrl,
        isDeleted: product.isDeleted ?? false,
        updated_at: serverTimestamp(),
        created_at: serverTimestamp(),
      }, { merge: true })
      product.isSynced = true
      await localDb.put(STORES.products, product)
    } catch (e) {
      console.warn('[ProductsService] Push failed:', e.message)
    }
  }

  async _syncDelete(storeId, id) {
    try {
      await updateDoc(doc(db, 'stores', storeId, 'products', id), {
        isDeleted: true, updated_at: serverTimestamp()
      })
    } catch (e) {
      console.warn('[ProductsService] Delete sync failed:', e.message)
    }
  }
}

export const productsService = new ProductsService()
export default productsService
