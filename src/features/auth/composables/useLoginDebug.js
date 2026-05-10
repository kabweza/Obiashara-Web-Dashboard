// src/features/auth/composables/useLoginDebug.js
/**
 * Debug helper — only runs in development mode.
 * Call runDiagnostic(phone) from the browser console or temporarily
 * from LoginForm to understand exactly what Firebase sees.
 *
 * Usage in browser console:
 *   import('/src/features/auth/composables/useLoginDebug.js').then(m => m.runDiagnostic('0712345678'))
 */

import { signInWithEmailAndPassword } from 'firebase/auth'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { auth, db } from '../../../plugins/firebase.js'
import { normalizePhoneNumber, normalizePhoneNumberZero, allPhoneVariants } from '../../../utils/normalizePhoneNumber.js'

export async function runDiagnostic(rawPhone, password = '') {
  if (!import.meta.env.DEV) return

  console.group('%c🔍 Login Diagnostic', 'color:#cf4638;font-size:16px;font-weight:bold')
  console.log('Raw input:', rawPhone)

  const intl = normalizePhoneNumber(rawPhone)
  const local = normalizePhoneNumberZero(rawPhone)
  const variants = allPhoneVariants(rawPhone)

  console.log('Normalized (255...):', intl)
  console.log('Normalized (0...):', local)
  console.log('All variants:', variants)

  // --- Firestore check ---
  console.group('📂 Firestore check (phone_number field)')
  for (const v of variants) {
    try {
      const q = query(collection(firestore, 'users'), where('phone_number', '==', v), limit(1))
      const snap = await getDocs(q)
      if (!snap.empty) {
        const d = snap.docs[0].data()
        console.log(`%c✅ FOUND with "${v}"`, 'color:green;font-weight:bold')
        console.log('  userId:', snap.docs[0].id)
        console.log('  role:', d.role)
        console.log('  verified:', d.verified)
        console.log('  stored phone_number:', d.phone_number)
      } else {
        console.log(`❌ Not found with "${v}"`)
      }
    } catch (e) {
      console.warn(`Error querying "${v}":`, e.message)
    }
  }
  console.groupEnd()

  // --- Firebase Auth check (only if password provided) ---
  if (password) {
    const domains = ['@obiashara.co.tz', '@obiashara.com']
    const emailCandidates = []
    for (const v of variants) {
      for (const d of domains) emailCandidates.push(`${v}${d}`)
    }

    console.group('🔐 Firebase Auth check')
    for (const email of emailCandidates) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password)
        console.log(`%c✅ AUTH SUCCESS with: ${email}`, 'color:green;font-weight:bold')
        console.log('  UID:', cred.user.uid)
        await auth.signOut()
        break
      } catch (e) {
        console.log(`❌ Auth failed "${email}": ${e.code}`)
      }
    }
    console.groupEnd()
  } else {
    console.log('ℹ️ Pass a password as second argument to also test Firebase Auth')
    console.log('   runDiagnostic("0712345678", "mypassword")')
  }

  console.groupEnd()
}

// Expose globally for easy console access in dev
if (import.meta.env.DEV) {
  window.__obDiag = runDiagnostic
  console.log('%c💡 Login diagnostic available: window.__obDiag("0712345678", "password")', 'color:#cf4638')
}
