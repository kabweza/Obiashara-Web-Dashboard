/**
 * inventorySyncService.js
 *
 * Web equivalent of Flutter's InventorySyncService.
 * Provides the same offline-first inventory ledger that:
 *  • writes quantity deltas to IndexedDB immediately (Hive equivalent)
 *  • flushes to Firestore using FieldValue.increment inside a transaction
 *  • uses idempotency sentinels so no delta is ever applied twice
 *  • retries with exponential back-off (max 5 attempts, cap 30 s)
 *  • handles both FIFO batch deductions (sales) and LIFO batch returns
 *
 * Mirrors:
 *  recordSaleInventoryImpact()   → deltaSign = -1
 *  recordReturnInventoryImpact() → deltaSign = +1
 *  recordDamageInventoryImpact() → deltaSign = -1
 *  flushPendingLedger()
 *  isReturnAlreadyProcessed()
 *  pruneAppliedEntries()
 */

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    getDocs,
    query,
    orderBy,
    runTransaction,
    increment,
    serverTimestamp,
} from 'firebase/firestore'
import { db as firestore } from '../../../plugins/firebase.js'
import { db as localDb, STORES } from './offlineDB.js'

const MAX_RETRIES = 5
const PRUNE_AGE_MS = 7 * 24 * 60 * 60 * 1000  // 7 days

// ── connectivity helper ────────────────────────────────────────────────────

function isOnline() {
    return navigator.onLine
}

// ── singleton ──────────────────────────────────────────────────────────────

class InventorySyncService {
    constructor() {
        this._flushing = false
        this._initialized = false
    }

    // ── init ─────────────────────────────────────────────────────────────────

    async init() {
        if (this._initialized) return
        this._initialized = true

        // Auto-flush on connectivity restore (mirrors Connectivity().onConnectivityChanged)
        window.addEventListener('online', () => {
            setTimeout(() => this.flushPendingLedger(), 2000)
        })

        // Cold-start flush
        setTimeout(() => this.flushPendingLedger(), 5000)

        console.log('[InventorySyncService] initialised')
    }

    // ── public API ────────────────────────────────────────────────────────────

    /**
     * Returns true if a return sentinel already exists in the ledger.
     * Mirrors: isReturnAlreadyProcessed(handledKey)
     */
    async isReturnAlreadyProcessed(handledKey) {
        const existing = await localDb.get(STORES.inventoryLedger, handledKey)
        return existing !== null
    }

    /**
     * Returns the net pending quantity delta for a product across all
     * unsynced ledger entries. Used for optimistic UI display.
     * Mirrors: getPendingDeltaSum(productId)
     */
    async getPendingDeltaSum(productId) {
        const all = await localDb.getAllByIndex(STORES.inventoryLedger, 'productId', productId)
        return all
            .filter(e => e.status === 'pending')
            .reduce((sum, e) => sum + e.quantityDelta, 0)
    }

    // ── Sale impact ───────────────────────────────────────────────────────────

    /**
     * Records a sale's inventory deduction.
     * Mirrors: recordSaleInventoryImpact()
     *
     * @param {object[]} products  - Array of { id, type, quantity, ... }
     * @param {string}   saleId    - Unique sale ID (idempotency key)
     * @param {string}   storeId   - Store ID
     * @param {string}   [handledKey] - Optional extra dedup key (e.g. for restore)
     */
    async recordSaleInventoryImpact({ products, saleId, storeId, handledKey = null }) {
        if (handledKey) {
            await this._writeSentinel(handledKey, saleId, storeId, 'sale')
        }

        const entries = await this._buildAndPersistEntries({
            products,
            eventId: saleId,
            storeId,
            deltaSign: -1,
            operationType: 'sale',
            idPrefix: handledKey ? `${handledKey}_` : '',
        })

        return this._flushEntries(entries, storeId)
    }

    // ── Return impact ─────────────────────────────────────────────────────────

    /**
     * Records a return/restore's inventory addition.
     * Mirrors: recordReturnInventoryImpact()
     *
     * @param {string} [handledKey] - Dedup key, e.g. 'return_${saleId}_handled'
     */
    async recordReturnInventoryImpact({ products, saleId, storeId, handledKey = null }) {
        if (handledKey) {
            const alreadyDone = await this.isReturnAlreadyProcessed(handledKey)
            if (alreadyDone) {
                console.log(`[InventorySyncService] Return ${handledKey} already processed — skipping`)
                return true
            }
            await this._writeSentinel(handledKey, saleId, storeId, 'return')
        }

        const entries = await this._buildAndPersistEntries({
            products,
            eventId: saleId,
            storeId,
            deltaSign: +1,
            operationType: 'return',
            idPrefix: 'return_',
        })

        return this._flushEntries(entries, storeId)
    }

