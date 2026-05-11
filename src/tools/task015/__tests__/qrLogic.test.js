import { describe, test, expect } from 'vitest'
import {
  assembleParams,
  validateErrorLevel,
  validateMargin,
  validateModuleSize,
  validateNominalSizeMm,
  validateOutputFormat,
  normalizeInput,
  computeModuleSizeFromNominalSize,
  getMimeType,
  estimateMaxContentLength,
  ERROR_CODES,
  DEFAULT_PARAMS,
  VALID_ERROR_LEVELS,
  VALID_FORMATS,
} from '../logic/index.js'

describe('qrErrors', () => {
  describe('ERROR_CODES', () => {
    test('should contain all required error codes', () => {
      const requiredCodes = [
        'NULL_INPUT',
        'CONTENT_TOO_SHORT',
        'CONTENT_TOO_LONG',
        'INVALID_MARGIN',
        'INVALID_MODULE_SIZE',
        'INVALID_NOMINAL_SIZE',
        'INVALID_FORMAT',
        'OPTION_CONFLICT',
        'OUTPUT_TOO_LARGE',
        'ENCODE_FAILED',
        'INVALID_PARAMETER',
      ]
      for (const code of requiredCodes) {
        expect(ERROR_CODES[code]).toBe(code)
      }
    })
  })
})

