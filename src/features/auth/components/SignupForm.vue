<template>
  <div>
    <!-- Progress bar -->
    <div class="flex gap-2 mb-6">
      <div
        v-for="i in 4"
        :key="i"
        class="h-1.5 flex-1 rounded-full transition-all duration-500"
        :class="i <= currentStep + 1 ? 'bg-gradient-to-r from-primary to-light' : 'bg-gray-200'"
      />
    </div>

    <!-- Step back button -->
    <button
      v-if="currentStep > 0"
      type="button"
      class="flex items-center gap-1.5 text-primary text-sm font-semibold mb-4 hover:opacity-70 transition-opacity"
      @click="prevStep"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      {{ t('back') }}
    </button>

    <!-- Step 1: Personal Info -->
    <div v-if="currentStep === 0" class="space-y-4 animate-slide-in">
      <h3 class="step-title">{{ t('personal_information') }}</h3>
      <InputField
        v-model="form.fullName"
        :label="t('signup_full_name_label')"
        :placeholder="t('signup_full_name_hint')"
        :error="errors.fullName"
        icon="user"
        @blur="validateFullName"
        @input="errors.fullName = ''"
      />
      <InputField
        v-model="form.phone"
        :label="t('signup_phone_label')"
        :placeholder="t('signup_phone_hint')"
        :error="errors.phone"
        type="tel"
        icon="phone"
        @blur="validatePhone"
        @input="errors.phone = ''"
      />
      <NextBtn :label="t('continue')" @click="submitStep1" />
    </div>

    <!-- Step 2: Business Info -->
    <div v-else-if="currentStep === 1" class="space-y-4 animate-slide-in">
      <h3 class="step-title">{{ t('business_information') }}</h3>
      <InputField
        v-model="form.businessName"
        :label="t('signup_business_name_label')"
        :placeholder="t('signup_business_name_hint')"
        :error="errors.businessName"
        icon="store"
        @blur="validateBusinessName"
        @input="errors.businessName = ''"
      />
      <!-- Business Type Selector -->
      <div>
        <label class="input-label">{{ t('business_type') }}</label>
        <button
          type="button"
          class="selector-btn"
          @click="showBusinessTypes = true"
        >
          <div class="flex items-center gap-3">
            <div class="icon-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-primary">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
            <div class="text-left">
              <p class="text-xs font-bold text-primary">{{ t('business_type') }}</p>
              <p class="text-sm font-semibold" :class="form.businessType ? 'text-gray-800' : 'text-gray-400'">
                {{ form.businessType?.nameEn ?? t('select_business_type') }}
              </p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4 text-primary shrink-0">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
      <NextBtn :label="t('continue')" @click="submitStep2" />
    </div>

    <!-- Step 3: Location -->
    <div v-else-if="currentStep === 2" class="space-y-3 animate-slide-in">
      <h3 class="step-title">{{ t('store_location') }}</h3>
      <p class="text-xs text-gray-500 -mt-2">{{ t('select_store_location') }}</p>

      <LocationSelector :label="t('region')" icon="globe" :value="form.region?.name" @click="activeLocationPicker = 'region'" />
      <LocationSelector :label="t('district')" icon="city" :value="form.district?.name" :enabled="!!form.region" @click="form.region && (activeLocationPicker = 'district')" />
      <LocationSelector :label="t('ward')" icon="map" :value="form.ward?.name" :enabled="!!form.district" @click="form.district && (activeLocationPicker = 'ward')" />

      <!-- Address preview -->
      <div v-if="form.region" class="address-preview">
        <div class="flex items-center gap-2 mb-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-green-700">
            <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clip-rule="evenodd" />
          </svg>
          <span class="text-xs font-bold text-green-800">{{ t('address_preview') }}</span>
        </div>
        <p class="text-xs font-semibold text-green-700 leading-relaxed">{{ fullAddress }}</p>
      </div>

      <NextBtn :label="t('continue')" @click="submitStep3" />
    </div>

    <!-- Step 4: Password -->
    <div v-else-if="currentStep === 3" class="space-y-4 animate-slide-in">
      <h3 class="step-title">{{ t('secure_your_account') }}</h3>
      <PasswordField
        v-model="form.password"
        :label="t('signup_password_label')"
        :placeholder="t('signup_password_hint')"
        :error="errors.password"
        @blur="validatePassword"
        @input="errors.password = ''"
      />
      <PasswordField
        v-model="form.confirmPassword"
        :label="t('signup_confirm_password_label')"
        :placeholder="t('signup_confirm_password_hint')"
        :error="errors.confirmPassword"
        @blur="validateConfirmPassword"
        @input="errors.confirmPassword = ''"
      />
      <button
        type="button"
        class="submit-btn"
        :disabled="isLoading"
        @click="handleSubmit"
      >
        <span v-if="!isLoading" class="flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          {{ t('signup_button') }}
        </span>
        <span v-else class="flex items-center justify-center gap-2">
          <div class="spinner" />{{ t('loading') }}
        </span>
      </button>
    </div>

    <!-- Business Types Modal -->
    <Teleport to="body">
      <BottomSheet v-if="showBusinessTypes" :title="t('select_business_type_title')" @close="showBusinessTypes = false">
        <div v-for="type in businessTypes" :key="type.id">
          <button
            type="button"
            class="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-red-50 transition-colors text-left"
            @click="selectBusinessType(type)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-primary shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
            <div>
              <p class="font-semibold text-gray-800 text-sm">{{ type.nameEn }}</p>
              <p class="text-xs text-gray-500">{{ type.nameSw }}</p>
            </div>
          </button>
        </div>
      </BottomSheet>

      <!-- Location Picker -->
      <BottomSheet
        v-if="activeLocationPicker"
        :title="locationPickerTitle"
        :searchable="true"
        @close="activeLocationPicker = null"
      >
        <div v-for="item in filteredLocationItems" :key="item.id">
          <button
            type="button"
            class="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-red-50 transition-colors text-left"
            @click="selectLocationItem(item)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-primary shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span class="font-semibold text-gray-800 text-sm">{{ item.name }}</span>
          </button>
        </div>
        <p v-if="filteredLocationItems.length === 0" class="text-center text-gray-400 py-8 text-sm">{{ t('no_results') }}</p>
      </BottomSheet>
    </Teleport>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { validateTanzanianPhone } from '../../../utils/normalizePhoneNumber.js'
