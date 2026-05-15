/**
 * cashflowService.js
 *
 * Web equivalent of Flutter's CashflowService.
 * Every financial event (sale, return, expense, stock purchase) produces
 * one CashflowModel entry in IndexedDB. This is the single source of truth
 * for the Cashflow dashboard.
 *
 * Mirrors Flutter methods:
 *  recordSaleInflow(sale)     → called after addSale()
 *  deleteSaleInflow(sale)     → called after softDeleteSale()
 *  restoreSaleInflow(sale)    → called after restoreSale()
 *
 * CashflowType:  'inflow' | 'outflow'
 * CashflowSource: 'sale' | 'payment' | 'expense' | 'stockPurchase' | 'capital' | 'salary' | 'salaryAdvance'
 */

import {
    doc,
    collection,
    setDoc,
    updateDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
} from 'firebase/firestore'
import { db as firestore } from '../../../plugins/firebase.js'
import { db as localDb, STORES } from './offlineDB.js'
import { v4 as uuidv4 } from 'uuid'

class CashflowService {
    // ── Sale inflow ───────────────────────────────────────────────────────────

    /**
     * Records a sale as a cashflow inflow.
     * Called immediately after addSale() saves the sale locally.
     * Mirrors: CashflowService.recordSaleInflow(sale)
     *
     * @param {object} sale - The sale object as stored in IndexedDB
     */
    async recordSaleInflow(sale) {
        // Only record inflow for paid amounts (same logic as mobile)
        // If sale is fully unpaid (status=pending), paidAmount=0 → still record
        // so the dashboard shows it as a pending/partial entry.
        const cashflow = this._buildCashflowEntry({
            type: 'inflow',
            source: 'sale',
            amount: sale.paidAmount ?? sale.totalAmount,
            paymentMethod: sale.paymentMethod ?? 'cash',
            storeId: sale.storeId,
            userId: sale.userId,
            referenceId: sale.id,
            description: `Sale ${sale.orderId} — ${sale.customerName ?? 'Walk-in'}`,
            date: sale.saleDate ? new Date(sale.saleDate) : new Date(),
        })

        await localDb.put(STORES.cashflow, cashflow)
        this._pushCashflowToCloud(cashflow).catch(console.warn)
        return cashflow
    }

    /**
     * Reverses a sale's cashflow inflow when the sale is soft-deleted.
     * Mirrors: CashflowService.deleteSaleInflow(sale)
     *
     * Strategy: mark the original inflow entry as isDeleted=true and
     * create a compensating outflow entry so the net effect is zero.
     * This preserves the full audit trail (same approach as mobile).
     */
    async deleteSaleInflow(sale) {
        // 1. Find and soft-delete the original inflow entry
        const allCf = await localDb.getAllByIndex(STORES.cashflow, 'referenceId', sale.id)
        const originalInflow = allCf.find(
            cf => cf.source === 'sale' && cf.type === 'inflow' && !cf.isDeleted
        )

        if (originalInflow) {
            originalInflow.isDeleted = true
            originalInflow.isSynced = false
            originalInflow.updatedAt = new Date().toISOString()
            await localDb.put(STORES.cashflow, originalInflow)
            this._pushCashflowDeletionToCloud(originalInflow).catch(console.warn)
        }

        // 2. Create compensating outflow entry for audit trail
        const compensating = this._buildCashflowEntry({
            type: 'outflow',
            source: 'sale',
            amount: sale.paidAmount ?? sale.totalAmount,
            paymentMethod: sale.paymentMethod ?? 'cash',
            storeId: sale.storeId,
            userId: sale.userId,
            referenceId: sale.id,
            description: `Sale DELETED: ${sale.orderId} — ${sale.customerName ?? 'Walk-in'}`,
            date: new Date(),
        })

        await localDb.put(STORES.cashflow, compensating)
        this._pushCashflowToCloud(compensating).catch(console.warn)
        return compensating
    }

    /**
     * Re-activates a sale's cashflow inflow when the sale is restored.
     * Mirrors: CashflowService.restoreSaleInflow(sale)
     */
    async restoreSaleInflow(sale) {
        // 1. Un-delete any soft-deleted inflow for this sale
        const allCf = await localDb.getAllByIndex(STORES.cashflow, 'referenceId', sale.id)
        const deletedInflow = allCf.find(
            cf => cf.source === 'sale' && cf.type === 'inflow' && cf.isDeleted
        )

        if (deletedInflow) {
            deletedInflow.isDeleted = false
            deletedInflow.isSynced = false
            deletedInflow.updatedAt = new Date().toISOString()
            await localDb.put(STORES.cashflow, deletedInflow)
            this._pushCashflowRestoreToCloud(deletedInflow).catch(console.warn)
        } else {
            // No deleted inflow found — create a fresh inflow (handles edge case
            // where the original was hard-deleted or never created)
            await this.recordSaleInflow(sale)
        }

        // 2. Mark any compensating outflow as deleted (net effect restores to inflow)
        const compensatingOutflow = allCf.find(
            cf => cf.source === 'sale' &&
                cf.type === 'outflow' &&
                !cf.isDeleted &&
                cf.description?.includes('DELETED')
        )

        if (compensatingOutflow) {
            compensatingOutflow.isDeleted = true
            compensatingOutflow.isSynced = false
            compensatingOutflow.updatedAt = new Date().toISOString()
            await localDb.put(STORES.cashflow, compensatingOutflow)
            this._pushCashflowDeletionToCloud(compensatingOutflow).catch(console.warn)
        }
    }

    // ── Expense outflow ───────────────────────────────────────────────────────

