import { describe, expect, test } from 'vitest'
import {
  isSensitiveKey,
  getMatchedPattern,
  validateStorageOperation,
  redactValueForKey,
  redactObject,
} from '../logic/storageProtection.js'
import { ERROR_CODES } from '../logic/constants.js'

describe('storage protection', () => {
  describe('isSensitiveKey', () => {
    test('should return false for null/undefined/empty', () => {
      expect(isSensitiveKey(null)).toBe(false)
      expect(isSensitiveKey(undefined)).toBe(false)
      expect(isSensitiveKey('')).toBe(false)
      expect(isSensitiveKey(123)).toBe(false)
    })

    test('should detect password-related keys', () => {
      expect(isSensitiveKey('password')).toBe(true)
      expect(isSensitiveKey('PASSWORD')).toBe(true)
      expect(isSensitiveKey('Password')).toBe(true)
      expect(isSensitiveKey('userPassword')).toBe(true)
      expect(isSensitiveKey('passwordHash')).toBe(true)
    })

    test('should detect token-related keys', () => {
      expect(isSensitiveKey('token')).toBe(true)
      expect(isSensitiveKey('authToken')).toBe(true)
      expect(isSensitiveKey('access_token')).toBe(true)
      expect(isSensitiveKey('refreshToken')).toBe(true)
    })

    test('should detect secret-related keys', () => {
      expect(isSensitiveKey('secret')).toBe(true)
      expect(isSensitiveKey('clientSecret')).toBe(true)
      expect(isSensitiveKey('api_secret')).toBe(true)
    })

    test('should detect API key patterns', () => {
      expect(isSensitiveKey('apiKey')).toBe(true)
      expect(isSensitiveKey('api_key')).toBe(true)
      expect(isSensitiveKey('API_KEY')).toBe(true)
      expect(isSensitiveKey('accessKey')).toBe(true)
      expect(isSensitiveKey('privateKey')).toBe(true)
    })

    test('should detect JWT patterns', () => {
      expect(isSensitiveKey('jwt')).toBe(true)
      expect(isSensitiveKey('idToken')).toBe(true)
      expect(isSensitiveKey('bearerToken')).toBe(true)
    })

    test('should detect recovery code patterns', () => {
      expect(isSensitiveKey('recoveryCode')).toBe(true)
      expect(isSensitiveKey('recovery_code')).toBe(true)
    })

    test('should detect OTP patterns', () => {
      expect(isSensitiveKey('otp')).toBe(true)
      expect(isSensitiveKey('totp')).toBe(true)
      expect(isSensitiveKey('hotp')).toBe(true)
    })

    test('should return false for non-sensitive keys', () => {
      expect(isSensitiveKey('username')).toBe(false)
      expect(isSensitiveKey('email')).toBe(false)
      expect(isSensitiveKey('theme')).toBe(false)
      expect(isSensitiveKey('language')).toBe(false)
      expect(isSensitiveKey('notifications_enabled')).toBe(false)
    })
  })

  describe('getMatchedPattern', () => {
    test('should return the matched pattern string', () => {
      const pattern = getMatchedPattern('userPassword')
      expect(pattern).toContain('password')
    })

    test('should return null for non-sensitive keys', () => {
      expect(getMatchedPattern('username')).toBeNull()
    })
  })

  describe('validateStorageOperation', () => {
    test('should reject sensitive keys', () => {
      const result = validateStorageOperation('password', 'secret123')
      expect(result.allowed).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(ERROR_CODES.SENSITIVE_KEY_REJECTED)
    })

    test('should allow non-sensitive keys', () => {
      const result = validateStorageOperation('username', 'john')
      expect(result.allowed).toBe(true)
      expect(result.error).toBeNull()
    })

    test('should reject values exceeding max length', () => {
      const longValue = 'x'.repeat(10000)
      const result = validateStorageOperation('username', longValue, { maxLength: 1000 })
      expect(result.allowed).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.CONTENT_TOO_LARGE)
    })

    test('should allow values within max length', () => {
      const value = 'x'.repeat(100)
      const result = validateStorageOperation('username', value, { maxLength: 1000 })
      expect(result.allowed).toBe(true)
    })

    test('should skip length check when checkLength is false', () => {
      const longValue = 'x'.repeat(10000)
      const result = validateStorageOperation('username', longValue, { checkLength: false, maxLength: 1000 })
      expect(result.allowed).toBe(true)
    })
  })

  describe('redactValueForKey', () => {
    test('should redact sensitive key values', () => {
      expect(redactValueForKey('password', 'secret123')).toBe('[REDACTED]')
      expect(redactValueForKey('token', 'abc123')).toBe('[REDACTED]')
    })

    test('should not redact non-sensitive key values', () => {
      expect(redactValueForKey('username', 'john')).toBe('john')
      expect(redactValueForKey('email', 'test@example.com')).toBe('test@example.com')
    })

    test('should use custom placeholder', () => {
      expect(redactValueForKey('password', 'secret123', '***')).toBe('***')
    })
  })

  describe('redactObject', () => {
    test('should redact sensitive fields in an object', () => {
      const obj = {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com',
        token: 'abc123',
      }

      const redacted = redactObject(obj)
      expect(redacted.username).toBe('john')
      expect(redacted.email).toBe('john@example.com')
      expect(redacted.password).toBe('[REDACTED]')
      expect(redacted.token).toBe('[REDACTED]')
    })

    test('should handle null/undefined gracefully', () => {
      expect(redactObject(null)).toBeNull()
      expect(redactObject(undefined)).toBeUndefined()
    })

    test('should handle primitive values', () => {
      expect(redactObject('string')).toBe('string')
      expect(redactObject(123)).toBe(123)
    })

    test('should use custom placeholder', () => {
      const obj = { password: 'secret' }
      const redacted = redactObject(obj, 'HIDDEN')
      expect(redacted.password).toBe('HIDDEN')
    })
  })
})
