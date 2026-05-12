import { describe, test, expect } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  isHexChar,
} from '../logic/errors.js'
import {
  MAX_INPUT_SIZE,
  normalizeSeparator,
  sanitizeHexInput,
  findInvalidHexChars,
  hexToBytes,
  bytesToHex,
  bytesToUtf8,
  bytesToLatin1,
  textToBytes,
  validateHexInput,
  validateTextInput,
  hexToText,
  textToHex,
  getHexStats,
  getTextStats,
} from '../logic/converter.js'

describe('errors', () => {
  describe('ERROR_CODES', () => {
    test('should have all required error codes', () => {
      expect(ERROR_CODES.NULL_INPUT).toBe('NULL_INPUT')
      expect(ERROR_CODES.EMPTY_VALUE).toBe('EMPTY_VALUE')
      expect(ERROR_CODES.INVALID_HEX_CHAR).toBe('INVALID_HEX_CHAR')
      expect(ERROR_CODES.ODD_LENGTH).toBe('ODD_LENGTH')
      expect(ERROR_CODES.INVALID_UTF8).toBe('INVALID_UTF8')
      expect(ERROR_CODES.INPUT_TOO_LARGE).toBe('INPUT_TOO_LARGE')
      expect(ERROR_CODES.INVALID_SEPARATOR).toBe('INVALID_SEPARATOR')
    })
  })

  describe('ERROR_MESSAGES', () => {
    test('should have messages for all error codes', () => {
      Object.values(ERROR_CODES).forEach((code) => {
        expect(ERROR_MESSAGES[code]).toBeDefined()
        expect(typeof ERROR_MESSAGES[code]).toBe('string')
        expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
      })
    })
  })

  describe('getErrorMessage', () => {
    test('should return correct message for known error codes', () => {
      expect(getErrorMessage(ERROR_CODES.NULL_INPUT)).toBe(ERROR_MESSAGES[ERROR_CODES.NULL_INPUT])
      expect(getErrorMessage(ERROR_CODES.EMPTY_VALUE)).toBe(ERROR_MESSAGES[ERROR_CODES.EMPTY_VALUE])
      expect(getErrorMessage(ERROR_CODES.INVALID_HEX_CHAR)).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_HEX_CHAR])
    })

    test('should return default message for unknown error codes', () => {
      expect(getErrorMessage('UNKNOWN_ERROR')).toBe('未知错误')
    })
  })

  describe('createError', () => {
    test('should create error object with correct code and default message', () => {
      const result = createError(ERROR_CODES.INVALID_HEX_CHAR)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_HEX_CHAR)
      expect(result.errorMessage).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_HEX_CHAR])
    })

    test('should create error object with custom message', () => {
      const customMessage = 'Custom error message'
      const result = createError(ERROR_CODES.INVALID_HEX_CHAR, customMessage)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_HEX_CHAR)
      expect(result.errorMessage).toBe(customMessage)
    })

    test('should include context when provided', () => {
      const context = { invalidChars: [{ char: 'X', position: 5 }] }
      const result = createError(ERROR_CODES.INVALID_HEX_CHAR, null, context)
      expect(result.context).toBe(context)
    })
  })

  describe('isHexChar', () => {
    test('should return true for valid hex digits 0-9', () => {
      for (let i = 0; i <= 9; i++) {
        expect(isHexChar(String(i))).toBe(true)
      }
    })

    test('should return true for valid hex letters a-f', () => {
      const letters = ['a', 'b', 'c', 'd', 'e', 'f']
      letters.forEach((letter) => {
        expect(isHexChar(letter)).toBe(true)
      })
    })

    test('should return true for valid hex letters A-F', () => {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F']
      letters.forEach((letter) => {
        expect(isHexChar(letter)).toBe(true)
      })
    })

    test('should return false for invalid characters', () => {
      expect(isHexChar('g')).toBe(false)
      expect(isHexChar('G')).toBe(false)
      expect(isHexChar('z')).toBe(false)
      expect(isHexChar('X')).toBe(false)
      expect(isHexChar(' ')).toBe(false)
      expect(isHexChar('?')).toBe(false)
      expect(isHexChar('@')).toBe(false)
    })
  })
})

