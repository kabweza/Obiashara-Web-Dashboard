// src/features/auth/services/authService.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail
} from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  serverTimestamp,
  arrayUnion,
  addDoc
} from 'firebase/firestore'
import { auth, db } from '../../../plugins/firebase.js'
import { normalizePhoneNumber, normalizePhoneNumberZero, allPhoneVariants } from '../../../utils/normalizePhoneNumber.js'
import { otpService } from './otpService.js'

const DEBUG = import.meta.env.DEV

function log(...args) {
  if (DEBUG) console.log('%c[AuthService]', 'color:#cf4638;font-weight:bold', ...args)
}

class AuthService {
  /**
   * Check if user exists in Firestore by trying ALL phone number variants.
   * Flutter may have stored phone numbers in different formats.
   */
  async checkUserStatus(phoneNumber) {
    try {
      const variants = allPhoneVariants(phoneNumber)
      log('Checking user status for variants:', variants)

      for (const variant of variants) {
        const q = query(
          collection(firestore, 'users'),
          where('phone_number', '==', variant),
          limit(1)
        )
        const snapshot = await getDocs(q)

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0]
          const userData = userDoc.data()
          log('User found with phone_number:', variant, '| verified:', userData.verified)
          return {
            exists: true,
            verified: userData.verified ?? false,
            userId: userDoc.id,
            hasPassword: true,
            role: userData.role,
            storedPhone: variant
          }
        }
      }

