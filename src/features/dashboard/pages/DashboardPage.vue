<template>
  <DashboardLayout>
    <Suspense>
      <component :is="currentPage" />
    </Suspense>
  </DashboardLayout>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../../../stores/authStore.js'
import { useDashboardStore } from '../../../stores/dashboardStore.js'
import DashboardLayout from '../components/layout/DashboardLayout.vue'
import DashboardHome from './DashboardHome.vue'
import SalesPage from './SalesPage.vue'
import ProductsPage from './ProductsPage.vue'
import ExpensesPage from './ExpensesPage.vue'
import AnalyticsPage from './AnalyticsPage.vue'

const authStore = useAuthStore()
const dashStore = useDashboardStore()

const PAGE_MAP = {
  dashboard: DashboardHome,
  sales: SalesPage,
  products: ProductsPage,
  expenses: ExpensesPage,
  analytics: AnalyticsPage,
  // Stub pages for remaining routes
  reports: { template: '<div class="p-8 text-center text-gray-400"><p class="text-2xl font-bold mb-2">Reports</p><p>Coming soon — premium feature</p></div>' },
  stock: { template: '<div class="p-8 text-center text-gray-400"><p class="text-2xl font-bold mb-2">Stock Management</p><p>Coming soon</p></div>' },
  damage: { template: '<div class="p-8 text-center text-gray-400"><p class="text-2xl font-bold mb-2">Damaged Items</p><p>Coming soon</p></div>' },
  sellers: { template: '<div class="p-8 text-center text-gray-400"><p class="text-2xl font-bold mb-2">Sellers</p><p>Coming soon</p></div>' },
  customers: { template: '<div class="p-8 text-center text-gray-400"><p class="text-2xl font-bold mb-2">Customers</p><p>Coming soon</p></div>' },
  suppliers: { template: '<div class="p-8 text-center text-gray-400"><p class="text-2xl font-bold mb-2">Suppliers</p><p>Coming soon</p></div>' },
}

const currentPage = computed(() => PAGE_MAP[dashStore.activePage] ?? DashboardHome)

onMounted(async () => {
  await dashStore.initialize(authStore.userId)
})
</script>