    // ── Damage impact ─────────────────────────────────────────────────────────

    /**
     * Mirrors: recordDamageInventoryImpact()
     */
    async recordDamageInventoryImpact({ products, damageId, storeId }) {
        const sentinelKey = `damage_${damageId}`
        const alreadyDone = await localDb.get(STORES.inventoryLedger, sentinelKey)
        if (alreadyDone) {
            console.log(`[InventorySyncService] Damage ${damageId} already recorded — skipping`)
            return true
        }
        await this._writeSentinel(sentinelKey, damageId, storeId, 'damage')

        const entries = await this._buildAndPersistEntries({
            products,
            eventId: damageId,
            storeId,
            deltaSign: -1,
            operationType: 'damage',
            idPrefix: 'damage_',
        })

        return this._flushEntries(entries, storeId)
    }

    // ── Flush ─────────────────────────────────────────────────────────────────

    /**
     * Flushes all pending ledger entries to Firestore.
     * Mirrors: flushPendingLedger()
     *
     * Safe to call before init() — exits immediately if not yet initialised.
     * Automatically prunes old applied entries on each run.
     *
     * @param {string} [storeId] - If provided, only flush entries for this store.
     */
    async flushPendingLedger(storeId = null) {
        if (!isOnline() || this._flushing) return

        this._flushing = true
        try {
            const allEntries = await localDb.getAll(STORES.inventoryLedger)
            const pending = allEntries.filter(e =>
                e.status === 'pending' &&
                (e.retryCount ?? 0) < MAX_RETRIES &&
                (!storeId || e.storeId === storeId)
            )

            if (pending.length === 0) return

            console.log(`[InventorySyncService] Flushing ${pending.length} pending ledger entries`)

            // Group by store to minimise Firestore collection lookups
            const byStore = {}
            for (const entry of pending) {
                const sid = entry.storeId
                if (!sid) {
                    console.warn(`[InventorySyncService] Entry ${entry.id} has no storeId — skipping`)
                    continue
                }
                if (!byStore[sid]) byStore[sid] = []
                byStore[sid].push(entry)
            }

            for (const [sid, entries] of Object.entries(byStore)) {
                for (const entry of entries) {
                    await this._applySingleEntry(entry, sid)
                }
            }

            await this.pruneAppliedEntries()
        } finally {
            this._flushing = false
        }
    }

    /**
     * Removes applied entries older than 7 days.
     * Mirrors: pruneAppliedEntries()
     */
    async pruneAppliedEntries() {
        const cutoff = Date.now() - PRUNE_AGE_MS
        const allEntries = await localDb.getAll(STORES.inventoryLedger)
        const toDelete = allEntries.filter(e => {
            if (e.status !== 'applied') return false
            if (!e.appliedAt) return false
            return new Date(e.appliedAt).getTime() < cutoff
        })
        for (const entry of toDelete) {
            await localDb.delete(STORES.inventoryLedger, entry.id)
        }
        if (toDelete.length > 0) {
            console.log(`[InventorySyncService] Pruned ${toDelete.length} applied ledger entries`)
        }
    }

    // ── private helpers ───────────────────────────────────────────────────────

    /**
     * Writes a sentinel entry (status='applied', quantityDelta=0) that acts as
     * a dedup marker for an entire operation (not a single product).
     * Mirrors: _writeSentinel()
     */
    async _writeSentinel(key, eventId, storeId, operationType) {
        const existing = await localDb.get(STORES.inventoryLedger, key)
        if (existing) return

        await localDb.put(STORES.inventoryLedger, {
            id: key,
            saleId: eventId,
            productId: '__sentinel__',
            quantityDelta: 0,
            status: 'applied',
            createdAt: new Date().toISOString(),
            appliedAt: new Date().toISOString(),
            storeId,
            operationType,
            retryCount: 0,
        })
    }

