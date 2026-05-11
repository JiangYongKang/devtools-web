import { describe, test, expect } from 'vitest'
import {
  VERSION,
  ERROR_CODES,
  ERROR_MESSAGES,
  MAX_INPUT_SIZE_BYTES,
  DEFAULT_MAX_NESTING_DEPTH,
  INDENT_STYLES,
  INDENT_WIDTHS,
  QUOTE_STYLES,
  INLINE_STYLES,
  KEY_ORDERS,
  getErrorMessage,
  getByteSize,
  formatBytes,
  escapeHtml,
  validateIndent,
  normalizeOptions,
  createSuccessResult,
  createErrorResult,
  calculateNestingDepth,
  validateMaxNestingDepth,
  extractLineColumnFromYamlError,
  extractLineColumnFromJsonError,
  classifyYamlError,
  formatErrorLocation,
  validateInput,
} from '../logic/index.js'

describe('task019 logic - constants', () => {
  test('VERSION should be a string', () => {
    expect(typeof VERSION).toBe('string')
    expect(VERSION).not.toBe('')
  })

  test('ERROR_CODES should contain all required error codes', () => {
    const requiredCodes = [
      'NULL_INPUT',
      'EMPTY_INPUT',
      'PARSE_FAILED',
      'INVALID_INDENT',
      'DUPLICATE_KEY',
      'UNSUPPORTED_ANCHOR',
      'UNSUPPORTED_ALIAS',
      'UNSUPPORTED_TAG',
      'UNSUPPORTED_MULTIDOC',
      'NESTING_DEPTH_EXCEEDED',
      'INPUT_TOO_LARGE',
      'INVALID_PARAMETER',
    ]

    requiredCodes.forEach(code => {
      expect(ERROR_CODES[code]).toBe(code)
    })
  })

  test('ERROR_MESSAGES should have messages for all error codes', () => {
    Object.keys(ERROR_CODES).forEach(code => {
      expect(ERROR_MESSAGES[ERROR_CODES[code]]).toBeDefined()
      expect(typeof ERROR_MESSAGES[ERROR_CODES[code]]).toBe('string')
    })
  })

  test('MAX_INPUT_SIZE_BYTES should be a positive number', () => {
    expect(MAX_INPUT_SIZE_BYTES).toBeGreaterThan(0)
    expect(typeof MAX_INPUT_SIZE_BYTES).toBe('number')
  })

  test('DEFAULT_MAX_NESTING_DEPTH should be a positive number', () => {
    expect(DEFAULT_MAX_NESTING_DEPTH).toBeGreaterThan(0)
    expect(typeof DEFAULT_MAX_NESTING_DEPTH).toBe('number')
  })

  test('INDENT_STYLES should contain valid styles', () => {
    expect(INDENT_STYLES).toContain('space')
    expect(INDENT_STYLES).toContain('tab')
  })

  test('INDENT_WIDTHS should contain valid widths', () => {
    expect(INDENT_WIDTHS).toContain(2)
    expect(INDENT_WIDTHS).toContain(4)
    expect(INDENT_WIDTHS).toContain(8)
  })

  test('QUOTE_STYLES should contain valid styles', () => {
    expect(QUOTE_STYLES).toContain('single')
    expect(QUOTE_STYLES).toContain('double')
    expect(QUOTE_STYLES).toContain('none')
  })

  test('INLINE_STYLES should contain valid styles', () => {
    expect(INLINE_STYLES).toContain('min')
    expect(INLINE_STYLES).toContain('standard')
    expect(INLINE_STYLES).toContain('max')
  })

  test('KEY_ORDERS should contain valid orders', () => {
    expect(KEY_ORDERS).toContain('preserve')
    expect(KEY_ORDERS).toContain('alphabetical')
  })
})

