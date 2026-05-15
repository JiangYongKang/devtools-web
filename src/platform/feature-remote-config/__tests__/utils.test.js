import { describe, expect, test } from 'vitest'
import {
  deepClone,
  getObjectDepth,
  countKeys,
  hasCircularReference,
  hasScriptField,
  validatePayload,
  truncatePayload,
  redactSensitiveData,
  compareVersions,
  isExpired,
} from '../logic/utils.js'
import { ERROR_CODES, MAX_PAYLOAD_DEPTH, MAX_PAYLOAD_KEYS } from '../logic/constants.js'

describe('utils module', () => {
  describe('deepClone', () => {
    test('should clone simple objects', () => {
      const obj = { a: 1, b: 'test', c: true }
      const cloned = deepClone(obj)

      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
    })

    test('should clone nested objects', () => {
      const obj = { a: { b: { c: 1 } } }
      const cloned = deepClone(obj)

      expect(cloned).toEqual(obj)
      expect(cloned.a).not.toBe(obj.a)
      expect(cloned.a.b).not.toBe(obj.a.b)
    })

    test('should clone arrays', () => {
      const arr = [1, 2, { a: 1 }]
      const cloned = deepClone(arr)

      expect(cloned).toEqual(arr)
      expect(cloned).not.toBe(arr)
      expect(cloned[2]).not.toBe(arr[2])
    })

    test('should handle primitives', () => {
      expect(deepClone(null)).toBe(null)
      expect(deepClone(undefined)).toBe(undefined)
      expect(deepClone(123)).toBe(123)
      expect(deepClone('test')).toBe('test')
      expect(deepClone(true)).toBe(true)
    })
  })

  describe('getObjectDepth', () => {
    test('should calculate depth of flat object', () => {
      const obj = { a: 1, b: 2 }
      expect(getObjectDepth(obj)).toBe(1)
    })

    test('should calculate depth of nested object', () => {
      const obj = { a: { b: { c: 1 } } }
      expect(getObjectDepth(obj)).toBe(3)
    })

    test('should handle arrays', () => {
      const arr = [[[1]]]
      expect(getObjectDepth(arr)).toBe(3)
    })

    test('should handle mixed structures', () => {
      const obj = { a: [{ b: { c: 1 } }] }
      expect(getObjectDepth(obj)).toBe(4)
    })

    test('should handle primitives', () => {
      expect(getObjectDepth(123)).toBe(0)
      expect(getObjectDepth('test')).toBe(0)
      expect(getObjectDepth(null)).toBe(0)
    })

    test('should handle circular references without infinite loop', () => {
      const obj = { a: 1 }
      obj.self = obj
      expect(getObjectDepth(obj)).toBe(1)
    })
  })

  describe('countKeys', () => {
    test('should count keys in flat object', () => {
      const obj = { a: 1, b: 2, c: 3 }
      expect(countKeys(obj)).toBe(3)
    })

    test('should count keys in nested objects', () => {
      const obj = { a: { b: 1, c: 2 }, d: 3 }
      expect(countKeys(obj)).toBe(4)
    })

    test('should handle arrays', () => {
      const arr = [{ a: 1 }, { b: 2 }]
      expect(countKeys(arr)).toBe(2)
    })

    test('should handle primitives', () => {
      expect(countKeys(123)).toBe(0)
      expect(countKeys('test')).toBe(0)
      expect(countKeys(null)).toBe(0)
    })

    test('should handle circular references without infinite loop', () => {
      const obj = { a: 1 }
      obj.self = obj
      expect(countKeys(obj)).toBe(2)
    })
  })

  describe('hasCircularReference', () => {
    test('should detect circular reference', () => {
      const obj = { a: 1 }
      obj.self = obj

      const result = hasCircularReference(obj)
      expect(result).not.toBe(null)
      expect(result.path).toContain('self')
    })

    test('should detect nested circular reference', () => {
      const obj = { a: { b: {} } }
      obj.a.b.ref = obj

      const result = hasCircularReference(obj)
      expect(result).not.toBe(null)
    })

    test('should not detect circular reference in normal object', () => {
      const obj = { a: { b: { c: 1 } } }
      expect(hasCircularReference(obj)).toBe(null)
    })

    test('should handle arrays with circular reference', () => {
      const arr = [1, 2]
      arr.push(arr)

      const result = hasCircularReference(arr)
      expect(result).not.toBe(null)
    })
  })

  describe('hasScriptField', () => {
    test('should detect script field', () => {
      const obj = { script: 'alert(1)' }
      const result = hasScriptField(obj)
      expect(result).not.toBe(null)
      expect(result.key).toBe('script')
    })

    test('should detect onclick field', () => {
      const obj = { onclick: 'doSomething()' }
      const result = hasScriptField(obj)
      expect(result).not.toBe(null)
    })

    test('should detect nested script field', () => {
      const obj = { a: { b: { script: 'alert(1)' } } }
      const result = hasScriptField(obj)
      expect(result).not.toBe(null)
    })

    test('should not detect normal fields', () => {
      const obj = { data: 'test', value: 123 }
      expect(hasScriptField(obj)).toBe(null)
    })

    test('should handle case insensitivity', () => {
      const obj = { Script: 'alert(1)' }
      const result = hasScriptField(obj)
      expect(result).not.toBe(null)
    })
  })

  describe('validatePayload', () => {
    test('should validate null/undefined payload', () => {
      expect(validatePayload(null).valid).toBe(true)
      expect(validatePayload(undefined).valid).toBe(true)
    })

    test('should reject non-object payload', () => {
      const result = validatePayload('not an object')
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_CONFIG)
    })

    test('should reject payload with script fields', () => {
      const result = validatePayload({ script: 'alert(1)' })
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.SCRIPT_FIELD_DETECTED)
    })

    test('should reject payload with circular references', () => {
      const obj = { a: 1 }
      obj.self = obj
      const result = validatePayload(obj)
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.CIRCULAR_REF)
    })

    test('should reject payload that is too deep', () => {
      const deepPayload = {}
      let current = deepPayload
      for (let i = 0; i < MAX_PAYLOAD_DEPTH + 2; i++) {
        current.level = {}
        current = current.level
      }

      const result = validatePayload(deepPayload)
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.PAYLOAD_TOO_DEEP)
    })

    test('should reject payload with too many keys', () => {
      const largePayload = {}
      for (let i = 0; i < MAX_PAYLOAD_KEYS + 10; i++) {
        largePayload[`key_${i}`] = i
      }

      const result = validatePayload(largePayload)
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.PAYLOAD_TOO_MANY_KEYS)
    })

    test('should validate normal payload', () => {
      const payload = {
        name: 'test',
        config: {
          enabled: true,
          timeout: 1000,
        },
      }

      const result = validatePayload(payload)
      expect(result.valid).toBe(true)
    })
  })

  describe('truncatePayload', () => {
    test('should truncate deep payload', () => {
      const deepPayload = {}
      let current = deepPayload
      for (let i = 0; i < 10; i++) {
        current.level = {}
        current = current.level
      }

      const truncated = truncatePayload(deepPayload, 3, 100)
      expect(truncated.level.level.level).toBe('[TRUNCATED]')
    })

    test('should truncate payload with too many keys', () => {
      const largePayload = {}
      for (let i = 0; i < 50; i++) {
        largePayload[`key_${i}`] = i
      }

      const truncated = truncatePayload(largePayload, 5, 10)
      expect(truncated['...']).toBe('[TRUNCATED]')
    })

    test('should mark circular references', () => {
      const obj = { a: 1 }
      obj.self = obj

      const truncated = truncatePayload(obj)
      expect(truncated.self).toBe('[CIRCULAR]')
    })

    test('should handle primitives', () => {
      expect(truncatePayload(null)).toBe(null)
      expect(truncatePayload(123)).toBe(123)
      expect(truncatePayload('test')).toBe('test')
    })
  })

  describe('redactSensitiveData', () => {
    test('should redact token fields', () => {
      const obj = { token: 'secret_token_123', normal: 'value' }
      const redacted = redactSensitiveData(obj)

      expect(redacted.token).toBe('[REDACTED]')
      expect(redacted.normal).toBe('value')
    })

    test('should redact secret fields', () => {
      const obj = { secret: 'top_secret', normal: 'value' }
      const redacted = redactSensitiveData(obj)

      expect(redacted.secret).toBe('[REDACTED]')
    })

    test('should redact password fields', () => {
      const obj = { password: 'admin123', normal: 'value' }
      const redacted = redactSensitiveData(obj)

      expect(redacted.password).toBe('[REDACTED]')
    })

    test('should redact nested sensitive fields', () => {
      const obj = {
        config: {
          apiToken: 'secret',
          nested: {
            secretKey: 'top_secret',
          },
        },
      }
      const redacted = redactSensitiveData(obj)

      expect(redacted.config.apiToken).toBe('[REDACTED]')
      expect(redacted.config.nested.secretKey).toBe('[REDACTED]')
    })

    test('should handle arrays', () => {
      const arr = [{ token: 'secret' }, { normal: 'value' }]
      const redacted = redactSensitiveData(arr)

      expect(redacted[0].token).toBe('[REDACTED]')
      expect(redacted[1].normal).toBe('value')
    })

    test('should be case insensitive', () => {
      const obj = {
        TOKEN: 'secret1',
        Token: 'secret2',
        SECRET: 'secret3',
      }
      const redacted = redactSensitiveData(obj)

      expect(redacted.TOKEN).toBe('[REDACTED]')
      expect(redacted.Token).toBe('[REDACTED]')
      expect(redacted.SECRET).toBe('[REDACTED]')
    })
  })

  describe('compareVersions', () => {
    test('should compare numeric versions', () => {
      expect(compareVersions(2, 1)).toBeGreaterThan(0)
      expect(compareVersions(1, 2)).toBeLessThan(0)
      expect(compareVersions(1, 1)).toBe(0)
    })

    test('should compare string versions', () => {
      expect(compareVersions('2', '1')).toBeGreaterThan(0)
      expect(compareVersions('1', '2')).toBeLessThan(0)
      expect(compareVersions('1', '1')).toBe(0)
    })

    test('should compare mixed types', () => {
      expect(compareVersions('2', 1)).toBeGreaterThan(0)
      expect(compareVersions(1, '2')).toBeLessThan(0)
    })

    test('should handle undefined/null', () => {
      expect(compareVersions(undefined, 1)).toBeLessThan(0)
      expect(compareVersions(1, null)).toBeGreaterThan(0)
      expect(compareVersions(undefined, null)).toBeLessThan(0)
    })

    test('should handle semantic version strings', () => {
      expect(compareVersions('1.2.0', '1.1.9')).toBeGreaterThan(0)
      expect(compareVersions('1.1.9', '1.2.0')).toBeLessThan(0)
    })
  })

  describe('isExpired', () => {
    test('should return false for null/undefined', () => {
      expect(isExpired(null)).toBe(false)
      expect(isExpired(undefined)).toBe(false)
      expect(isExpired(0)).toBe(false)
    })

    test('should return true for past timestamp', () => {
      const past = Date.now() - 1000
      expect(isExpired(past)).toBe(true)
    })

    test('should return false for future timestamp', () => {
      const future = Date.now() + 1000
      expect(isExpired(future)).toBe(false)
    })
  })
})