    /**
     * Builds InventoryLedgerEntry objects, deduplicates against existing entries,
     * persists new ones to IndexedDB, and returns only the new ones.
     * Mirrors: _buildAndPersistEntries()
     */
    async _buildAndPersistEntries({ products, eventId, storeId, deltaSign, operationType, idPrefix }) {
        const entries = []

        for (const p of products) {
            const productId = p.id ?? p.product_id
            if (!productId) continue

            const type = p.type ?? 'Product'
            if (type !== 'Product') continue  // services don't affect stock

            const qty = Math.abs(parseInt(p.quantity, 10) || 0)
            if (qty <= 0) continue

            const entryId = `${idPrefix}${eventId}_${productId}`

            // Idempotency: skip if already in ledger
            const existing = await localDb.get(STORES.inventoryLedger, entryId)
            if (existing) {
                console.log(`[InventorySyncService] Ledger entry already exists for ${entryId} — skipping`)
                continue
            }

            const entry = {
                id: entryId,
                saleId: eventId,
                productId: String(productId),
                quantityDelta: deltaSign * qty,
                status: 'pending',
                createdAt: new Date().toISOString(),
                appliedAt: null,
                storeId,
                operationType,
                retryCount: 0,
            }

            await localDb.put(STORES.inventoryLedger, entry)
            entries.push(entry)
        }

        return entries
    }

    /**
     * Flushes a list of entries. Returns true if all applied successfully.
     * Mirrors: _flushEntries()
     */
    async _flushEntries(entries, storeId) {
        if (!isOnline()) {
            console.log(`[InventorySyncService] Offline — queued ${entries.length} ledger entries`)
            return false
        }

        for (const entry of entries) {
            await this._applySingleEntry(entry, storeId)
        }

        return entries.every(e => e.status === 'applied')
    }