describe('converter utility functions', () => {
  describe('normalizeSeparator', () => {
    test('should return empty string for null or undefined', () => {
      expect(normalizeSeparator(null)).toBe('')
      expect(normalizeSeparator(undefined)).toBe('')
    })

    test('should return empty string for empty or none', () => {
      expect(normalizeSeparator('')).toBe('')
      expect(normalizeSeparator('none')).toBe('')
    })

    test('should return space for space or space keyword', () => {
      expect(normalizeSeparator(' ')).toBe(' ')
      expect(normalizeSeparator('space')).toBe(' ')
    })

    test('should return colon for colon or colon keyword', () => {
      expect(normalizeSeparator(':')).toBe(':')
      expect(normalizeSeparator('colon')).toBe(':')
    })

    test('should return custom separator as-is', () => {
      expect(normalizeSeparator('-')).toBe('-')
      expect(normalizeSeparator('_')).toBe('_')
    })
  })

  describe('sanitizeHexInput', () => {
    test('should trim whitespace', () => {
      expect(sanitizeHexInput('  48656c6c6f  ')).toBe('48656c6c6f')
    })

    test('should remove space separators when separator is space', () => {
      expect(sanitizeHexInput('48 65 6C 6C 6F', ' ')).toBe('48656C6C6F')
    })

    test('should remove colon separators when separator is colon', () => {
      expect(sanitizeHexInput('48:65:6C:6C:6F', ':')).toBe('48656C6C6F')
    })

    test('should leave input unchanged when no separator', () => {
      expect(sanitizeHexInput('48656C6C6F', '')).toBe('48656C6C6F')
    })
  })

  describe('findInvalidHexChars', () => {
    test('should return empty array for valid hex', () => {
      expect(findInvalidHexChars('48656c6c6f')).toEqual([])
    })

    test('should find single invalid character', () => {
      const result = findInvalidHexChars('48656X6c6f')
      expect(result.length).toBe(1)
      expect(result[0].char).toBe('X')
      expect(result[0].position).toBe(5)
    })

    test('should find multiple invalid characters', () => {
      const result = findInvalidHexChars('48G56X6cZf')
      expect(result.length).toBe(3)
      expect(result[0].char).toBe('G')
      expect(result[1].char).toBe('X')
      expect(result[2].char).toBe('Z')
    })

    test('should report display position (1-based)', () => {
      const result = findInvalidHexChars('X')
      expect(result[0].displayPosition).toBe(1)
    })
  })

  describe('hexToBytes', () => {
    test('should convert hex to bytes correctly', () => {
      const bytes = hexToBytes('48656c6c6f')
      expect(bytes[0]).toBe(0x48)
      expect(bytes[1]).toBe(0x65)
      expect(bytes[2]).toBe(0x6c)
      expect(bytes[3]).toBe(0x6c)
      expect(bytes[4]).toBe(0x6f)
      expect(bytes.length).toBe(5)
    })

    test('should handle uppercase hex', () => {
      const bytes = hexToBytes('48656C6C6F')
      expect(bytes[0]).toBe(0x48)
      expect(bytes.length).toBe(5)
    })
  })

  describe('bytesToHex', () => {
    test('should convert bytes to hex correctly', () => {
      const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
      expect(bytesToHex(bytes)).toBe('48656c6c6f')
    })

    test('should output uppercase when requested', () => {
      const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
      expect(bytesToHex(bytes, '', true)).toBe('48656C6C6F')
    })

    test('should add space separator', () => {
      const bytes = new Uint8Array([0x48, 0x65, 0x6c])
      expect(bytesToHex(bytes, ' ')).toBe('48 65 6c')
    })

    test('should add colon separator', () => {
      const bytes = new Uint8Array([0x48, 0x65, 0x6c])
      expect(bytesToHex(bytes, ':')).toBe('48:65:6c')
    })

    test('should pad single digit hex values', () => {
      const bytes = new Uint8Array([0x00, 0x05, 0x0a])
      expect(bytesToHex(bytes)).toBe('00050a')
    })
  })

  describe('bytesToUtf8', () => {
    test('should decode valid UTF-8 in strict mode', () => {
      const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
      expect(bytesToUtf8(bytes, 'strict')).toBe('Hello')
    })

    test('should decode Chinese UTF-8', () => {
      const bytes = new Uint8Array([0xe4, 0xbd, 0xa0, 0xe5, 0xa5, 0xbd])
      expect(bytesToUtf8(bytes, 'strict')).toBe('你好')
    })

    test('should return null for invalid UTF-8 in strict mode', () => {
      const bytes = new Uint8Array([0xc3, 0x28])
      expect(bytesToUtf8(bytes, 'strict')).toBeNull()
    })

    test('should use replacement character in replace mode', () => {
      const bytes = new Uint8Array([0xc3, 0x28])
      const result = bytesToUtf8(bytes, 'replace')
      expect(result).toContain('\ufffd')
    })
  })

  describe('bytesToLatin1', () => {
    test('should decode Latin-1 bytes', () => {
      const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
      expect(bytesToLatin1(bytes)).toBe('Hello')
    })

    test('should handle high bytes', () => {
      const bytes = new Uint8Array([0xe4, 0xe5, 0xe9])
      expect(bytesToLatin1(bytes)).toBe('\xe4\xe5\xe9')
    })
  })

  describe('textToBytes', () => {
    test('should encode ASCII as UTF-8', () => {
      const bytes = textToBytes('Hello', 'utf-8')
      expect(bytes[0]).toBe(0x48)
      expect(bytes[1]).toBe(0x65)
      expect(bytes.length).toBe(5)
    })

    test('should encode Chinese as UTF-8', () => {
      const bytes = textToBytes('你好', 'utf-8')
      expect(bytes.length).toBe(6)
    })

    test('should encode as Latin-1', () => {
      const bytes = textToBytes('Hello', 'latin1')
      expect(bytes.length).toBe(5)
    })
  })

  describe('getHexStats', () => {
    test('should calculate stats for valid hex', () => {
      const stats = getHexStats('48656c6c6f')
      expect(stats.rawLength).toBe(10)
      expect(stats.cleanLength).toBe(10)
      expect(stats.byteCount).toBe(5)
      expect(stats.invalidCharCount).toBe(0)
      expect(stats.hasInvalidChars).toBe(false)
      expect(stats.isOddLength).toBe(false)
    })

    test('should detect invalid characters', () => {
      const stats = getHexStats('48656X6c6f')
      expect(stats.invalidCharCount).toBe(1)
      expect(stats.hasInvalidChars).toBe(true)
    })

    test('should detect odd length', () => {
      const stats = getHexStats('48656c6c')
      expect(stats.isOddLength).toBe(false)
      const statsOdd = getHexStats('48656c6')
      expect(statsOdd.isOddLength).toBe(true)
    })
  })

  describe('getTextStats', () => {
    test('should calculate stats for ASCII text', () => {
      const stats = getTextStats('Hello')
      expect(stats.charCount).toBe(5)
      expect(stats.byteCount).toBe(5)
    })

    test('should calculate stats for Chinese text', () => {
      const stats = getTextStats('你好')
      expect(stats.charCount).toBe(2)
      expect(stats.byteCount).toBe(6)
    })

    test('should handle null or undefined', () => {
      expect(getTextStats(null)).toEqual({ charCount: 0, byteCount: 0 })
      expect(getTextStats(undefined)).toEqual({ charCount: 0, byteCount: 0 })
    })
  })
})

