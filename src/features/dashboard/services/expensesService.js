// src/features/dashboard/services/expensesService.js
import { db as localDb, STORES } from './offlineDB.js'
import { doc, setDoc, updateDoc, serverTimestamp, getDocs, collection, query, orderBy } from 'firebase/firestore'
import { db as firestore } from '../../../plugins/firebase.js'
import { v4 as uuidv4 } from 'uuid'

class ExpensesService {
  async addExpense(storeId, userId, payload) {
    const id = uuidv4()
    const now = new Date().toISOString()
    const expense = {
      id, storeId, userId,
      expenseType: payload.expenseType ?? '',
      amount: payload.amount ?? 0,
      category: payload.category ?? '',
      expenseDate: payload.expenseDate ?? now.split('T')[0],
      extraDetails: payload.extraDetails ?? '',
      isDeleted: false,
      isSynced: false,
      createdAt: now,
      updatedAt: now,
    }
    await localDb.put(STORES.expenses, expense)
    this._push(storeId, expense).catch(console.warn)
    return expense
  }

  async updateExpense(storeId, id, updates) {
    const expense = await localDb.get(STORES.expenses, id)
    if (!expense) throw new Error('Expense not found')
    const updated = { ...expense, ...updates, isSynced: false, updatedAt: new Date().toISOString() }
    await localDb.put(STORES.expenses, updated)
    this._push(storeId, updated).catch(console.warn)
    return updated
  }

  async softDelete(storeId, id) {
    const expense = await localDb.get(STORES.expenses, id)
    if (!expense) return
    expense.isDeleted = true
    expense.isSynced = false
    expense.updatedAt = new Date().toISOString()
    await localDb.put(STORES.expenses, expense)
    this._syncDelete(storeId, id).catch(console.warn)
  }

  async restore(storeId, id) {
    const expense = await localDb.get(STORES.expenses, id)
    if (!expense) return
    expense.isDeleted = false
    expense.isSynced = false
    expense.updatedAt = new Date().toISOString()
    await localDb.put(STORES.expenses, expense)
    this._push(storeId, expense).catch(console.warn)
  }

  async getAll(storeId, { filter = 'month', customRange = null, includeDeleted = false } = {}) {
    const { getDateRange } = await import('./calculationService.js')
    const { start, end } = getDateRange(filter, customRange)
    const all = await localDb.getAllByIndex(STORES.expenses, 'storeId', storeId)
    return all
      .filter(e => {
        if (includeDeleted) return e.isDeleted
        if (e.isDeleted) return false
        const d = new Date(e.expenseDate)
        return d >= start && d <= end
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  async getCategories(storeId) {
    const all = await localDb.getAllByIndex(STORES.expenseCategories, 'storeId', storeId)
    return all.filter(c => !c.isDeleted).sort((a, b) => a.name.localeCompare(b.name))
  }

  async addCategory(storeId, userId, name) {
    const id = uuidv4()
    const now = new Date().toISOString()
    const cat = { id, storeId, userId, name, isDeleted: false, isSynced: false, createdAt: now, updatedAt: now }
    await localDb.put(STORES.expenseCategories, cat)
    this._pushCategory(storeId, cat).catch(console.warn)
    return cat
  }

  async _push(storeId, expense) {
    try {
      await setDoc(doc(db, 'stores', storeId, 'expenses', expense.id), {
        user_id: expense.userId,
        expense_type: expense.expenseType,
        amount: expense.amount,
        category: expense.category,
        expense_date: expense.expenseDate,
        extra_details: expense.extraDetails,
        isDeleted: expense.isDeleted ?? false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      }, { merge: true })
      expense.isSynced = true
      await localDb.put(STORES.expenses, expense)
    } catch (e) {
      console.warn('[ExpensesService] Push failed:', e.message)
    }
  }

  async _syncDelete(storeId, id) {
    try {
      await updateDoc(doc(db, 'stores', storeId, 'expenses', id), {
        isDeleted: true, updated_at: serverTimestamp()
      })
    } catch (e) {
      console.warn('[ExpensesService] Delete sync failed:', e.message)
    }
  }

  async _pushCategory(storeId, cat) {
    try {
      await setDoc(doc(db, 'stores', storeId, 'expense_categories', cat.id), {
        name: cat.name, userId: cat.userId,
        isDeleted: cat.isDeleted ?? false,
        created_at: serverTimestamp(), updated_at: serverTimestamp(),
      }, { merge: true })
      cat.isSynced = true
      await localDb.put(STORES.expenseCategories, cat)
    } catch (e) {
      console.warn('[ExpensesService] Category push failed:', e.message)
    }
  }
}

export const expensesService = new ExpensesService()
export default expensesService
