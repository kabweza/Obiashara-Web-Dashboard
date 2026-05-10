<template>
  <div class="dashboard-shell" :class="{ 'sidebar-collapsed': !sidebarOpen }">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand">
          <div class="brand-icon">
            <svg viewBox="0 0 24 24" fill="white" class="w-6 h-6">
              <path
                d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
            </svg>
          </div>
          <div v-if="sidebarOpen" class="brand-text">
            <span class="brand-name">Obiashara</span>
            <span class="brand-sub">Business Manager</span>
          </div>
        </div>
        <button class="collapse-btn" @click="dashStore.sidebarOpen = !sidebarOpen">
          <svg v-if="sidebarOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Store Selector -->
      <div v-if="sidebarOpen && stores.length" class="store-selector">
        <div class="store-selector-label">Current Store</div>
        <div class="store-dropdown-wrap">
          <select class="store-select" :value="selectedStoreId" @change="e => dashStore.switchStore(e.target.value)">
            <option v-for="s in stores" :key="s.store_id" :value="s.store_id">{{ s.business_name }}</option>
          </select>
          <svg viewBox="0 0 20 20" fill="currentColor" class="select-arrow w-4 h-4">
            <path fill-rule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clip-rule="evenodd" />
          </svg>
        </div>
      </div>

      <!-- Nav items -->
      <nav class="sidebar-nav">
        <div class="nav-section-label" v-if="sidebarOpen">Main</div>
        <NavItem icon="dashboard" label="Dashboard" page="dashboard" />
        <NavItem icon="products" label="Products" page="products" />
        <NavItem icon="sales" label="Sales" page="sales" />
        <NavItem icon="expenses" label="Expenses" page="expenses" />

        <div class="nav-section-label" v-if="sidebarOpen">Business</div>
        <NavItem icon="analytics" label="Analytics" page="analytics" />
        <NavItem icon="reports" label="Reports" page="reports" />
        <NavItem icon="stock" label="Stock In" page="stock" />
        <NavItem icon="damage" label="Damaged Items" page="damage" />

        <div class="nav-section-label" v-if="sidebarOpen && userRole === 'owner'">People</div>
        <NavItem v-if="userRole === 'owner'" icon="sellers" label="Sellers" page="sellers" />
        <NavItem icon="customers" label="Customers" page="customers" />
        <NavItem icon="suppliers" label="Suppliers" page="suppliers" />
      </nav>

      <!-- Sidebar footer -->
      <div class="sidebar-footer">
        <button class="footer-item" @click="handleLogout">
          <span class="footer-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25" />
            </svg>
          </span>
          <span v-if="sidebarOpen" class="footer-label text-red-500">Logout</span>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="main-area">
      <!-- Top bar -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="mobile-menu-btn" @click="dashStore.sidebarOpen = !sidebarOpen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 class="page-title">{{ pageTitle }}</h1>
        </div>
        <div class="topbar-right">
          <!-- Sync status -->
          <div class="sync-badge" :class="isOnline ? 'online' : 'offline'">
            <div v-if="isSyncing" class="sync-spinner" />
            <div v-else class="sync-dot" />
            <span>{{ isSyncing ? 'Syncing…' : isOnline ? 'Online' : 'Offline' }}</span>
            <span v-if="lastSyncTime && !isSyncing" class="sync-time">· {{ timeSinceSync }}</span>
          </div>

          <!-- Lang toggle -->
          <button class="icon-btn" @click="toggleLocale">
            <span class="text-sm font-bold">{{ locale === 'en' ? '🇹🇿' : '🇬🇧' }}</span>
          </button>

          <!-- Low stock alert -->
          <button v-if="lowStockCount > 0" class="icon-btn relative" @click="dashStore.activePage = 'products'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5 text-orange-500">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span class="badge-dot">{{ lowStockCount }}</span>
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="page-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDashboardStore } from '../../../../stores/dashboardStore.js'
import { useAuthStore } from '../../../../stores/authStore.js'
import NavItem from './NavItem.vue'

const router = useRouter()
const { locale } = useI18n()
const dashStore = useDashboardStore()
const authStore = useAuthStore()

const { sidebarOpen, stores, selectedStoreId, selectedStoreName, activePage, userRole,
  isOnline, isSyncing, lastSyncTime, timeSinceSync, lowStockCount } = dashStore

const pageTitle = computed(() => {
  const pages = {
    dashboard: 'Dashboard', products: 'Products', sales: 'Sales',
    expenses: 'Expenses', analytics: 'Analytics', reports: 'Reports',
    stock: 'Stock Management', damage: 'Damaged Items', sellers: 'Sellers',
    customers: 'Customers', suppliers: 'Suppliers',
  }
  return pages[dashStore.activePage] ?? 'Dashboard'
})

function toggleLocale() {
  locale.value = locale.value === 'en' ? 'sw' : 'en'
  localStorage.setItem('locale', locale.value)
}

async function handleLogout() {
  await authStore.logout()
  router.push('/auth')
}
</script>

<style scoped>
.dashboard-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #f8fafc;
}

/* Sidebar */
.sidebar {
  width: 260px;
  min-width: 260px;
  background: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease, min-width 0.3s ease;
  overflow: hidden;
  z-index: 40;
}

.sidebar-collapsed .sidebar {
  width: 72px;
  min-width: 72px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  shrink: 0;
  background: linear-gradient(135deg, #cf4638, #f16657);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.brand-name {
  font-size: 16px;
  font-weight: 800;
  color: #111827;
  white-space: nowrap;
}

.brand-sub {
  font-size: 11px;
  color: #9ca3af;
  white-space: nowrap;
}

.collapse-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
  flex-shrink: 0;
  transition: background 0.2s;
}

.collapse-btn:hover {
  background: #f9fafb;
}

/* Store selector */
.store-selector {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.store-selector-label {
  font-size: 10px;
  font-weight: 700;
  color: #9ca3af;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.store-dropdown-wrap {
  position: relative;
}

.store-select {
  width: 100%;
  padding: 8px 32px 8px 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: white;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  appearance: none;
  outline: none;
}

.store-select:focus {
  border-color: #cf4638;
}

.select-arrow {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
}

/* Nav */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 12px 12px;
}

.nav-section-label {
  font-size: 10px;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 12px 4px 6px;
}

/* Sidebar footer */
.sidebar-footer {
  padding: 12px;
  border-top: 1px solid #f3f4f6;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.footer-item:hover {
  background: #fef2f2;
}

.footer-icon {
  color: #ef4444;
}

.footer-label {
  font-size: 14px;
  font-weight: 500;
}

/* Main area */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* Topbar */
.topbar {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  gap: 16px;
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: #374151;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sync-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid;
}

.sync-badge.online {
  background: #f0fdf4;
  border-color: #86efac;
  color: #16a34a;
}

.sync-badge.offline {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #ea580c;
}

.sync-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.online .sync-dot {
  background: #22c55e;
}

.offline .sync-dot {
  background: #f97316;
}

.sync-spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #3b82f6;
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;
}

.sync-time {
  color: #9ca3af;
  font-weight: 400;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.icon-btn:hover {
  background: #f9fafb;
}

.badge-dot {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Page content */
.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .dashboard-shell:not(.sidebar-collapsed) .sidebar {
    transform: translateX(0);
  }

  .mobile-menu-btn {
    display: flex;
  }

  .page-content {
    padding: 16px;
  }
}
</style>