      log('No user found for any variant of:', phoneNumber)
      return { exists: false }
    } catch (e) {
      log('checkUserStatus error:', e)
      return { exists: false, error: e.message }
    }
  }

  /**
   * Register new user with Firebase Auth + Firestore
   */
  async registerUser({ name, businessName, location, phoneNumber, password, businessTypeId, businessTypeCode }) {
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber)
      const userStatus = await this.checkUserStatus(normalizedPhone)

      // Handle existing unverified user
      if (userStatus.exists && !userStatus.verified) {
        const otpResult = await otpService.sendOtp(normalizedPhone)
        return {
          success: false,
          existingUser: true,
          needsVerification: true,
          userId: userStatus.userId,
          otpSent: otpResult.success,
          message: 'Account exists but not verified. A new code has been sent.'
        }
      }

      if (userStatus.exists && userStatus.verified) {
        return {
          success: false,
          existingUser: true,
          message: 'This phone number is already registered. Please login instead.'
        }
      }

      // Create Firebase Auth user
      const email = `${normalizedPhone}@obiashara.co.tz`
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      const userId = credential.user.uid

      // Create user document in Firestore
      await setDoc(doc(db, 'users', userId), {
        user_id: userId,
        phone_number: normalizedPhone,
        name,
        role: 'owner',
        stores: [],
        created_at: serverTimestamp(),
        verified: false,
        registration_completed: false
      })

      // Create store document
      const storeData = {
        store_id: '',
        user_id: userId,
        business_name: businessName,
        location,
        workers: [],
        created_at: serverTimestamp(),
        ...(businessTypeId && { business_type_id: businessTypeId }),
        ...(businessTypeCode && { business_type_code: businessTypeCode })
      }

      const storeRef = await addDoc(collection(firestore, 'stores'), storeData)
      await updateDoc(storeRef, { store_id: storeRef.id })

      // Link store to user
      await updateDoc(doc(db, 'users', userId), {
        stores: arrayUnion(storeRef.id)
      })

      // Save to localStorage
      localStorage.setItem('userId', userId)
      localStorage.setItem('storeId', storeRef.id)
      localStorage.setItem('user_role', 'owner')

      // Send OTP
      const otpResult = await otpService.sendOtp(normalizedPhone)

      return {
        success: true,
        userId,
        storeId: storeRef.id,
        otpSent: otpResult.success,
        otpMessage: otpResult.message
      }
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        const normalizedPhone = normalizePhoneNumber(phoneNumber)
        const userStatus = await this.checkUserStatus(normalizedPhone)

        if (userStatus.exists && !userStatus.verified) {
          const otpResult = await otpService.sendOtp(normalizedPhone)
          return {
            success: false,
            existingUser: true,
            needsVerification: true,
            userId: userStatus.userId,
            otpSent: otpResult.success,
            message: 'Account exists but not verified. A new code has been sent.'
          }
        }

        return {
          success: false,
          error: e.code,
          message: 'Phone number already registered. Please login instead.'
        }
      }

      return { success: false, error: e.code ?? 'unknown', message: e.message }
    }
  }

  /**
   * Login user with phone + password.
   * Tries every possible email variant that Flutter may have registered with.
   */
  async loginUser({ phoneNumber, password }) {
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber)
      log('Login attempt for:', phoneNumber, '→ normalized:', normalizedPhone)

      // Step 1: Check Firestore first (to catch unverified users)
      const userStatus = await this.checkUserStatus(normalizedPhone)
      log('User status from Firestore:', userStatus)

      if (userStatus.exists && !userStatus.verified) {
        const otpResult = await otpService.sendOtp(normalizedPhone)
        return {
          success: false,
          needsVerification: true,
          userId: userStatus.userId,
          otpSent: otpResult.success,
          message: 'Please verify your phone number.'
        }
      }

      // Step 2: Build ALL possible email variants Flutter may have used
      // Flutter used: normalizePhoneNumberZero → which keeps "0XXXXXXXXX" format sometimes
      // OR: normalizePhoneNumber → "255XXXXXXXXX"
      // Combined with @obiashara.co.tz OR @obiashara.com
      const emailVariants = this._buildEmailVariants(phoneNumber)
      log('Trying email variants:', emailVariants.map(v => v.email))

      let userCredential = null
      let usedEmail = null
      let lastError = null

      for (const { email, isMigration } of emailVariants) {
        try {
          log('Trying email:', email)
          userCredential = await signInWithEmailAndPassword(auth, email, password)
          usedEmail = email
          log('✅ Login success with email:', email, 'needsMigration:', isMigration)
          break
        } catch (e) {
          log('❌ Failed with email:', email, '|', e.code)
          lastError = e
          // Only continue trying if it's a credential issue, not a network error
          if (!['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-email'].includes(e.code)) {
            throw e
          }
        }
      }

      if (!userCredential?.user) {
        log('All email variants failed. Last error:', lastError?.code)
        return {
          success: false,
          error: lastError?.code ?? 'unknown',
          message: this._getErrorMessage(lastError?.code)
        }
      }

      const userId = userCredential.user.uid
      const primaryEmail = `${normalizedPhone}@obiashara.co.tz`
      const needsMigration = usedEmail !== primaryEmail

      // Silently migrate old email to new domain
      if (needsMigration) {
        log('⚠️ Email migration needed:', usedEmail, '→', primaryEmail)
        this._migrateEmail(userCredential.user, usedEmail, primaryEmail, password).catch(e => log('Migration warning:', e.message))
      }

      const userDoc = await getDoc(doc(db, 'users', userId))
      if (!userDoc.exists()) {
        return { success: false, message: 'User data not found.' }
      }

      const userData = userDoc.data()

      // Double check verification
      if (!userData.verified) {
        const otpResult = await otpService.sendOtp(normalizedPhone)
        return {
          success: false,
          needsVerification: true,
          userId,
          otpSent: otpResult.success,
          message: 'Please verify your phone number.'
        }
      }

      const userRole = userData.role ?? 'owner'
      const stores = userData.stores ?? []

      localStorage.setItem('userId', userId)
      localStorage.setItem('user_role', userRole)
      if (stores.length > 0) localStorage.setItem('storeId', stores[0])

      return { success: true, userId, userRole, stores, migrated: needsMigration }
    } catch (e) {
      return { success: false, error: e.code ?? 'unknown', message: this._getErrorMessage(e.code) }
    }
  }

  /**
   * Mark user as verified after OTP confirmation
   */
  async markUserAsVerified(userId) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        verified: true,
        registration_completed: true,
        verified_at: serverTimestamp()
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * Listen to Firebase auth state changes
   */
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback)
  }

  /**
   * Get current Firebase user
   */
  getCurrentUser() {
    return auth.currentUser
  }

  /**
   * Sign out
   */
  async logout() {
    await signOut(auth)
    localStorage.clear()
  }

  /**
   * Migrate email domain from .com to .co.tz
   */
  async _migrateEmail(user, oldEmail, newEmail, password) {
    try {
      const credential = EmailAuthProvider.credential(oldEmail, password)
      await reauthenticateWithCredential(user, credential)
      await verifyBeforeUpdateEmail(user, newEmail)
      await updateDoc(doc(db, 'users', user.uid), {
        email: newEmail,
        email_migrated_at: serverTimestamp(),
        old_email: oldEmail
      })
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        await updateDoc(doc(db, 'users', user.uid), {
          email: newEmail,
          email_migrated_at: serverTimestamp()
        }).catch(() => { })
      }
    }
  }

  /**
   * Build ALL possible email variants that Flutter may have registered with.
   *
   * Flutter's normalizePhoneNumber() produces: 255XXXXXXXXX
   * Flutter's normalizePhoneNumberZero() produces: 0XXXXXXXXX
   * Domains used: @obiashara.co.tz (new), @obiashara.com (old)
   *
   * So we try all 4 combinations in order of likelihood.
   */
  _buildEmailVariants(rawPhone) {
    const clean = rawPhone.trim().replace(/\s/g, '')

    // Produce all phone number representations
    const phones = new Set()

    // 255XXXXXXXXX (international, no +)
    const intl = normalizePhoneNumber(clean)
    phones.add(intl)

    // 0XXXXXXXXX (local Tanzanian)
    const local = normalizePhoneNumberZero(clean)
    phones.add(local)

    // +255XXXXXXXXX (with plus - some apps store this)
    if (intl.startsWith('255')) phones.add('+' + intl)

    const domains = ['@obiashara.co.tz', '@obiashara.com']
    const variants = []

    for (const phone of phones) {
      for (const domain of domains) {
        variants.push({
          email: `${phone}${domain}`,
          isMigration: domain !== '@obiashara.co.tz'
        })
      }
    }

    log('Email variants built:', variants.map(v => v.email))
    return variants
  }

  _getErrorMessage(code) {
    const messages = {
      'auth/weak-password': 'Password is too weak',
      'auth/email-already-in-use': 'Phone number already registered',
      'auth/user-not-found': 'User not found. Please sign up first.',
      'auth/wrong-password': 'Incorrect password',
      'auth/invalid-email': 'Invalid phone number format',
      'auth/invalid-credential': 'Invalid phone number or password. Please check and try again.',
      'auth/user-disabled': 'This account has been disabled',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
    }
    return messages[code] ?? 'Authentication failed. Please try again.'
  }
}

export const authService = new AuthService()
export default authService