describe('validateHexInput', () => {
  test('should validate valid hex input', () => {
    const result = validateHexInput('48656c6c6f')
    expect(result.valid).toBe(true)
    expect(result.clean).toBe('48656c6c6f')
  })

  test('should return error for null input', () => {
    const result = validateHexInput(null)
    expect(result.valid).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
  })

  test('should return error for empty input', () => {
    const result = validateHexInput('')
    expect(result.valid).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.EMPTY_VALUE)
  })

  test('should return error for whitespace only input', () => {
    const result = validateHexInput('   ')
    expect(result.valid).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.EMPTY_VALUE)
  })

  test('should return error for invalid characters', () => {
    const result = validateHexInput('48656X6c6f')
    expect(result.valid).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_HEX_CHAR)
    expect(result.errorMessage).toContain('X')
  })

  test('should return error for odd length', () => {
    const result = validateHexInput('48656c6c6')
    expect(result.valid).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.ODD_LENGTH)
  })

  test('should handle space-separated input', () => {
    const result = validateHexInput('48 65 6c 6c 6f', ' ')
    expect(result.valid).toBe(true)
    expect(result.clean).toBe('48656c6c6f')
  })

  test('should handle colon-separated input', () => {
    const result = validateHexInput('48:65:6c:6c:6f', ':')
    expect(result.valid).toBe(true)
    expect(result.clean).toBe('48656c6c6f')
  })
})

describe('validateTextInput', () => {
  test('should validate valid text input', () => {
    const result = validateTextInput('Hello World')
    expect(result.valid).toBe(true)
  })

  test('should validate empty text input', () => {
    const result = validateTextInput('')
    expect(result.valid).toBe(true)
  })

  test('should return error for null input', () => {
    const result = validateTextInput(null)
    expect(result.valid).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
  })
})

