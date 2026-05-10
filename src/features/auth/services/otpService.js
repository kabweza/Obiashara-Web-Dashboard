// src/features/auth/services/otpService.js
/**
 * OTP Service for web - mirrors Flutter OtpManager
 * Stores OTP in localStorage with expiry, rate limiting, and attempt tracking.
 *
 * NOTE: In production, OTP generation and SMS delivery should be handled server-side
 * (Cloud Functions). This service manages the client-side state and calls your backend.
 */

const OTP_STORAGE_KEY = 'otp_data'
const OTP_ATTEMPTS_KEY = 'otp_attempts'
const OTP_EXPIRY_MINUTES = 5
const MAX_RESEND_ATTEMPTS = 3
const COOLDOWN_MINUTES = 30

class OtpService {
  /** Generate random 6-digit OTP (for dev/testing - use server-side in production) */
  _generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  _formatPhone(phoneNumber) {
    return phoneNumber.startsWith('+') ? phoneNumber.slice(1) : phoneNumber
  }

  _getAttemptsData() {
    try {
      return JSON.parse(localStorage.getItem(OTP_ATTEMPTS_KEY) || '{}')
    } catch {
      return {}
    }
  }

  _saveAttemptsData(data) {
    localStorage.setItem(OTP_ATTEMPTS_KEY, JSON.stringify(data))
  }

  _getUserAttempts(phone) {
    const all = this._getAttemptsData()
    if (!all[phone]) {
      all[phone] = { failedAttempts: 0, resendCount: 0, blockedUntil: null }
    }
    return { all, user: all[phone] }
  }

  async isBlocked(phoneNumber) {
    const phone = this._formatPhone(phoneNumber)
    const { all, user } = this._getUserAttempts(phone)

    if (user.blockedUntil) {
      const blockedUntil = new Date(user.blockedUntil)
      if (new Date() < blockedUntil) return true

      // Cooldown over - reset
      all[phone] = { failedAttempts: 0, resendCount: 0, blockedUntil: null }
      this._saveAttemptsData(all)
    }
    return false
  }

  getRemainingBlockTime(phoneNumber) {
    const phone = this._formatPhone(phoneNumber)
    const { user } = this._getUserAttempts(phone)
    if (!user.blockedUntil) return 0
    const diff = new Date(user.blockedUntil) - new Date()
    return diff > 0 ? Math.ceil(diff / 60000) : 0
  }

  getRemainingResendAttempts(phoneNumber) {
    const phone = this._formatPhone(phoneNumber)
    const { user } = this._getUserAttempts(phone)
    return MAX_RESEND_ATTEMPTS - user.resendCount
  }

  /**
   * Send OTP - calls your backend API or Cloud Function.
   * Falls back to console log in development.
   */
  async sendOtp(phoneNumber) {
    try {
      const phone = this._formatPhone(phoneNumber)

      if (await this.isBlocked(phone)) {
        const remaining = this.getRemainingBlockTime(phone)
        return { success: false, message: `Too many attempts. Try again in ${remaining} minutes.`, remainingTime: remaining }
      }

      const { all, user } = this._getUserAttempts(phone)

      if (user.resendCount >= MAX_RESEND_ATTEMPTS) {
        const blockedUntil = new Date(Date.now() + COOLDOWN_MINUTES * 60000)
        user.blockedUntil = blockedUntil.toISOString()
        this._saveAttemptsData(all)
        return { success: false, message: `Maximum resend attempts reached. Try again in ${COOLDOWN_MINUTES} minutes.`, remainingTime: COOLDOWN_MINUTES }
      }

      const otp = this._generateOtp()
      const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000)

      const otpData = { phoneNumber: phone, otp, expiryTime: expiry.toISOString(), attempts: 0 }
      localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otpData))

      // -------------------------------------------------------
      // PRODUCTION: Call your Cloud Function or backend API here
      // Example:
      //   const resp = await fetch('/api/send-otp', {
      //     method: 'POST',
      //     body: JSON.stringify({ phone, message: `Your OTP is ${otp}` })
      //   })
      // -------------------------------------------------------

      // DEV: Log OTP to console
      if (import.meta.env.DEV) {
        console.log(`%c📱 OTP for ${phone}: ${otp}`, 'color: #cf4638; font-size: 18px; font-weight: bold;')
      }

      // Increment resend count
      user.resendCount = (user.resendCount || 0) + 1
      this._saveAttemptsData(all)

      const remainingAttempts = MAX_RESEND_ATTEMPTS - user.resendCount
      return { success: true, message: `OTP sent. Remaining resend attempts: ${remainingAttempts}`, remainingAttempts }
    } catch (e) {
      return { success: false, message: `Failed to send OTP: ${e.message}` }
    }
  }

  /** Verify submitted OTP against stored OTP */
  async verifyOtp(phoneNumber, otp) {
    try {
      const phone = this._formatPhone(phoneNumber)

      if (await this.isBlocked(phone)) {
        const remaining = this.getRemainingBlockTime(phone)
        return { success: false, message: `Number is temporarily blocked. Try again in ${remaining} minutes.` }
      }

      const stored = localStorage.getItem(OTP_STORAGE_KEY)
      if (!stored) return { success: false, message: 'No active OTP found. Please request a new one.' }

      const otpData = JSON.parse(stored)

      if (otpData.phoneNumber !== phone) {
        return { success: false, message: 'Phone number mismatch. Please request a new OTP.' }
      }

      if (new Date() > new Date(otpData.expiryTime)) {
        localStorage.removeItem(OTP_STORAGE_KEY)
        return { success: false, message: 'OTP has expired. Please request a new one.' }
      }

      if (otpData.otp !== otp) {
        // Track failed attempt
        otpData.attempts = (otpData.attempts || 0) + 1
        localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otpData))

        const { all, user } = this._getUserAttempts(phone)
        user.failedAttempts = (user.failedAttempts || 0) + 1

        if (user.failedAttempts >= 5) {
          user.blockedUntil = new Date(Date.now() + COOLDOWN_MINUTES * 60000).toISOString()
          this._saveAttemptsData(all)
          return { success: false, message: `Too many failed attempts. Blocked for ${COOLDOWN_MINUTES} minutes.` }
        }

        this._saveAttemptsData(all)
        return { success: false, message: 'Invalid OTP. Please try again.' }
      }

      // ✅ OTP matched - clear storage and reset counters
      localStorage.removeItem(OTP_STORAGE_KEY)

      const { all, user } = this._getUserAttempts(phone)
      user.failedAttempts = 0
      user.resendCount = 0
      this._saveAttemptsData(all)

      return { success: true, message: 'OTP verified successfully.' }
    } catch (e) {
      return { success: false, message: `Error verifying OTP: ${e.message}` }
    }
  }

  resetAttempts(phoneNumber) {
    const phone = this._formatPhone(phoneNumber)
    const all = this._getAttemptsData()
    all[phone] = { failedAttempts: 0, resendCount: 0, blockedUntil: null }
    this._saveAttemptsData(all)
  }
}

export const otpService = new OtpService()
export default otpService
