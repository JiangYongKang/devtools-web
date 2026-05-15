import { describe, expect, test } from 'vitest'
import {
  collectAllPlaceholders,
  simpleChecksum,
  validateChecksum,
  validateNoCircularReferences,
  validateNoEmptyKeys,
  validateNoScriptTags,
  validatePatch,
  validateTranslationSchema,
  validateVersion,
} from '../logic/validators.js'
import { ERROR_CODES } from '../logic/constants.js'

describe('validators', () => {
  describe('validateNoCircularReferences', () => {
    test('should accept simple object', () => {
      const obj = { a: 1, b: { c: 2 } }
      expect(validateNoCircularReferences(obj).valid).toBe(true)
    })

    test('should reject circular object', () => {
      const obj = { a: 1 }
      obj.self = obj
      const result = validateNoCircularReferences(obj)
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.CIRCULAR_REFERENCE)
    })

    test('should reject nested circular reference', () => {
      const obj = { a: { b: {} } }
      obj.a.b.parent = obj
      const result = validateNoCircularReferences(obj)
      expect(result.valid).toBe(false)
    })

    test('should accept arrays', () => {
      const obj = { items: [1, 2, 3] }
      expect(validateNoCircularReferences(obj).valid).toBe(true)
    })

    test('should reject circular arrays', () => {
      const arr = [1, 2]
      arr.push(arr)
      const result = validateNoCircularReferences(arr)
      expect(result.valid).toBe(false)
    })
  })

  describe('validateNoEmptyKeys', () => {
    test('should accept valid keys', () => {
      const obj = { greeting: 'Hello', nested: { key: 'value' } }
      expect(validateNoEmptyKeys(obj).valid).toBe(true)
    })

    test('should reject empty string key', () => {
      const obj = { '': 'invalid' }
      const result = validateNoEmptyKeys(obj)
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.EMPTY_KEY)
    })

    test('should reject whitespace-only key', () => {
      const obj = { '   ': 'invalid' }
      const result = validateNoEmptyKeys(obj)
      expect(result.valid).toBe(false)
    })

    test('should reject nested empty key', () => {
      const obj = { valid: 'ok', nested: { '': 'invalid' } }
      const result = validateNoEmptyKeys(obj)
      expect(result.valid).toBe(false)
    })
  })

  describe('validateNoScriptTags', () => {
    test('should accept safe strings', () => {
      const obj = { greeting: 'Hello World', text: 'This is safe' }
      expect(validateNoScriptTags(obj).valid).toBe(true)
    })

    test('should reject script tag', () => {
      const obj = { unsafe: '<script>alert(1)</script>' }
      const result = validateNoScriptTags(obj)
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.SCRIPT_TAG_DETECTED)
    })

    test('should reject script with whitespace', () => {
      const obj = { unsafe: '<   script>alert(1)</script>' }
      const result = validateNoScriptTags(obj)
      expect(result.valid).toBe(false)
    })

    test('should reject case-insensitive script', () => {
      const obj = { unsafe: '<SCRIPT>alert(1)</SCRIPT>' }
      const result = validateNoScriptTags(obj)
      expect(result.valid).toBe(false)
    })

    test('should reject nested script', () => {
      const obj = { nested: { unsafe: '<script>xss</script>' } }
      const result = validateNoScriptTags(obj)
      expect(result.valid).toBe(false)
    })

    test('should accept script-like text without tag', () => {
      const obj = { safe: 'This mentions scripting but is safe' }
      expect(validateNoScriptTags(obj).valid).toBe(true)
    })
  })

  describe('collectAllPlaceholders', () => {
    test('should collect placeholders', () => {
      const obj = {
        greeting: 'Hello, {{name}}!',
        nested: { count: '{{count}} items' },
      }
      const result = collectAllPlaceholders(obj)
      expect(result['greeting']).toContain('name')
      expect(result['nested.count']).toContain('count')
    })

    test('should handle multiple placeholders', () => {
      const obj = { multi: '{{a}}, {{b}}, {{c}}' }
      const result = collectAllPlaceholders(obj)
      expect(result['multi']).toEqual(expect.arrayContaining(['a', 'b', 'c']))
    })
  })

  describe('validateTranslationSchema', () => {
    test('should accept valid bundle', () => {
      const bundle = {
        greeting: 'Hello',
        nested: { key: 'value' },
        withParams: 'Hello, {{name}}!',
      }
      expect(validateTranslationSchema(bundle).valid).toBe(true)
    })

    test('should reject null', () => {
      const result = validateTranslationSchema(null)
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.SCHEMA_VALIDATION_FAILED)
    })

    test('should reject undefined', () => {
      const result = validateTranslationSchema(undefined)
      expect(result.valid).toBe(false)
    })

    test('should reject arrays', () => {
      const result = validateTranslationSchema([1, 2, 3])
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.SCHEMA_VALIDATION_FAILED)
    })

    test('should reject circular bundle', () => {
      const bundle = { a: 1 }
      bundle.self = bundle
      const result = validateTranslationSchema(bundle)
      expect(result.valid).toBe(false)
    })

    test('should reject bundle with script', () => {
      const bundle = { safe: 'ok', unsafe: '<script>xss</script>' }
      const result = validateTranslationSchema(bundle)
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.SCRIPT_TAG_DETECTED)
    })
  })

  describe('simpleChecksum', () => {
    test('should generate consistent checksum', () => {
      const obj = { a: 1, b: 2 }
      const checksum1 = simpleChecksum(obj)
      const checksum2 = simpleChecksum({ b: 2, a: 1 })
      expect(checksum1).toBe(checksum2)
    })

    test('should generate different checksums for different objects', () => {
      const obj1 = { a: 1 }
      const obj2 = { a: 2 }
      expect(simpleChecksum(obj1)).not.toBe(simpleChecksum(obj2))
    })

    test('should return string', () => {
      const obj = { test: 'data' }
      expect(typeof simpleChecksum(obj)).toBe('string')
      expect(simpleChecksum(obj).length).toBeGreaterThan(0)
    })
  })

  describe('validateChecksum', () => {
    test('should pass if no expected checksum', () => {
      const result = validateChecksum({ a: 1 }, null)
      expect(result.valid).toBe(true)
    })

    test('should pass if checksum matches', () => {
      const data = { a: 1, b: 2 }
      const checksum = simpleChecksum(data)
      const result = validateChecksum(data, checksum)
      expect(result.valid).toBe(true)
    })

    test('should fail if checksum does not match', () => {
      const data = { a: 1 }
      const result = validateChecksum(data, 'deadbeef')
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.CHECKSUM_MISMATCH)
    })
  })

  describe('validateVersion', () => {
    test('should pass if no incoming version', () => {
      expect(validateVersion('1.0.0', null).valid).toBe(true)
    })

    test('should pass if newer version', () => {
      expect(validateVersion('1.0.0', '2.0.0').valid).toBe(true)
    })

    test('should pass if same version', () => {
      expect(validateVersion('1.0.0', '1.0.0').valid).toBe(true)
    })

    test('should fail if older version', () => {
      const result = validateVersion('1.0.0', '0.5.0')
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.VERSION_CONFLICT)
    })
  })

  describe('validatePatch', () => {
    test('should validate valid patch', () => {
      const patch = {
        greeting: 'Hello Updated',
        __meta__: { version: '1.1.0' },
      }
      const result = validatePatch({ version: '1.0.0' }, patch)
      expect(result.valid).toBe(true)
    })

    test('should reject invalid schema', () => {
      const patch = {
        unsafe: '<script>xss</script>',
      }
      const result = validatePatch(null, patch)
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.SCRIPT_TAG_DETECTED)
    })

    test('should validate checksum when required', () => {
      const data = { greeting: 'Hello' }
      const checksum = simpleChecksum(data)
      const patch = {
        ...data,
        __meta__: { checksum },
      }
      const result = validatePatch(null, patch, { requireChecksum: true })
      expect(result.valid).toBe(true)
    })

    test('should fail checksum when required and incorrect', () => {
      const patch = {
        greeting: 'Hello',
        __meta__: { checksum: 'wrong' },
      }
      const result = validatePatch(null, patch, { requireChecksum: true })
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.CHECKSUM_MISMATCH)
    })

    test('should fail if missing checksum when required', () => {
      const patch = { greeting: 'Hello' }
      const result = validatePatch(null, patch, { requireChecksum: true })
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.CHECKSUM_MISMATCH)
    })

    test('should validate version when required', () => {
      const patch = {
        greeting: 'Hello',
        __meta__: { version: '1.1.0' },
      }
      const result = validatePatch({ version: '1.0.0' }, patch, { requireVersion: true })
      expect(result.valid).toBe(true)
    })

    test('should fail if older version', () => {
      const patch = {
        greeting: 'Hello',
        __meta__: { version: '0.5.0' },
      }
      const result = validatePatch({ version: '1.0.0' }, patch, { requireVersion: true })
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.VERSION_CONFLICT)
    })

    test('should fail if missing version when required', () => {
      const patch = { greeting: 'Hello' }
      const result = validatePatch(null, patch, { requireVersion: true })
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.VERSION_CONFLICT)
    })
  })
})