describe('task019 logic - helper functions', () => {
  describe('getErrorMessage', () => {
    test('should return correct message for known error codes', () => {
      expect(getErrorMessage(ERROR_CODES.NULL_INPUT)).toBe(ERROR_MESSAGES[ERROR_CODES.NULL_INPUT])
      expect(getErrorMessage(ERROR_CODES.PARSE_FAILED)).toBe(ERROR_MESSAGES[ERROR_CODES.PARSE_FAILED])
    })

    test('should return default message for unknown error codes', () => {
      expect(getErrorMessage('UNKNOWN_CODE')).toBe('未知错误')
    })
  })

  describe('getByteSize', () => {
    test('should return 0 for non-string inputs', () => {
      expect(getByteSize(null)).toBe(0)
      expect(getByteSize(undefined)).toBe(0)
      expect(getByteSize(123)).toBe(0)
      expect(getByteSize({})).toBe(0)
    })

    test('should return correct byte size for ASCII strings', () => {
      expect(getByteSize('')).toBe(0)
      expect(getByteSize('a')).toBe(1)
      expect(getByteSize('hello')).toBe(5)
    })

    test('should return correct byte size for UTF-8 strings', () => {
      expect(getByteSize('中文')).toBe(6)
      expect(getByteSize('a中文b')).toBe(8)
    })
  })

  describe('formatBytes', () => {
    test('should handle invalid inputs', () => {
      expect(formatBytes(-1)).toBe('0 B')
      expect(formatBytes(NaN)).toBe('0 B')
      expect(formatBytes(Infinity)).toBe('0 B')
    })

    test('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B')
      expect(formatBytes(1)).toBe('1 B')
      expect(formatBytes(1023)).toBe('1023 B')
      expect(formatBytes(1024)).toBe('1 KB')
      expect(formatBytes(1024 * 1024)).toBe('1 MB')
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB')
    })

    test('should format to 2 decimal places', () => {
      expect(formatBytes(1500)).toBe('1.46 KB')
    })
  })

  describe('escapeHtml', () => {
    test('should return empty string for null or undefined', () => {
      expect(escapeHtml(null)).toBe('')
      expect(escapeHtml(undefined)).toBe('')
    })

    test('should convert non-string values to string', () => {
      expect(escapeHtml(123)).toBe('123')
      expect(escapeHtml(0)).toBe('0')
      expect(escapeHtml(true)).toBe('true')
    })

    test('should escape HTML special characters', () => {
      const xss = '<script>alert("xss")</script>'
      const escaped = escapeHtml(xss)
      expect(escaped).not.toContain('<script>')
      expect(escaped).toContain('&lt;')
      expect(escaped).toContain('&gt;')
      expect(escaped).toContain('&quot;')
    })

    test('should return original string if no special characters', () => {
      expect(escapeHtml('hello world')).toBe('hello world')
      expect(escapeHtml('')).toBe('')
    })
  })

  describe('validateIndent', () => {
    test('should return false for invalid indent styles', () => {
      expect(validateIndent('invalid', 2)).toBe(false)
      expect(validateIndent(null, 2)).toBe(false)
      expect(validateIndent(undefined, 2)).toBe(false)
    })

    test('should return true for tab style', () => {
      expect(validateIndent('tab', 2)).toBe(true)
      expect(validateIndent('tab', 999)).toBe(true)
    })

    test('should validate space style with valid widths', () => {
      expect(validateIndent('space', 2)).toBe(true)
      expect(validateIndent('space', 4)).toBe(true)
      expect(validateIndent('space', 8)).toBe(true)
    })

    test('should return false for space style with invalid widths', () => {
      expect(validateIndent('space', 1)).toBe(false)
      expect(validateIndent('space', 3)).toBe(false)
      expect(validateIndent('space', 16)).toBe(false)
    })
  })

  describe('normalizeOptions', () => {
    test('should use defaults for empty options', () => {
      const result = normalizeOptions({})
      expect(result.indentStyle).toBe('space')
      expect(result.indentWidth).toBe(2)
      expect(result.quoteStyle).toBe('none')
      expect(result.inlineStyle).toBe('standard')
      expect(result.keyOrder).toBe('preserve')
      expect(result.maxNestingDepth).toBe(DEFAULT_MAX_NESTING_DEPTH)
    })

    test('should use provided valid options', () => {
      const result = normalizeOptions({
        indentStyle: 'tab',
        indentWidth: 4,
        quoteStyle: 'double',
        inlineStyle: 'max',
        keyOrder: 'alphabetical',
        maxNestingDepth: 50,
      })
      expect(result.indentStyle).toBe('tab')
      expect(result.indentWidth).toBe(4)
      expect(result.quoteStyle).toBe('double')
      expect(result.inlineStyle).toBe('max')
      expect(result.keyOrder).toBe('alphabetical')
      expect(result.maxNestingDepth).toBe(50)
    })

    test('should fallback to defaults for invalid options', () => {
      const result = normalizeOptions({
        indentStyle: 'invalid',
        indentWidth: 999,
        quoteStyle: 'invalid',
        inlineStyle: 'invalid',
        keyOrder: 'invalid',
        maxNestingDepth: -1,
      })
      expect(result.indentStyle).toBe('space')
      expect(result.indentWidth).toBe(2)
      expect(result.quoteStyle).toBe('none')
      expect(result.inlineStyle).toBe('standard')
      expect(result.keyOrder).toBe('preserve')
      expect(result.maxNestingDepth).toBe(DEFAULT_MAX_NESTING_DEPTH)
    })
  })
})