    /**
     * Records an expense as a cashflow outflow.
     * Call this after saving an expense locally.
     */
    async recordExpenseOutflow(expense) {
        const cashflow = this._buildCashflowEntry({
            type: 'outflow',
            source: 'expense',
            amount: expense.amount,
            paymentMethod: expense.paymentMethod ?? 'cash',
            storeId: expense.storeId,
            userId: expense.userId,
            referenceId: expense.id,
            description: `Expense: ${expense.expenseType ?? expense.category}`,
            date: expense.expenseDate ? new Date(expense.expenseDate) : new Date(),
        })

        await localDb.put(STORES.cashflow, cashflow)
        this._pushCashflowToCloud(cashflow).catch(console.warn)
        return cashflow
    }

    // ── Stock purchase outflow ────────────────────────────────────────────────

    /**
     * Records a stock purchase as a cashflow outflow.
     * Call this after saving a stock purchase locally.
     */
    async recordStockPurchaseOutflow(stockPurchase) {
        const cashflow = this._buildCashflowEntry({
            type: 'outflow',
            source: 'stockPurchase',
            amount: stockPurchase.totalCost ?? stockPurchase.amount,
            paymentMethod: stockPurchase.paymentMethod ?? 'cash',
            storeId: stockPurchase.storeId,
            userId: stockPurchase.userId,
            referenceId: stockPurchase.id,
            description: `Stock Purchase: ${stockPurchase.supplierName ?? 'Supplier'}`,
            date: stockPurchase.purchaseDate ? new Date(stockPurchase.purchaseDate) : new Date(),
        })

        await localDb.put(STORES.cashflow, cashflow)
        this._pushCashflowToCloud(cashflow).catch(console.warn)
        return cashflow
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    /**
     * Returns all non-deleted cashflow entries for a store, filtered by date range.
     * Used by the Cashflow dashboard.
     *
     * @param {string} storeId
     * @param {{ start: Date, end: Date }} dateRange
     */
    async getCashflow(storeId, { start, end } = {}) {
        const all = await localDb.getAllByIndex(STORES.cashflow, 'storeId', storeId)
        return all
            .filter(cf => {
                if (cf.isDeleted) return false
                if (!start || !end) return true
                const d = new Date(cf.date)
                return d >= start && d <= end
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    /**
     * Returns cashflow summary stats for a date range.
     * Mirrors the Flutter CashflowService summary computation.
     *
     * @returns {{ totalInflow, totalOutflow, netCashflow, cashBalance }}
     */
    async getCashflowSummary(storeId, { start, end } = {}) {
        const entries = await this.getCashflow(storeId, { start, end })

        let totalInflow = 0
        let totalOutflow = 0

        for (const cf of entries) {
            if (cf.type === 'inflow') totalInflow += cf.amount
            else totalOutflow += cf.amount
        }

        return {
            totalInflow,
            totalOutflow,
            netCashflow: totalInflow - totalOutflow,
            cashBalance: totalInflow - totalOutflow,
        }
    }

    // ── Sync helpers ──────────────────────────────────────────────────────────

    async flushPendingCashflow(storeId) {
        if (!navigator.onLine) return
        const all = await localDb.getAllByIndex(STORES.cashflow, 'storeId', storeId)
        const unsynced = all.filter(cf => !cf.isSynced)
        for (const cf of unsynced) {
            try {
                if (cf.isDeleted) {
                    await this._pushCashflowDeletionToCloud(cf)
                } else {
                    await this._pushCashflowToCloud(cf)
                }
            } catch (err) {
                console.warn('[CashflowService] Flush failed for', cf.id, err.message)
            }
        }
    }

    // ── private helpers ───────────────────────────────────────────────────────

    _buildCashflowEntry({ type, source, amount, paymentMethod, storeId, userId, referenceId, description, date }) {
        return {
            id: uuidv4(),
            userId: userId ?? '',
            storeId: storeId ?? '',
            type,                  // 'inflow' | 'outflow'
            source,                // 'sale' | 'expense' | 'stockPurchase' | ...
            amount: parseFloat(amount) || 0,
            paymentMethod,
            date: (date instanceof Date ? date : new Date(date)).toISOString(),
            referenceId: referenceId ?? null,
            description: description ?? '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isSynced: false,
            isDeleted: false,
        }
    }

    async _pushCashflowToCloud(cf) {
        const docRef = doc(firestore, 'stores', cf.storeId, 'cashflow', cf.id)
        await setDoc(docRef, {
            id: cf.id,
            user_id: cf.userId,
            store_id: cf.storeId,
            type: cf.type,
            source: cf.source,
            amount: cf.amount,
            payment_method: cf.paymentMethod,
            date: cf.date,
            reference_id: cf.referenceId,
            description: cf.description,
            created_at: serverTimestamp(),
            is_deleted: false,
            updated_at: serverTimestamp(),
        }, { merge: true })

        cf.isSynced = true
        cf.updatedAt = new Date().toISOString()
        await localDb.put(STORES.cashflow, cf)
    }

    async _pushCashflowDeletionToCloud(cf) {
        const docRef = doc(firestore, 'stores', cf.storeId, 'cashflow', cf.id)
        await updateDoc(docRef, {
            is_deleted: true,
            updated_at: serverTimestamp(),
        })
        cf.isSynced = true
        cf.updatedAt = new Date().toISOString()
        await localDb.put(STORES.cashflow, cf)
    }

    async _pushCashflowRestoreToCloud(cf) {
        const docRef = doc(firestore, 'stores', cf.storeId, 'cashflow', cf.id)
        await updateDoc(docRef, {
            is_deleted: false,
            updated_at: serverTimestamp(),
        })
        cf.isSynced = true
        cf.updatedAt = new Date().toISOString()
        await localDb.put(STORES.cashflow, cf)
    }
}

export const cashflowService = new CashflowService()
export default cashflowService