describe('qrParams', () => {
  describe('normalizeInput', () => {
    test('should return null for null input', () => {
      expect(normalizeInput(null)).toBeNull()
    })

    test('should return null for undefined input', () => {
      expect(normalizeInput(undefined)).toBeNull()
    })

    test('should convert to string', () => {
      expect(normalizeInput(123)).toBe('123')
      expect(normalizeInput(true)).toBe('true')
    })

    test('should return string as-is', () => {
      expect(normalizeInput('test')).toBe('test')
    })
  })

  describe('validateErrorLevel', () => {
    test('should return default for undefined', () => {
      expect(validateErrorLevel(undefined)).toBe(DEFAULT_PARAMS.errorLevel)
    })

    test('should accept valid error levels', () => {
      for (const level of VALID_ERROR_LEVELS) {
        expect(validateErrorLevel(level)).toBe(level)
      }
    })

    test('should normalize case', () => {
      expect(validateErrorLevel('l')).toBe('L')
      expect(validateErrorLevel('m')).toBe('M')
      expect(validateErrorLevel('q')).toBe('Q')
      expect(validateErrorLevel('h')).toBe('H')
    })

    test('should throw for invalid error level', () => {
      expect(() => validateErrorLevel('X')).toThrow()
      expect(() => validateErrorLevel('invalid')).toThrow()
    })
  })

  describe('validateMargin', () => {
    test('should return default for undefined', () => {
      expect(validateMargin(undefined)).toBe(DEFAULT_PARAMS.margin)
    })

    test('should accept valid margins', () => {
      expect(validateMargin(0)).toBe(0)
      expect(validateMargin(4)).toBe(4)
      expect(validateMargin(10)).toBe(10)
      expect(validateMargin(20)).toBe(20)
    })

    test('should accept string input', () => {
      expect(validateMargin('4')).toBe(4)
    })

    test('should throw for invalid margins', () => {
      expect(() => validateMargin(-1)).toThrow()
      expect(() => validateMargin(21)).toThrow()
      expect(() => validateMargin(2.5)).toThrow()
    })
  })

  describe('validateModuleSize', () => {
    test('should return null for undefined', () => {
      expect(validateModuleSize(undefined)).toBeNull()
    })

    test('should accept valid module sizes', () => {
      expect(validateModuleSize(1)).toBe(1)
      expect(validateModuleSize(5)).toBe(5)
      expect(validateModuleSize(25)).toBe(25)
      expect(validateModuleSize(50)).toBe(50)
    })

    test('should accept string input', () => {
      expect(validateModuleSize('5')).toBe(5)
    })

    test('should throw for invalid module sizes', () => {
      expect(() => validateModuleSize(0)).toThrow()
      expect(() => validateModuleSize(51)).toThrow()
      expect(() => validateModuleSize(2.5)).toThrow()
      expect(() => validateModuleSize(-1)).toThrow()
    })
  })

  describe('validateNominalSizeMm', () => {
    test('should return null for undefined', () => {
      expect(validateNominalSizeMm(undefined)).toBeNull()
    })

    test('should accept valid sizes', () => {
      expect(validateNominalSizeMm(10)).toBe(10)
      expect(validateNominalSizeMm(50)).toBe(50)
      expect(validateNominalSizeMm(250)).toBe(250)
      expect(validateNominalSizeMm(500)).toBe(500)
    })

    test('should accept decimal values', () => {
      expect(validateNominalSizeMm(25.5)).toBe(25.5)
    })

    test('should accept string input', () => {
      expect(validateNominalSizeMm('50')).toBe(50)
    })

    test('should throw for invalid sizes', () => {
      expect(() => validateNominalSizeMm(9)).toThrow()
      expect(() => validateNominalSizeMm(501)).toThrow()
      expect(() => validateNominalSizeMm(-10)).toThrow()
    })
  })

  describe('validateOutputFormat', () => {
    test('should return default for undefined', () => {
      expect(validateOutputFormat(undefined)).toBe(DEFAULT_PARAMS.outputFormat)
    })

    test('should accept valid formats', () => {
      for (const format of VALID_FORMATS) {
        expect(validateOutputFormat(format)).toBe(format)
      }
    })

    test('should normalize case', () => {
      expect(validateOutputFormat('PNG')).toBe('png')
      expect(validateOutputFormat('SVG')).toBe('svg')
      expect(validateOutputFormat('JPEG')).toBe('jpeg')
    })

    test('should throw for invalid format', () => {
      expect(() => validateOutputFormat('bmp')).toThrow()
      expect(() => validateOutputFormat('gif')).toThrow()
      expect(() => validateOutputFormat('invalid')).toThrow()
    })
  })

  describe('assembleParams', () => {
    test('should assemble params with defaults', () => {
      const params = assembleParams({ content: 'https://example.com' })
      expect(params.content).toBe('https://example.com')
      expect(params.errorLevel).toBe(DEFAULT_PARAMS.errorLevel)
      expect(params.margin).toBe(DEFAULT_PARAMS.margin)
      expect(params.outputFormat).toBe(DEFAULT_PARAMS.outputFormat)
      expect(params.moduleSize).toBeNull()
      expect(params.nominalSizeMm).toBeNull()
    })

    test('should throw NULL_INPUT for empty content', () => {
      expect(() => assembleParams({ content: '' })).toThrow()
      try {
        assembleParams({ content: '' })
      } catch (e) {
        expect(e.code).toBe(ERROR_CODES.NULL_INPUT)
      }
    })

    test('should throw NULL_INPUT for null content', () => {
      expect(() => assembleParams({ content: null })).toThrow()
      try {
        assembleParams({ content: null })
      } catch (e) {
        expect(e.code).toBe(ERROR_CODES.NULL_INPUT)
      }
    })

    test('should accept moduleSize', () => {
      const params = assembleParams({ content: 'test', moduleSize: 10 })
      expect(params.moduleSize).toBe(10)
      expect(params.nominalSizeMm).toBeNull()
    })

    test('should accept nominalSizeMm', () => {
      const params = assembleParams({ content: 'test', nominalSizeMm: 50 })
      expect(params.nominalSizeMm).toBe(50)
      expect(params.moduleSize).toBeNull()
    })

    test('should throw OPTION_CONFLICT when both moduleSize and nominalSizeMm provided', () => {
      expect(() => assembleParams({
        content: 'test',
        moduleSize: 5,
        nominalSizeMm: 50,
      })).toThrow()

      try {
        assembleParams({
          content: 'test',
          moduleSize: 5,
          nominalSizeMm: 50,
        })
      } catch (e) {
        expect(e.code).toBe(ERROR_CODES.OPTION_CONFLICT)
      }
    })

    test('should accept custom errorLevel', () => {
      const params = assembleParams({ content: 'test', errorLevel: 'H' })
      expect(params.errorLevel).toBe('H')
    })

    test('should accept custom margin', () => {
      const params = assembleParams({ content: 'test', margin: 8 })
      expect(params.margin).toBe(8)
    })

    test('should accept custom outputFormat', () => {
      const params = assembleParams({ content: 'test', outputFormat: 'svg' })
      expect(params.outputFormat).toBe('svg')
    })
  })

  describe('computeModuleSizeFromNominalSize', () => {
    test('should compute valid module size', () => {
      const result = computeModuleSizeFromNominalSize(50, 1)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(50)
    })

    test('should return at least 1', () => {
      const result = computeModuleSizeFromNominalSize(1, 10)
      expect(result).toBe(1)
    })

    test('should return at most 50', () => {
      const result = computeModuleSizeFromNominalSize(1000, 1)
      expect(result).toBe(50)
    })
  })

  describe('getMimeType', () => {
    test('should return correct MIME types', () => {
      expect(getMimeType('png')).toBe('image/png')
      expect(getMimeType('svg')).toBe('image/svg+xml')
      expect(getMimeType('jpeg')).toBe('image/jpeg')
    })

    test('should default to png for unknown formats', () => {
      expect(getMimeType('unknown')).toBe('image/png')
    })
  })

  describe('estimateMaxContentLength', () => {
    test('should return higher capacity for larger versions', () => {
      const small = estimateMaxContentLength(1, 'L')
      const large = estimateMaxContentLength(40, 'L')
      expect(large).toBeGreaterThan(small)
    })

    test('should return higher capacity for lower error correction', () => {
      const lowEC = estimateMaxContentLength(10, 'L')
      const highEC = estimateMaxContentLength(10, 'H')
      expect(lowEC).toBeGreaterThan(highEC)
    })
  })
})