describe('task019 logic - result creation', () => {
  describe('createSuccessResult', () => {
    test('should create success result with correct structure', () => {
      const result = createSuccessResult('output content', 100, 3)
      expect(result.success).toBe(true)
      expect(result.output).toBe('output content')
      expect(result.processedBytes).toBe(100)
      expect(result.nestingDepth).toBe(3)
      expect(result.version).toBe(VERSION)
    })
  })

  describe('createErrorResult', () => {
    test('should create error result with minimal info', () => {
      const result = createErrorResult(ERROR_CODES.PARSE_FAILED)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.PARSE_FAILED)
      expect(result.errorMessage).toBe(ERROR_MESSAGES[ERROR_CODES.PARSE_FAILED])
      expect(result.line).toBeNull()
      expect(result.column).toBeNull()
      expect(result.jsonPath).toBeNull()
      expect(result.version).toBe(VERSION)
    })

    test('should create error result with location info', () => {
      const result = createErrorResult(ERROR_CODES.PARSE_FAILED, 'Custom message', 5, 10, '$.data[0]')
      expect(result.errorCode).toBe(ERROR_CODES.PARSE_FAILED)
      expect(result.errorMessage).toBe('Custom message')
      expect(result.line).toBe(5)
      expect(result.column).toBe(10)
      expect(result.jsonPath).toBe('$.data[0]')
    })

    test('should use default message when not provided', () => {
      const result = createErrorResult(ERROR_CODES.NULL_INPUT)
      expect(result.errorMessage).toBe(ERROR_MESSAGES[ERROR_CODES.NULL_INPUT])
    })
  })
})

describe('task019 logic - nesting depth', () => {
  describe('calculateNestingDepth', () => {
    test('should return 0 for primitive values', () => {
      expect(calculateNestingDepth(null)).toBe(0)
      expect(calculateNestingDepth(undefined)).toBe(0)
      expect(calculateNestingDepth(123)).toBe(0)
      expect(calculateNestingDepth('string')).toBe(0)
      expect(calculateNestingDepth(true)).toBe(0)
    })

    test('should return 0 for empty objects and arrays', () => {
      expect(calculateNestingDepth({})).toBe(0)
      expect(calculateNestingDepth([])).toBe(0)
    })

    test('should calculate depth for simple objects', () => {
      expect(calculateNestingDepth({ a: 1 })).toBe(1)
      expect(calculateNestingDepth([1, 2, 3])).toBe(1)
    })

    test('should calculate depth for nested structures', () => {
      const obj1 = {
        level1: {
          level2: {
            level3: 'value'
          }
        }
      }
      expect(calculateNestingDepth(obj1)).toBe(3)

      const arr1 = [
        [
          [
            'value'
          ]
        ]
      ]
      expect(calculateNestingDepth(arr1)).toBe(3)

      const mixed = {
        a: [
          {
            b: [
              'deep'
            ]
          }
        ]
      }
      expect(calculateNestingDepth(mixed)).toBe(4)
    })
  })

  describe('validateMaxNestingDepth', () => {
    test('should return true for shallow structures', () => {
      expect(validateMaxNestingDepth({ a: 1 }, 5)).toBe(true)
      expect(validateMaxNestingDepth([1, 2, 3], 5)).toBe(true)
    })

    test('should return false for deep structures', () => {
      const deep = {
        level1: {
          level2: {
            level3: {
              level4: 'value'
            }
          }
        }
      }
      expect(validateMaxNestingDepth(deep, 2)).toBe(false)
      expect(validateMaxNestingDepth(deep, 4)).toBe(true)
    })

    test('should handle edge cases', () => {
      expect(validateMaxNestingDepth(null, 10)).toBe(true)
      expect(validateMaxNestingDepth(undefined, 10)).toBe(true)
      expect(validateMaxNestingDepth({}, 0)).toBe(true)
    })
  })
})

