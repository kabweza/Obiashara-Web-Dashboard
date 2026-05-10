<template>
  <div class="products-page">
    <div class="page-header">
      <div>
        <h2 class="page-h2">{{ t('products') }}</h2>
        <p class="page-sub">{{ active.length }} {{ t('products') }} · {{ lowStock.length }} {{ t('low_stock') }}</p>
      </div>
      <div class="header-actions">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
          </svg>
          <input v-model="search" type="text" :placeholder="t('search_hint')" class="search-input" @input="doSearch" />
        </div>
        <select v-model="typeFilter" class="period-select">
          <option value="">All Types</option>
          <option value="Product">Product</option>
          <option value="Service">Service</option>
        </select>
        <button class="btn-add" @click="showAdd = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          {{ t('add_product') }}
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'active' }" @click="tab = 'active'">{{ t('active') }} ({{ active.length }})</button>
      <button class="tab" :class="{ active: tab === 'low' }" @click="tab = 'low'">{{ t('low_stock') }} ({{ lowStock.length }})</button>
      <button class="tab" :class="{ active: tab === 'deleted' }" @click="tab = 'deleted'">{{ t('deleted') }}</button>
    </div>

    <!-- Product grid -->
    <div v-if="displayed.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-14 h-14">
        <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5"/>
      </svg>
      <p>{{ tab === 'active' ? t('no_products_yet') : t('no_deleted_products') }}</p>
      <button v-if="tab === 'active'" class="btn-add" @click="showAdd = true">{{ t('add_first_product') }}</button>
    </div>

    <div v-else class="products-grid">
      <div v-for="product in displayed" :key="product.id" class="product-card">
        <!-- Image / placeholder -->
        <div class="product-image" :class="{ 'out-of-stock': product.quantity === 0 && product.type === 'Product' }">
          <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" class="product-img" />
          <div v-else class="product-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-gray-300">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4"/>
            </svg>
          </div>
          <div v-if="product.type === 'Product' && product.quantity <= 5" class="stock-badge" :class="product.quantity === 0 ? 'out' : 'low'">
            {{ product.quantity === 0 ? 'Out' : `${product.quantity} left` }}
          </div>
          <div class="type-badge">{{ product.type }}</div>
        </div>

        <div class="product-body">
          <h4 class="product-name">{{ product.name }}</h4>
          <p v-if="product.category" class="product-cat">{{ product.category }}</p>

          <div class="price-row">
            <div class="price-block">
              <span class="price-label">Selling</span>
              <span class="price-val">TZS {{ formatCurrency(product.sellingPrice) }}</span>
            </div>
            <div class="price-block">
              <span class="price-label">Cost</span>
              <span class="price-val cost">TZS {{ formatCurrency(product.purchasePrice) }}</span>
            </div>
          </div>

          <div v-if="product.type === 'Product'" class="qty-row">
            <span class="qty-label">Qty</span>
            <span class="qty-val" :class="{ 'qty-low': product.quantity <= 5, 'qty-out': product.quantity === 0 }">{{ product.quantity }}</span>
          </div>
        </div>

        <div class="product-actions">
          <template v-if="tab !== 'deleted'">
            <button class="pact-btn" title="Add Stock" @click="openAddStock(product)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
              </svg>
            </button>
            <button class="pact-btn" title="Edit" @click="openEdit(product)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/>
              </svg>
            </button>
            <button class="pact-btn danger" title="Delete" @click="confirmDelete(product)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916"/>
              </svg>
            </button>
          </template>
          <button v-else class="pact-btn success" @click="handleRestore(product.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <Teleport to="body">
      <AddProductModal v-if="showAdd" @close="showAdd = false" @saved="onSaved" />
      <AddProductModal v-if="editTarget" :product="editTarget" @close="editTarget = null" @saved="onSaved" />
      <AddStockModal v-if="stockTarget" :product="stockTarget" @close="stockTarget = null" @saved="onSaved" />
      <ConfirmModal v-if="deleteTarget"
        :title="t('delete_product')"
        :message="t('delete_product_confirm')"
        @confirm="handleDelete"
        @cancel="deleteTarget = null"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDashboardStore } from '../../../stores/dashboardStore.js'
import { productsService } from '../services/productsService.js'
import { formatCurrency } from '../services/calculationService.js'
import AddProductModal from '../components/AddProductModal.vue'
import AddStockModal from '../components/AddStockModal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'

const { t } = useI18n()
const dashStore = useDashboardStore()

const tab = ref('active')
const search = ref('')
const typeFilter = ref('')
const showAdd = ref(false)
const editTarget = ref(null)
const stockTarget = ref(null)
const deleteTarget = ref(null)
const deletedList = ref([])

const allProducts = computed(() => dashStore.productsList)
const active = computed(() => allProducts.value.filter(p => !p.isDeleted))
const lowStock = computed(() => active.value.filter(p => p.type === 'Product' && (p.quantity ?? 0) <= 5))

