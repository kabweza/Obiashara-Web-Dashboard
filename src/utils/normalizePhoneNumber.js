// src/utils/normalizePhoneNumber.js

/**
 * Normalize to international format WITHOUT plus: 255XXXXXXXXX
 * Mirrors Flutter normalizePhoneNumber()
 */
export function normalizePhoneNumber(phoneNumber) {
  let p = phoneNumber.trim().replace(/\s/g, '')
  if (p.startsWith('+255')) return p.slice(1)       // +255... → 255...
  if (p.startsWith('255') && p.length === 12) return p  // already good
  if (p.startsWith('0') && p.length === 10) return '255' + p.slice(1)  // 0... → 255...
  // Fallback: if 9 digits with no prefix, assume Tanzanian
  if (/^\d{9}$/.test(p)) return '255' + p
  return p
}

/**
 * Normalize to local format: 0XXXXXXXXX
 * Mirrors Flutter normalizePhoneNumberZero()
 */
export function normalizePhoneNumberZero(phoneNumber) {
  let p = phoneNumber.trim().replace(/\s/g, '')
  if (p.startsWith('+255')) return '0' + p.slice(4)
  if (p.startsWith('255') && p.length === 12) return '0' + p.slice(3)
  if (p.startsWith('0') && p.length === 10) return p
  if (/^\d{9}$/.test(p)) return '0' + p
  return p
}

/**
 * Returns ALL phone number variants for a given input.
 * Used to try every possible format when querying Firestore or Firebase Auth.
 */
export function allPhoneVariants(phoneNumber) {
  const p = phoneNumber.trim().replace(/\s/g, '')
  const variants = new Set()

  const intl = normalizePhoneNumber(p)     // 255XXXXXXXXX
  const local = normalizePhoneNumberZero(p) // 0XXXXXXXXX

  variants.add(intl)
  variants.add(local)

  // With plus sign (some Firestore docs may store this)
  if (intl.startsWith('255')) variants.add('+' + intl)

  // Raw 9-digit suffix
  const suffix = intl.startsWith('255') ? intl.slice(3) : null
  if (suffix) variants.add(suffix)

  return [...variants]
}

/**
 * Validate Tanzanian phone number
 */
export function validateTanzanianPhone(phoneNumber) {
  const cleaned = phoneNumber.trim().replace(/\s/g, '')
  const regex = /^(\+255|255|0)[67]\d{8}$/
  // Looser fallback for non-standard but valid formats
  const loose = /^(\+255|255|0)\d{9}$/
  return regex.test(cleaned) || loose.test(cleaned)
}

export default { normalizePhoneNumber, normalizePhoneNumberZero, allPhoneVariants, validateTanzanianPhone }