describe('task019 logic - error location extraction', () => {
  describe('extractLineColumnFromYamlError', () => {
    test('should return null for null/undefined error', () => {
      expect(extractLineColumnFromYamlError(null)).toEqual({ line: null, column: null })
      expect(extractLineColumnFromYamlError(undefined)).toEqual({ line: null, column: null })
      expect(extractLineColumnFromYamlError({})).toEqual({ line: null, column: null })
    })

    test('should extract line and column from error message', () => {
      const error1 = { message: 'Error at line 5, column 10' }
      expect(extractLineColumnFromYamlError(error1)).toEqual({ line: 5, column: 10 })

      const error2 = { message: 'Parse error on line 15: col: 3' }
      expect(extractLineColumnFromYamlError(error2)).toEqual({ line: 15, column: 3 })
    })

    test('should extract only line if column not present', () => {
      const error = { message: 'Error at line 7' }
      expect(extractLineColumnFromYamlError(error)).toEqual({ line: 7, column: null })
    })
  })

  describe('extractLineColumnFromJsonError', () => {
    test('should return nulls for null/undefined error', () => {
      expect(extractLineColumnFromJsonError(null, '')).toEqual({ line: null, column: null, jsonPath: null })
      expect(extractLineColumnFromJsonError(undefined, '')).toEqual({ line: null, column: null, jsonPath: null })
    })

    test('should calculate line and column from position', () => {
      const input = '{\n  "key": "value"\n}'
      const error = { message: 'Unexpected token at position 5' }
      const result = extractLineColumnFromJsonError(error, input)
      expect(result.line).toBeDefined()
      expect(result.column).toBeDefined()
    })
  })

  describe('classifyYamlError', () => {
    test('should classify PARSE_FAILED by default', () => {
      expect(classifyYamlError(null)).toEqual({ code: ERROR_CODES.PARSE_FAILED, jsonPath: null })
      expect(classifyYamlError({ message: 'some error' })).toEqual({ code: ERROR_CODES.PARSE_FAILED, jsonPath: null })
    })

    test('should classify duplicate key error', () => {
      const error = { message: 'Duplicate key detected' }
      expect(classifyYamlError(error).code).toBe(ERROR_CODES.DUPLICATE_KEY)
    })

    test('should classify anchor error', () => {
      const error = { message: 'Unsupported anchor reference' }
      expect(classifyYamlError(error).code).toBe(ERROR_CODES.UNSUPPORTED_ANCHOR)
    })

    test('should classify alias error', () => {
      const error = { message: 'Alias not supported' }
      expect(classifyYamlError(error).code).toBe(ERROR_CODES.UNSUPPORTED_ALIAS)
    })

    test('should classify tag error', () => {
      const error = { message: 'Unsupported tag !custom' }
      expect(classifyYamlError(error).code).toBe(ERROR_CODES.UNSUPPORTED_TAG)
    })

    test('should classify multidoc error', () => {
      const error = { message: 'Multiple documents not supported' }
      expect(classifyYamlError(error).code).toBe(ERROR_CODES.UNSUPPORTED_MULTIDOC)
    })
  })

  describe('formatErrorLocation', () => {
    test('should return null for null/undefined', () => {
      expect(formatErrorLocation(null)).toBeNull()
      expect(formatErrorLocation(undefined)).toBeNull()
    })

    test('should return null when no location info', () => {
      expect(formatErrorLocation({})).toBeNull()
    })

    test('should format line only', () => {
      expect(formatErrorLocation({ line: 5 })).toBe('第 5 行')
    })

    test('should format column only', () => {
      expect(formatErrorLocation({ column: 10 })).toBe('第 10 列')
    })

    test('should format line and column', () => {
      expect(formatErrorLocation({ line: 5, column: 10 })).toBe('第 5 行，第 10 列')
    })

    test('should format with jsonPath', () => {
      expect(formatErrorLocation({ jsonPath: '$.data[0].key' })).toBe('路径: $.data[0].key')
    })

    test('should format all together', () => {
      const result = formatErrorLocation({ line: 5, column: 10, jsonPath: '$.key' })
      expect(result).toContain('第 5 行')
      expect(result).toContain('第 10 列')
      expect(result).toContain('路径: $.key')
    })
  })
})

describe('task019 logic - input validation', () => {
  test('should detect null input', () => {
    const result = validateInput(null)
    expect(result).not.toBeNull()
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
  })

  test('should detect non-string input', () => {
    const result = validateInput(123)
    expect(result).not.toBeNull()
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_PARAMETER)
  })

  test('should detect empty input', () => {
    expect(validateInput('').errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    expect(validateInput('   ').errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    expect(validateInput('\n\t  \n').errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
  })

  test('should pass valid input', () => {
    expect(validateInput('valid content')).toBeNull()
    expect(validateInput('  valid  ')).toBeNull()
  })

  test('should detect input too large', () => {
    const largeInput = 'a'.repeat(MAX_INPUT_SIZE_BYTES + 1)
    const result = validateInput(largeInput)
    expect(result).not.toBeNull()
    expect(result.errorCode).toBe(ERROR_CODES.INPUT_TOO_LARGE)
  })
})