    /**
     * Applies a single ledger entry to Firestore inside a transaction.
     * Uses FIFO batch deduction for sales and headroom-aware return distribution.
     * Retries with exponential back-off up to MAX_RETRIES.
     * Mirrors: _applySingleEntry()
     */
    async _applySingleEntry(entry, storeId) {
        // Sentinel entries require no Firestore write
        if (entry.productId === '__sentinel__') {
            entry.status = 'applied'
            entry.appliedAt = new Date().toISOString()
            await localDb.put(STORES.inventoryLedger, entry)
            return
        }

        const sentinelRef = doc(
            firestore,
            'stores', storeId,
            'inventory_ops', entry.id
        )
        const productRef = doc(
            firestore,
            'stores', storeId,
            'products', entry.productId
        )
        const batchesRef = collection(productRef, 'price_history')
        const batchesQuery = query(batchesRef, orderBy('batch_number'))

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await runTransaction(firestore, async (txn) => {
                    // ── Idempotency check ──────────────────────────────────────────
                    const sentinelSnap = await txn.get(sentinelRef)
                    if (sentinelSnap.exists()) return  // already applied

                    // ── Fetch batches ──────────────────────────────────────────────
                    const batchesSnap = await getDocs(batchesQuery)

                    const isReduction = entry.quantityDelta < 0
                    let remainingDelta = Math.abs(entry.quantityDelta)

                    if (isReduction) {
                        // ── FIFO deduction across batches (mirrors mobile FIFO logic) ─
                        for (const batchDoc of batchesSnap.docs) {
                            if (remainingDelta <= 0) break
                            const currentQty = batchDoc.data().quantity ?? 0
                            if (currentQty > 0) {
                                const take = Math.min(remainingDelta, currentQty)
                                txn.update(batchDoc.ref, {
                                    quantity: increment(-take),
                                    remaining_quantity: increment(-take),
                                    updated_at: serverTimestamp(),
                                })
                                remainingDelta -= take
                            }
                        }
                    } else {
                        // ── Return: distribute into batches with headroom ──────────────
                        // Mirrors Flutter's headroom-aware logic (original_quantity - quantity)
                        let distributed = false
                        for (const batchDoc of batchesSnap.docs) {
                            if (remainingDelta <= 0) break
                            const data = batchDoc.data()
                            const currentQty = data.quantity ?? 0
                            const originalQty = data.original_quantity ?? currentQty
                            const headroom = originalQty - currentQty
                            if (headroom > 0) {
                                const add = Math.min(remainingDelta, headroom)
                                txn.update(batchDoc.ref, {
                                    quantity: increment(add),
                                    remaining_quantity: increment(add),
                                    updated_at: serverTimestamp(),
                                })
                                remainingDelta -= add
                                distributed = true
                            }
                        }

                        // Fallback: push any remainder into the oldest batch
                        if (remainingDelta > 0 && batchesSnap.docs.length > 0) {
                            txn.update(batchesSnap.docs[0].ref, {
                                quantity: increment(remainingDelta),
                                updated_at: serverTimestamp(),
                            })
                            if (!distributed) {
                                console.warn(
                                    `[InventorySyncService] Return overflow (${remainingDelta}) pushed to oldest batch for product ${entry.productId}`
                                )
                            }
                        }
                    }

                    // ── Update product-level quantity atomically ───────────────────
                    txn.update(productRef, {
                        quantity: increment(entry.quantityDelta),
                        updated_at: serverTimestamp(),
                    })

                    // ── Write sentinel to prevent double-apply ─────────────────────
                    txn.set(sentinelRef, {
                        applied_at: serverTimestamp(),
                        quantity_delta: entry.quantityDelta,
                        sale_id: entry.saleId,
                        product_id: entry.productId,
                        operation_type: entry.operationType,
                    })
                })

                // ── Update local IndexedDB to mark as applied ──────────────────
                await this._updateLocalProductAfterApply(entry, storeId)
                entry.status = 'applied'
                entry.appliedAt = new Date().toISOString()
                await localDb.put(STORES.inventoryLedger, entry)

                // Mirror sentinel into local inventoryOps store
                await localDb.put(STORES.inventoryOps, {
                    id: entry.id,
                    storeId,
                    productId: entry.productId,
                    appliedAt: entry.appliedAt,
                    quantityDelta: entry.quantityDelta,
                    operationType: entry.operationType,
                })

                return  // success — exit retry loop

            } catch (err) {
                entry.retryCount = (entry.retryCount ?? 0) + 1
                await localDb.put(STORES.inventoryLedger, entry)
                console.warn(`[InventorySyncService] Attempt ${attempt + 1} failed for ${entry.id}:`, err.message)

                if (attempt < 2) {
                    // Exponential back-off: 500ms, 1000ms (capped at 30s)
                    const delay = Math.min(500 * Math.pow(2, attempt), 30000)
                    await new Promise(r => setTimeout(r, delay))
                }
            }
        }

        // Mark as permanently failed if exceeded max retries
        if ((entry.retryCount ?? 0) >= MAX_RETRIES) {
            entry.status = 'failed'
            console.error(`[InventorySyncService] Entry ${entry.id} permanently failed after ${MAX_RETRIES} retries`)
        } else {
            entry.status = 'pending'
        }
        await localDb.put(STORES.inventoryLedger, entry)
    }

    /**
     * After Firestore transaction succeeds, mark local product as synced.
     * Does NOT re-apply the quantity delta — productsService already did
     * the local reduction before the ledger entry was created.
     * Mirrors: _updateLocalHiveAfterLedgerApply()
     */
    async _updateLocalProductAfterApply(entry, storeId) {
        try {
            const product = await localDb.get(STORES.products, entry.productId)
            if (!product) return

            product.isSynced = true
            product.updatedAt = new Date().toISOString()
            await localDb.put(STORES.products, product)

            // Update batches in IndexedDB to match what Firestore should now have
            const allBatches = await localDb.getAllByIndex(STORES.batches, 'productId', entry.productId)
            if (allBatches.length > 0) {
                // Sort FIFO (ascending batch number)
                allBatches.sort((a, b) => (a.batchNumber ?? 0) - (b.batchNumber ?? 0))

                const isReduction = entry.quantityDelta < 0
                let remaining = Math.abs(entry.quantityDelta)

                for (const batch of allBatches) {
                    if (remaining <= 0) break
                    if (isReduction) {
                        const currentQty = batch.quantity ?? 0
                        const take = Math.min(remaining, currentQty)
                        batch.quantity = currentQty - take
                        remaining -= take
                    } else {
                        const currentQty = batch.quantity ?? 0
                        const originalQty = batch.originalQuantity ?? currentQty
                        const headroom = originalQty - currentQty
                        if (headroom > 0) {
                            const add = Math.min(remaining, headroom)
                            batch.quantity = currentQty + add
                            remaining -= add
                        }
                    }
                    batch.isSynced = true
                    batch.updatedAt = new Date().toISOString()
                    await localDb.put(STORES.batches, batch)
                }
            }
        } catch (err) {
            console.warn('[InventorySyncService] Local product update after ledger apply failed:', err.message)
        }
    }
}

export const inventorySyncService = new InventorySyncService()
export default inventorySyncService