import InputField from './ui/InputField.vue'
import PasswordField from './ui/PasswordField.vue'
import NextBtn from './ui/NextBtn.vue'
import LocationSelector from './ui/LocationSelector.vue'
import BottomSheet from './ui/BottomSheet.vue'
import { BUSINESS_TYPES, TANZANIA_REGIONS } from '../../../utils/staticData.js'

const emit = defineEmits(['submit'])
const props = defineProps({ isLoading: Boolean })
const { t } = useI18n()

const currentStep = ref(0)
const showBusinessTypes = ref(false)
const activeLocationPicker = ref(null)
const locationSearch = ref('')

const form = reactive({
  fullName: '', phone: '', businessName: '', businessType: null,
  region: null, district: null, ward: null,
  password: '', confirmPassword: ''
})
const errors = reactive({
  fullName: '', phone: '', businessName: '', password: '', confirmPassword: ''
})

const businessTypes = BUSINESS_TYPES
const fullAddress = computed(() => {
  const parts = [form.ward?.name, form.district?.name, form.region?.name].filter(Boolean)
  return parts.join(', ')
})

// Location data
const locationItems = computed(() => {
  if (activeLocationPicker.value === 'region') return TANZANIA_REGIONS
  if (activeLocationPicker.value === 'district') return form.region?.districts ?? []
  if (activeLocationPicker.value === 'ward') return form.district?.wards ?? []
  return []
})