describe('hexToText', () => {
  test('should convert hex to ASCII text', () => {
    const result = hexToText({ hex: '48656c6c6f20576f726c64' })
    expect(result.success).toBe(true)
    expect(result.text).toBe('Hello World')
    expect(result.byteCount).toBe(11)
    expect(result.errorCode).toBeNull()
  })

  test('should convert hex to Chinese UTF-8 text', () => {
    const result = hexToText({ hex: 'e4bda0e5a5bde4b896e7958c' })
    expect(result.success).toBe(true)
    expect(result.text).toBe('你好世界')
  })

  test('should handle space-separated hex input', () => {
    const result = hexToText({ hex: '48 65 6C 6C 6F 20 57 6F 72 6C 64', separator: ' ' })
    expect(result.success).toBe(true)
    expect(result.text).toBe('Hello World')
  })

  test('should return error for invalid characters', () => {
    const result = hexToText({ hex: '48656X6c6f' })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_HEX_CHAR)
    expect(result.context).toBeDefined()
  })

  test('should return error for odd length', () => {
    const result = hexToText({ hex: '48656c6c' })
    expect(result.success).toBe(true)
    const result2 = hexToText({ hex: '48656c6' })
    expect(result2.success).toBe(false)
    expect(result2.errorCode).toBe(ERROR_CODES.ODD_LENGTH)
  })

  test('should handle invalid UTF-8 in strict mode', () => {
    const result = hexToText({ hex: 'c328', utf8Mode: 'strict' })
    expect(result.success).toBe(true)
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_UTF8)
    expect(result.hadUtf8Error).toBe(true)
    expect(result.text).toBeDefined()
  })

  test('should use replace mode for invalid UTF-8', () => {
    const result = hexToText({ hex: 'c328', utf8Mode: 'replace' })
    expect(result.success).toBe(true)
    expect(result.errorCode).toBeNull()
    expect(result.hadUtf8Error).toBe(false)
  })

  test('should include Latin-1 view when requested', () => {
    const result = hexToText({ hex: '48656c6c6f', showLatin1: true })
    expect(result.latin1View).toBe('Hello')
  })

  test('should return error for null input', () => {
    const result = hexToText({ hex: null })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
  })

  test('should return error for empty input', () => {
    const result = hexToText({ hex: '' })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.EMPTY_VALUE)
  })
})

describe('textToHex', () => {
  test('should convert ASCII text to hex', () => {
    const result = textToHex({ text: 'Hello World' })
    expect(result.success).toBe(true)
    expect(result.hex).toBe('48656c6c6f20576f726c64')
    expect(result.byteCount).toBe(11)
    expect(result.charCount).toBe(11)
    expect(result.errorCode).toBeNull()
  })

  test('should convert Chinese text to UTF-8 hex', () => {
    const result = textToHex({ text: '你好世界' })
    expect(result.success).toBe(true)
    expect(result.byteCount).toBe(12)
    expect(result.charCount).toBe(4)
  })

  test('should output uppercase when requested', () => {
    const result = textToHex({ text: 'Hello', upperCase: true })
    expect(result.hex).toBe('48656C6C6F')
  })

  test('should add space separator', () => {
    const result = textToHex({ text: 'Hello', separator: ' ' })
    expect(result.hex).toBe('48 65 6c 6c 6f')
  })

  test('should add colon separator', () => {
    const result = textToHex({ text: 'Hello', separator: ':' })
    expect(result.hex).toBe('48:65:6c:6c:6f')
  })

  test('should handle empty text', () => {
    const result = textToHex({ text: '' })
    expect(result.success).toBe(true)
    expect(result.hex).toBe('')
    expect(result.byteCount).toBe(0)
  })

  test('should return error for null input', () => {
    const result = textToHex({ text: null })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
  })
})

describe('error code mapping', () => {
  test('should have consistent error code mapping', () => {
    Object.values(ERROR_CODES).forEach((code) => {
      const error = createError(code)
      expect(error.errorCode).toBe(code)
      expect(error.errorMessage).toBe(ERROR_MESSAGES[code])
    })
  })
})

describe('length guards', () => {
  test('MAX_INPUT_SIZE should be defined', () => {
    expect(MAX_INPUT_SIZE).toBe(1024 * 1024)
  })
})
