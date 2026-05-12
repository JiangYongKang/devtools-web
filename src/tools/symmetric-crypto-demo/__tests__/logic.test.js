import { describe, expect, test } from 'vitest'
import {
    ALGORITHMS,
    ERROR_CODES,
    getAlgorithmById,
    MAX_TEXT_LENGTH,
    validateAlgorithm,
    validateCiphertext,
    validateIV,
    validateKey,
    validatePlaintext,
} from '../logic/index.js'

describe('validation functions', () => {
  describe('validateAlgorithm', () => {
    test('should return null for valid algorithm', () => {
      const result = validateAlgorithm('AES-GCM-128')
      expect(result).toBeNull()
      
      const result2 = validateAlgorithm('AES-GCM-256')
      expect(result2).toBeNull()
    })

    test('should return error for null or undefined input', () => {
      const result = validateAlgorithm(null)
      expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
      
      const result2 = validateAlgorithm(undefined)
      expect(result2.errorCode).toBe(ERROR_CODES.NULL_INPUT)
    })

    test('should return error for non-string input', () => {
      const result = validateAlgorithm(123)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_PARAMETER)
      
      const result2 = validateAlgorithm({})
      expect(result2.errorCode).toBe(ERROR_CODES.INVALID_PARAMETER)
    })

    test('should return error for invalid algorithm', () => {
      const result = validateAlgorithm('INVALID-ALGO')
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_ALGORITHM)
      
      const result2 = validateAlgorithm('AES-CBC-128')
      expect(result2.errorCode).toBe(ERROR_CODES.INVALID_ALGORITHM)
    })
  })

  describe('validateKey', () => {
    const validBase64Key16 = 'AAAAAAAAAAAAAAAAAAAAAA=='
    const validBase64Key32 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
    const validHexKey16 = '00'.repeat(16)
    const validHexKey32 = '00'.repeat(32)

    test('should return null for valid Base64 key with correct length', () => {
      const result = validateKey(validBase64Key16, 'base64', 16)
      expect(result).toBeNull()
      
      const result2 = validateKey(validBase64Key32, 'base64', 32)
      expect(result2).toBeNull()
    })

    test('should return null for valid Hex key with correct length', () => {
      const result = validateKey(validHexKey16, 'hex', 16)
      expect(result).toBeNull()
      
      const result2 = validateKey(validHexKey32, 'hex', 32)
      expect(result2).toBeNull()
    })

    test('should return error for null or undefined input', () => {
      const result = validateKey(null, 'base64', 16)
      expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
      
      const result2 = validateKey(undefined, 'base64', 16)
      expect(result2.errorCode).toBe(ERROR_CODES.NULL_INPUT)
    })

    test('should return error for non-string input', () => {
      const result = validateKey(123, 'base64', 16)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_PARAMETER)
    })

    test('should return error for empty key', () => {
      const result = validateKey('', 'base64', 16)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_KEY)
      
      const result2 = validateKey('   ', 'base64', 16)
      expect(result2.errorCode).toBe(ERROR_CODES.INVALID_KEY)
    })

    test('should return error for invalid format', () => {
      const result = validateKey('test', 'invalid-format', 16)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_INPUT_FORMAT)
    })

    test('should return error for Base64 key with wrong length', () => {
      const result = validateKey(validBase64Key16, 'base64', 32)
      expect(result.errorCode).toBe(ERROR_CODES.KEY_LENGTH_MISMATCH)
    })

    test('should return error for Hex key with wrong length', () => {
      const result = validateKey(validHexKey16, 'hex', 32)
      expect(result.errorCode).toBe(ERROR_CODES.KEY_LENGTH_MISMATCH)
    })

    test('should return error for invalid Base64', () => {
      const result = validateKey('not!valid!base64!!!', 'base64', 16)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_BASE64)
    })

    test('should return error for invalid Hex', () => {
      const result = validateKey('not!hex', 'hex', 16)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_HEX)
    })
  })

  describe('validateIV', () => {
    const validBase64IV12 = 'AAAAAAAAAAAAAAAA'
    const validHexIV12 = '00'.repeat(12)

    test('should return null for valid Base64 IV with correct length', () => {
      const result = validateIV(validBase64IV12, 'base64', 12)
      expect(result).toBeNull()
    })

    test('should return null for valid Hex IV with correct length', () => {
      const result = validateIV(validHexIV12, 'hex', 12)
      expect(result).toBeNull()
    })

    test('should return error for null or undefined input', () => {
      const result = validateIV(null, 'base64', 12)
      expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
      
      const result2 = validateIV(undefined, 'base64', 12)
      expect(result2.errorCode).toBe(ERROR_CODES.NULL_INPUT)
    })

    test('should return error for non-string input', () => {
      const result = validateIV(123, 'base64', 12)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_PARAMETER)
    })

    test('should return error for empty IV', () => {
      const result = validateIV('', 'base64', 12)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_IV)
      
      const result2 = validateIV('   ', 'base64', 12)
      expect(result2.errorCode).toBe(ERROR_CODES.INVALID_IV)
    })

    test('should return error for invalid format', () => {
      const result = validateIV('test', 'invalid-format', 12)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_INPUT_FORMAT)
    })

    test('should return error for Base64 IV with wrong length', () => {
      const result = validateIV(validBase64IV12, 'base64', 16)
      expect(result.errorCode).toBe(ERROR_CODES.IV_LENGTH_MISMATCH)
    })

    test('should return error for Hex IV with wrong length', () => {
      const result = validateIV(validHexIV12, 'hex', 16)
      expect(result.errorCode).toBe(ERROR_CODES.IV_LENGTH_MISMATCH)
    })

    test('should return error for invalid Base64', () => {
      const result = validateIV('not!valid!base64!!!', 'base64', 12)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_BASE64)
    })

    test('should return error for invalid Hex', () => {
      const result = validateIV('not!hex', 'hex', 12)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_HEX)
    })
  })

  describe('validatePlaintext', () => {
    test('should return null for valid plaintext', () => {
      const result = validatePlaintext('Hello, World!')
      expect(result).toBeNull()
      
      const result2 = validatePlaintext('这是一段中文测试')
      expect(result2).toBeNull()
    })

    test('should return error for null or undefined input', () => {
      const result = validatePlaintext(null)
      expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
      
      const result2 = validatePlaintext(undefined)
      expect(result2.errorCode).toBe(ERROR_CODES.NULL_INPUT)
    })

    test('should return error for non-string input', () => {
      const result = validatePlaintext(123)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_PARAMETER)
      
      const result2 = validatePlaintext({})
      expect(result2.errorCode).toBe(ERROR_CODES.INVALID_PARAMETER)
    })

    test('should return error for empty plaintext', () => {
      const result = validatePlaintext('')
      expect(result.errorCode).toBe(ERROR_CODES.EMPTY_PLAINTEXT)
    })

    test('should return error for plaintext that is too long', () => {
      const longText = 'a'.repeat(MAX_TEXT_LENGTH + 1)
      const result = validatePlaintext(longText)
      expect(result.errorCode).toBe(ERROR_CODES.TEXT_TOO_LONG)
    })

    test('should accept plaintext at maximum length', () => {
      const maxText = 'a'.repeat(MAX_TEXT_LENGTH)
      const result = validatePlaintext(maxText)
      expect(result).toBeNull()
    })
  })

  describe('validateCiphertext', () => {
    test('should return null for valid ciphertext', () => {
      const result = validateCiphertext('SGVsbG8=')
      expect(result).toBeNull()
      
      const result2 = validateCiphertext('48656c6c6f')
      expect(result2).toBeNull()
    })

    test('should return error for null or undefined input', () => {
      const result = validateCiphertext(null)
      expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
      
      const result2 = validateCiphertext(undefined)
      expect(result2.errorCode).toBe(ERROR_CODES.NULL_INPUT)
    })

    test('should return error for non-string input', () => {
      const result = validateCiphertext(123)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_PARAMETER)
    })

    test('should return error for empty ciphertext', () => {
      const result = validateCiphertext('')
      expect(result.errorCode).toBe(ERROR_CODES.EMPTY_CIPHERTEXT)
      
      const result2 = validateCiphertext('   ')
      expect(result2.errorCode).toBe(ERROR_CODES.EMPTY_CIPHERTEXT)
    })
  })
})

describe('getAlgorithmById', () => {
  test('should return correct algorithm for valid id', () => {
    const algo1 = getAlgorithmById('AES-GCM-128')
    expect(algo1).toBeDefined()
    expect(algo1.id).toBe('AES-GCM-128')
    expect(algo1.keyLength).toBe(16)
    
    const algo2 = getAlgorithmById('AES-GCM-256')
    expect(algo2).toBeDefined()
    expect(algo2.id).toBe('AES-GCM-256')
    expect(algo2.keyLength).toBe(32)
  })

  test('should return null for invalid id', () => {
    const result = getAlgorithmById('INVALID-ALGO')
    expect(result).toBeNull()
  })

  test('ALGORITHMS should contain expected algorithms', () => {
    expect(ALGORITHMS.length).toBe(2)
    expect(ALGORITHMS.some(a => a.id === 'AES-GCM-128')).toBe(true)
    expect(ALGORITHMS.some(a => a.id === 'AES-GCM-256')).toBe(true)
  })
})