const filteredLocationItems = computed(() => {
  if (!locationSearch.value) return locationItems.value
  return locationItems.value.filter(i => i.name.toLowerCase().includes(locationSearch.value.toLowerCase()))
})

const locationPickerTitle = computed(() => {
  if (activeLocationPicker.value === 'region') return t('select_region')
  if (activeLocationPicker.value === 'district') return t('select_district')
  return t('select_ward')
})

function selectLocationItem(item) {
  if (activeLocationPicker.value === 'region') {
    form.region = item; form.district = null; form.ward = null
  } else if (activeLocationPicker.value === 'district') {
    form.district = item; form.ward = null
  } else {
    form.ward = item
  }
  activeLocationPicker.value = null
  locationSearch.value = ''
}

function selectBusinessType(type) {
  form.businessType = type
  showBusinessTypes.value = false
}

function validateFullName() {
  if (!form.fullName.trim()) { errors.fullName = t('signup_full_name_required'); return false }
  if (form.fullName.trim().split(/\s+/).length < 2) { errors.fullName = t('signup_full_name_invalid'); return false }
  errors.fullName = ''; return true
}
function validatePhone() {
  if (!form.phone.trim()) { errors.phone = t('signup_phone_required'); return false }
  if (!validateTanzanianPhone(form.phone)) { errors.phone = t('signup_phone_invalid'); return false }
  errors.phone = ''; return true
}
function validateBusinessName() {
  if (!form.businessName.trim()) { errors.businessName = t('signup_business_name_required'); return false }
  errors.businessName = ''; return true
}
function validatePassword() {
  if (!form.password) { errors.password = t('signup_password_required'); return false }
  if (form.password.length < 6) { errors.password = t('signup_password_min_length'); return false }
  errors.password = ''; return true
}
function validateConfirmPassword() {
  if (form.confirmPassword !== form.password) { errors.confirmPassword = t('signup_confirm_password_mismatch'); return false }
  errors.confirmPassword = ''; return true
}

function submitStep1() { if (validateFullName() && validatePhone()) currentStep.value = 1 }
function submitStep2() { if (validateBusinessName()) currentStep.value = 2 }
function submitStep3() {
  if (!form.region || !form.district || !form.ward) {
    alert(t('select_location_error')); return
  }
  currentStep.value = 3
}
function prevStep() { if (currentStep.value > 0) currentStep.value-- }

function handleSubmit() {
  if (validatePassword() && validateConfirmPassword()) {
    emit('submit', {
      fullName: form.fullName,
      phoneNumber: form.phone,
      businessName: form.businessName,
      businessTypeId: form.businessType?.id,
      businessTypeCode: form.businessType?.code,
      location: fullAddress.value,
      password: form.password
    })
  }
}
</script>

<style scoped>
.step-title { @apply text-lg font-bold text-gray-800 mb-1; }
.input-label { @apply text-sm font-bold tracking-wide; color: #cf4638; }
.selector-btn {
  @apply w-full flex items-center justify-between bg-white border-2 border-gray-200 rounded-2xl p-3.5 hover:border-primary transition-all duration-200;
}
.icon-wrap { @apply w-9 h-9 rounded-xl flex items-center justify-center shrink-0; background: rgba(207,70,56,0.1); }
.address-preview { @apply bg-green-50 border border-green-200 rounded-2xl p-3; }
.submit-btn {
  @apply w-full h-14 rounded-2xl font-bold text-white text-base tracking-wide transition-all duration-200 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed;
  background: linear-gradient(135deg, #cf4638 0%, #f16657 100%);
  box-shadow: 0 8px 25px rgba(207,70,56,0.4);
}
.submit-btn:not(:disabled):hover { transform: translateY(-1px); }
.spinner { @apply w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin; }
.text-primary { color: #cf4638; }
.border-primary { border-color: #cf4638; }
.hover\:border-primary:hover { border-color: #cf4638; }

@keyframes slide-in {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
.animate-slide-in { animation: slide-in 0.3s ease-out; }
</style>