function applyFilters(list) {
  let result = list
  if (typeFilter.value) result = result.filter(p => p.type === typeFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(p => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || p.barcode?.includes(search.value))
  }
  return result
}

const displayed = computed(() => {
  if (tab.value === 'active') return applyFilters(active.value)
  if (tab.value === 'low') return applyFilters(lowStock.value)
  return applyFilters(deletedList.value)
})

function doSearch() {} // reactive via computed

function openEdit(p) { editTarget.value = p }
function openAddStock(p) { stockTarget.value = p }
function confirmDelete(p) { deleteTarget.value = p }

async function handleDelete() {
  if (!deleteTarget.value) return
  await dashStore.deleteProduct(deleteTarget.value.id)
  deleteTarget.value = null
}

async function handleRestore(id) {
  await productsService.restore(dashStore.selectedStoreId, id)
  deletedList.value = deletedList.value.filter(p => p.id !== id)
  dashStore.productsList = await productsService.getAll(dashStore.selectedStoreId)
}

async function onSaved() {
  showAdd.value = false
  editTarget.value = null
  stockTarget.value = null
  dashStore.productsList = await productsService.getAll(dashStore.selectedStoreId)
}

async function loadDeleted() {
  deletedList.value = await productsService.getDeleted(dashStore.selectedStoreId)
}

onMounted(async () => {
  if (!dashStore.productsList.length) {
    dashStore.productsList = await productsService.getAll(dashStore.selectedStoreId)
  }
})
</script>

<style scoped>
.products-page { display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
.page-h2 { font-size: 22px; font-weight: 800; color: #111827; }
.page-sub { font-size: 13px; color: #9ca3af; margin-top: 4px; }
.header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.search-wrap { position: relative; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
.search-input { padding: 8px 12px 8px 32px; border-radius: 10px; border: 1.5px solid #e5e7eb; font-size: 13px; outline: none; width: 200px; }
.search-input:focus { border-color: #cf4638; }
.period-select { padding: 8px 12px; border-radius: 10px; border: 1.5px solid #e5e7eb; font-size: 13px; outline: none; }
.btn-add { display: flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 10px; border: none; background: linear-gradient(135deg, #cf4638, #f16657); color: white; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(207,70,56,0.3); }

.tabs { display: flex; gap: 4px; background: #f9fafb; padding: 4px; border-radius: 10px; width: fit-content; }
.tab { padding: 7px 16px; border-radius: 8px; border: none; background: transparent; font-size: 13px; font-weight: 600; color: #6b7280; cursor: pointer; }
.tab.active { background: white; color: #cf4638; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

.products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }

.product-card { background: white; border-radius: 16px; border: 1px solid #f3f4f6; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
.product-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }

.product-image { position: relative; height: 140px; background: #f9fafb; display: flex; align-items: center; justify-content: center; }
.product-image.out-of-stock { opacity: 0.6; }
.product-img { width: 100%; height: 100%; object-fit: cover; }
.product-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }

.stock-badge { position: absolute; top: 8px; right: 8px; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
.stock-badge.low { background: #fffbeb; color: #d97706; }
.stock-badge.out { background: #fef2f2; color: #dc2626; }
.type-badge { position: absolute; bottom: 8px; left: 8px; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; background: rgba(0,0,0,0.6); color: white; }

.product-body { padding: 14px 16px; }
.product-name { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 2px; }
.product-cat { font-size: 11px; color: #9ca3af; margin-bottom: 10px; }
.price-row { display: flex; gap: 12px; margin-bottom: 8px; }
.price-block { display: flex; flex-direction: column; }
.price-label { font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; }
.price-val { font-size: 13px; font-weight: 700; color: #111827; }
.price-val.cost { color: #6b7280; }
.qty-row { display: flex; align-items: center; gap: 6px; }
.qty-label { font-size: 11px; color: #9ca3af; font-weight: 600; }
.qty-val { font-size: 13px; font-weight: 800; color: #111827; }
.qty-val.qty-low { color: #d97706; }
.qty-val.qty-out { color: #dc2626; }

.product-actions { display: flex; gap: 6px; padding: 10px 14px; border-top: 1px solid #f9fafb; background: #fafafa; }
.pact-btn { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; background: #f3f4f6; color: #6b7280; transition: all 0.2s; }
.pact-btn:hover { background: #e5e7eb; }
.pact-btn.danger { background: #fef2f2; color: #ef4444; }
.pact-btn.danger:hover { background: #ef4444; color: white; }
.pact-btn.success { background: #f0fdf4; color: #16a34a; }
.pact-btn.success:hover { background: #16a34a; color: white; }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 60px 20px; color: #d1d5db; }
.empty-state p { font-size: 14px; color: #9ca3af; font-weight: 500; }
</style>
