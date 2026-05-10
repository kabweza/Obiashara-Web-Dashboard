// src/i18n/locales/en.js
export default {
  // General
  app_name: 'Obiashara',
  ok: 'OK',
  back: 'Back',
  continue: 'Continue',
  loading: 'Please wait...',
  oops: 'Oops!',
  search_hint: 'Search...',
  no_results: 'No results found',
  select: 'Select {label}',

  // Auth tabs
  login_tab: 'Login',
  signup_tab: 'Sign Up',

  // Welcome messages
  welcome_back: 'Welcome Back!',
  welcome: 'Create Account',
  sign_in_subtext: 'Sign in to your Obiashara account',
  register_subtext: 'Join thousands of businesses on Obiashara',

  // Login form
  login_phone_label: 'Phone Number',
  login_phone_hint: 'e.g. 0712345678',
  login_password_label: 'Password',
  login_password_hint: 'Enter your password',
  login_button: 'Sign In',
  forgot_password: 'Forgot Password?',
  phone_required: 'Phone number is required',
  password_required: 'Password is required',
  login_success_title: 'Welcome back!',
  login_success_message: 'You have successfully signed in.',
  login_error_message: 'Invalid phone number or password. Please try again.',

  // Signup form
  personal_information: 'Personal Information',
  business_information: 'Business Information',
  store_location: 'Store Location',
  secure_your_account: 'Secure Your Account',

  signup_full_name_label: 'Full Name',
  signup_full_name_hint: 'e.g. John Mwangi',
  signup_full_name_required: 'Full name is required',
  signup_full_name_invalid: 'Please enter your first and last name',

  signup_phone_label: 'Phone Number',
  signup_phone_hint: 'e.g. 0712345678',
  signup_phone_required: 'Phone number is required',
  signup_phone_invalid: 'Enter a valid Tanzanian phone number',

  signup_business_name_label: 'Business Name',
  signup_business_name_hint: 'e.g. Duka la Mwangi',
  signup_business_name_required: 'Business name is required',

  business_type: 'Business Type',
  select_business_type: 'Select business type',
  select_business_type_title: 'Select Business Type',

  region: 'Region',
  district: 'District',
  ward: 'Ward',
  street: 'Street (Optional)',
  sub_street: 'Sub-Street (Optional)',
  select_store_location: 'Select your store location from the options below.',
  select_location_error: 'Please select at least Region, District, and Ward.',
  select_store_location_error: 'Please select a store location.',
  address_preview: 'Selected Address',

  select_region: 'Select Region',
  select_district: 'Select District',
  select_ward: 'Select Ward',
  select_street: 'Select Street',
  select_sub_street: 'Select Sub-Street',

  signup_password_label: 'Password',
  signup_password_hint: 'At least 6 characters',
  signup_password_required: 'Password is required',
  signup_password_min_length: 'Password must be at least 6 characters',
  signup_confirm_password_label: 'Confirm Password',
  signup_confirm_password_hint: 'Re-enter your password',
  signup_confirm_password_mismatch: 'Passwords do not match',
  signup_button: 'Create Account',

  registration_failed: 'Registration failed. Please try again.',
  otp_send_failed: 'Failed to send verification code. Please try again.',

  // OTP Verification
  verify_your_number: 'Verify Your Number',
  sent_code_to: 'We sent a 6-digit code to',
  verify_code: 'Verify Code',
  resend_code: 'Resend Code',
  resend_code_in: 'Resend in {time}',
  otp_sent_success: 'Verification code sent successfully!',
  invalid_or_expired_code: 'Invalid or expired code. Please try again.',
  verification_failed: 'Verification failed. Please try again.',

  // Success
  verified: 'Verified!',
  account_verified_success: 'Your account has been verified. Welcome to Obiashara!',
  account_verified_with_free_premium: 'Your account is verified! You have been given 10 days of free premium access.',
  free_premium_ten_days: '🎁 10 Days Free Premium Access!',
  get_started: 'Get Started',

  // Dashboard
  today: 'Today', week: 'Week', month: 'Month', year: 'Year',
  custom_range: 'Custom Range', apply: 'Apply', from: 'From', to: 'To',
  total_orders: 'Total Orders', income: 'Income', expenses_tsh: 'Expenses (TZS)',
  profit: 'Profit', sales_overview: 'Sales Overview', last_7_days: 'Last 7 days',
  quick_actions: 'Quick Actions', record_sales: 'Record Sale',
  products: 'Products', quick_sale: 'Quick Sale', add_expense: 'Add Expense',
  analytics: 'Analytics', recent_sales: 'Recent Sales', view_all: 'View All',
  no_sales_yet: 'No sales recorded yet', low_stock_alert: 'Low Stock Alert',
  manage: 'Manage', select_date_range: 'Select Date Range',
  // Sales
  sales: 'Sales', records: 'records', order_id: 'Order ID', customer: 'Customer',
  date: 'Date', amount: 'Amount', payment: 'Payment', status: 'Status',
  actions: 'Actions', active: 'Active', deleted: 'Deleted',
  no_data: 'No data available', avg_order: 'Avg. Order',
  delete_sale: 'Delete Sale', delete_sale_confirm: 'This sale will be moved to trash. Stock will be returned.',
  save_sale: 'Save Sale', subtotal: 'Subtotal', total: 'Total',
  paid: 'Paid', balance: 'Balance', discount: 'Discount',
  walk_in_customer: 'Walk-in Customer', add_product: 'Add Product',
  add_custom_product: '+ Add custom item', payment_details: 'Payment Details',
  payment_method: 'Payment Method', amount_paid: 'Amount Paid',
  search_product: 'Search product by name or barcode…',
  customer_name: 'Customer Name', phone: 'Phone Number',
  // Products
  low_stock: 'Low Stock', no_products_yet: 'No products yet',
  no_deleted_products: 'No deleted products', add_first_product: '+ Add First Product',
  edit_product: 'Edit Product', product_name: 'Product Name',
  product_name_hint: 'e.g. Unga wa Sembe', type: 'Type',
  selling_price: 'Selling Price', purchase_price: 'Purchase Price',
  quantity: 'Quantity', category: 'Category', category_hint: 'e.g. Food & Drink',
  barcode: 'Barcode', description: 'Description', save_changes: 'Save Changes',
  delete_product: 'Delete Product',
  delete_product_confirm: 'This product will be moved to trash.',
  add_stock: 'Add Stock', current: 'Current', quantity_to_add: 'Quantity to Add',
  new_qty: 'New Total', cancel: 'Cancel', save: 'Save',
  // Expenses
  expenses_label: 'Expenses', expense_type: 'Expense Type',
  expense_type_hint: 'e.g. Rent, Electricity…', details: 'Details',
  no_expenses_yet: 'No expenses recorded', delete_expense: 'Delete Expense',
  delete_expense_confirm: 'This expense will be moved to trash.',
  // Analytics
  business_overview: 'Business performance overview',
  total_revenue: 'Total Revenue', total_expenses: 'Total Expenses',
  net_profit: 'Net Profit', avg_sale: 'Avg. Sale Value',
  margin: 'margin', per_order: 'per order', orders: 'orders',
  revenue_vs_expenses: 'Revenue vs Expenses', payment_methods: 'Payment Methods',
  top_products: 'Top Products by Revenue', units_sold: 'units sold',
  expense_breakdown: 'Expense Breakdown', operational_costs: 'operational costs',
  optional: 'Optional',

  // Language
  language: 'Language',
  english: 'English',
  swahili: 'Kiswahili',
}
