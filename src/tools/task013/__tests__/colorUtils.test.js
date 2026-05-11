import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import {
  ERROR_CODES,
  NOTATIONS,
  SUPPORTED_TARGET_NOTATIONS,
  ROUNDING_MODES,
  MAX_BATCH_SIZE,
  normalizeColor,
  convertColor,
  convertBatch,
  clamp,
  roundValue,
} from '../logic/colorUtils.js'

describe('colorUtils', () => {
  beforeAll(() => {
    global.document = {
      createElement: () => {
        const el = {
          textContent: '',
          innerHTML: '',
        }
        Object.defineProperty(el, 'innerHTML', {
          set: function() {},
          get: function() {
            return this.textContent
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
          }
        })
        return el
      }
    }
  })

  afterAll(() => {
    delete global.document
  })

  describe('constants', () => {
    test('ERROR_CODES should contain all required error codes', () => {
      expect(ERROR_CODES.NULL_INPUT).toBe('NULL_INPUT')
      expect(ERROR_CODES.EMPTY_INPUT).toBe('EMPTY_INPUT')
      expect(ERROR_CODES.INVALID_FORMAT).toBe('INVALID_FORMAT')
      expect(ERROR_CODES.UNSUPPORTED_NOTATION).toBe('UNSUPPORTED_NOTATION')
      expect(ERROR_CODES.OUT_OF_RANGE).toBe('OUT_OF_RANGE')
      expect(ERROR_CODES.BATCH_SIZE_EXCEEDED).toBe('BATCH_SIZE_EXCEEDED')
      expect(ERROR_CODES.INVALID_PARAMETER).toBe('INVALID_PARAMETER')
    })

    test('NOTATIONS should define all supported color formats', () => {
      expect(NOTATIONS.HEX).toBe('hex')
      expect(NOTATIONS.RGB).toBe('rgb')
      expect(NOTATIONS.RGBA).toBe('rgba')
      expect(NOTATIONS.HSL).toBe('hsl')
      expect(NOTATIONS.HSLA).toBe('hsla')
    })

    test('SUPPORTED_TARGET_NOTATIONS should include all 5 formats', () => {
      expect(SUPPORTED_TARGET_NOTATIONS).toHaveLength(5)
      expect(SUPPORTED_TARGET_NOTATIONS).toContain(NOTATIONS.HEX)
      expect(SUPPORTED_TARGET_NOTATIONS).toContain(NOTATIONS.RGB)
      expect(SUPPORTED_TARGET_NOTATIONS).toContain(NOTATIONS.RGBA)
      expect(SUPPORTED_TARGET_NOTATIONS).toContain(NOTATIONS.HSL)
      expect(SUPPORTED_TARGET_NOTATIONS).toContain(NOTATIONS.HSLA)
    })

    test('MAX_BATCH_SIZE should be 100', () => {
      expect(MAX_BATCH_SIZE).toBe(100)
    })
  })

  describe('helper functions', () => {
    describe('clamp', () => {
      test('should return value within range', () => {
        expect(clamp(5, 0, 10)).toBe(5)
        expect(clamp(-1, 0, 10)).toBe(0)
        expect(clamp(15, 0, 10)).toBe(10)
        expect(clamp(0, 0, 255)).toBe(0)
        expect(clamp(255, 0, 255)).toBe(255)
      })
    })

    describe('roundValue', () => {
      test('should round with different modes', () => {
        expect(roundValue(2.5, ROUNDING_MODES.ROUND)).toBe(3)
        expect(roundValue(2.5, ROUNDING_MODES.FLOOR)).toBe(2)
        expect(roundValue(2.1, ROUNDING_MODES.CEIL)).toBe(3)
        expect(roundValue(2.9, ROUNDING_MODES.TRUNC)).toBe(2)
        expect(roundValue(-2.9, ROUNDING_MODES.TRUNC)).toBe(-2)
      })

      test('should use ROUND mode by default', () => {
        expect(roundValue(2.5)).toBe(3)
        expect(roundValue(2.4)).toBe(2)
      })
    })
  })

  describe('normalizeColor - HEX input', () => {
    test('should parse 3-digit hex without #', () => {
      const result = normalizeColor('fff')
      expect(result.valid).toBe(true)
      expect(result.rgb.r).toBe(255)
      expect(result.rgb.g).toBe(255)
      expect(result.rgb.b).toBe(255)
      expect(result.hex.value).toBe('#ffffff')
    })

    test('should parse 3-digit hex with #', () => {
      const result = normalizeColor('#fff')
      expect(result.valid).toBe(true)
      expect(result.rgb.r).toBe(255)
      expect(result.rgb.g).toBe(255)
      expect(result.rgb.b).toBe(255)
    })

    test('should parse 6-digit hex', () => {
      const result = normalizeColor('#ff0000')
      expect(result.valid).toBe(true)
      expect(result.rgb.r).toBe(255)
      expect(result.rgb.g).toBe(0)
      expect(result.rgb.b).toBe(0)
      expect(result.hex.value).toBe('#ff0000')
    })

    test('should parse 8-digit hex with alpha', () => {
      const result = normalizeColor('#ff000080')
      expect(result.valid).toBe(true)
      expect(result.rgb.r).toBe(255)
      expect(result.rgb.g).toBe(0)
      expect(result.rgb.b).toBe(0)
      expect(result.rgb.a).toBeCloseTo(0.5, 1)
      expect(result.hex.value).toBe('#ff000080')
    })

    test('should handle uppercase hex', () => {
      const result = normalizeColor('#FF00FF')
      expect(result.valid).toBe(true)
      expect(result.hex.value).toBe('#ff00ff')
    })

    test('should generate HSL values for HEX input', () => {
      const result = normalizeColor('#ff0000')
      expect(result.valid).toBe(true)
      expect(result.hsl).not.toBeNull()
      expect(result.hsl.h).toBe(0)
      expect(result.hsl.s).toBe(100)
      expect(result.hsl.l).toBe(50)
    })
  })

  describe('normalizeColor - RGB/RGBA input', () => {
    test('should parse rgb() format', () => {
      const result = normalizeColor('rgb(255, 0, 128)')
      expect(result.valid).toBe(true)
      expect(result.notation).toBe(NOTATIONS.RGB)
      expect(result.rgb.r).toBe(255)
      expect(result.rgb.g).toBe(0)
      expect(result.rgb.b).toBe(128)
    })

    test('should parse rgba() format', () => {
      const result = normalizeColor('rgba(255, 0, 0, 0.5)')
      expect(result.valid).toBe(true)
      expect(result.notation).toBe(NOTATIONS.RGBA)
      expect(result.rgb.r).toBe(255)
      expect(result.rgb.a).toBe(0.5)
    })

    test('should parse RGB with slash syntax for alpha', () => {
      const result = normalizeColor('rgba(255, 0, 0 / 0.5)')
      expect(result.valid).toBe(true)
      expect(result.rgb.a).toBe(0.5)
    })

    test('should reject out-of-range RGB values', () => {
      const result = normalizeColor('rgb(300, 0, 0)')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.OUT_OF_RANGE)
    })

    test('should reject out-of-range alpha values', () => {
      const result = normalizeColor('rgba(255, 0, 0, 1.5)')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.OUT_OF_RANGE)
    })

    test('should generate HSL values for RGB input', () => {
      const result = normalizeColor('rgb(0, 255, 0)')
      expect(result.valid).toBe(true)
      expect(result.hsl.h).toBe(120)
      expect(result.hsl.s).toBe(100)
      expect(result.hsl.l).toBe(50)
    })
  })

  describe('normalizeColor - HSL/HSLA input', () => {
    test('should parse hsl() format', () => {
      const result = normalizeColor('hsl(0, 100%, 50%)')
      expect(result.valid).toBe(true)
      expect(result.notation).toBe(NOTATIONS.HSL)
      expect(result.hsl.h).toBe(0)
      expect(result.hsl.s).toBe(100)
      expect(result.hsl.l).toBe(50)
    })

    test('should parse hsla() format', () => {
      const result = normalizeColor('hsla(120, 100%, 50%, 0.5)')
      expect(result.valid).toBe(true)
      expect(result.notation).toBe(NOTATIONS.HSLA)
      expect(result.hsl.h).toBe(120)
      expect(result.hsl.a).toBe(0.5)
    })

    test('should parse HSL with deg unit', () => {
      const result = normalizeColor('hsl(180deg, 50%, 50%)')
      expect(result.valid).toBe(true)
      expect(result.hsl.h).toBe(180)
    })

    test('should reject out-of-range saturation', () => {
      const result = normalizeColor('hsl(0, 150%, 50%)')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.OUT_OF_RANGE)
    })

    test('should generate RGB values for HSL input', () => {
      const result = normalizeColor('hsl(0, 100%, 50%)')
      expect(result.valid).toBe(true)
      expect(result.rgb.r).toBe(255)
      expect(result.rgb.g).toBe(0)
      expect(result.rgb.b).toBe(0)
    })

    test('should generate HEX values for HSL input', () => {
      const result = normalizeColor('hsl(0, 100%, 50%)')
      expect(result.valid).toBe(true)
      expect(result.hex.value).toBe('#ff0000')
    })
  })

  describe('normalizeColor - error cases', () => {
    test('should return NULL_INPUT for null', () => {
      const result = normalizeColor(null)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
    })

    test('should return NULL_INPUT for undefined', () => {
      const result = normalizeColor(undefined)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
    })

    test('should return EMPTY_INPUT for empty string', () => {
      const result = normalizeColor('')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should return EMPTY_INPUT for whitespace-only string', () => {
      const result = normalizeColor('   ')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should return INVALID_FORMAT for invalid format', () => {
      const result = normalizeColor('not-a-color')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_FORMAT)
    })

    test('should return INVALID_FORMAT for malformed hex', () => {
      const result = normalizeColor('#fffzzz')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_FORMAT)
    })

    test('should return INVALID_FORMAT for malformed rgb', () => {
      const result = normalizeColor('rgb(not, numbers, here)')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_FORMAT)
    })
  })

  describe('convertColor - single value conversion', () => {
    test('should convert HEX to RGB', () => {
      const result = convertColor('#ff0000', { targetNotation: NOTATIONS.RGB })
      expect(result.valid).toBe(true)
      expect(result.convertedColor).toBe('rgb(255, 0, 0)')
      expect(result.targetNotation).toBe(NOTATIONS.RGB)
      expect(result.originalNotation).toBe(NOTATIONS.RGB)
    })

    test('should convert RGB to HEX', () => {
      const result = convertColor('rgb(0, 255, 0)', { targetNotation: NOTATIONS.HEX })
      expect(result.valid).toBe(true)
      expect(result.convertedColor).toBe('#00ff00')
    })

    test('should convert RGB to HSL', () => {
      const result = convertColor('rgb(0, 0, 255)', { targetNotation: NOTATIONS.HSL })
      expect(result.valid).toBe(true)
      expect(result.convertedColor).toContain('hsl(')
      expect(result.hsl.h).toBe(240)
    })

    test('should convert HSL to RGB', () => {
      const result = convertColor('hsl(60, 100%, 50%)', { targetNotation: NOTATIONS.RGB })
      expect(result.valid).toBe(true)
      expect(result.rgb.r).toBe(255)
      expect(result.rgb.g).toBe(255)
      expect(result.rgb.b).toBe(0)
    })

    test('should handle alpha channel when converting to RGBA', () => {
      const result = convertColor('#ff000080', { targetNotation: NOTATIONS.RGBA })
      expect(result.valid).toBe(true)
      expect(result.convertedColor).toContain('rgba(')
      expect(result.rgb.a).toBeCloseTo(0.5, 1)
    })

    test('should handle alpha channel when converting to HSLA', () => {
      const result = convertColor('rgba(255, 0, 0, 0.5)', { targetNotation: NOTATIONS.HSLA })
      expect(result.valid).toBe(true)
      expect(result.convertedColor).toContain('hsla(')
      expect(result.hsl.a).toBe(0.5)
    })

    test('should use HEX as default target notation', () => {
      const result = convertColor('rgb(255, 0, 0)')
      expect(result.valid).toBe(true)
      expect(result.targetNotation).toBe(NOTATIONS.HEX)
    })

    test('should return UNSUPPORTED_NOTATION for invalid target', () => {
      const result = convertColor('#ff0000', { targetNotation: 'invalid' })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.UNSUPPORTED_NOTATION)
    })

    test('should preserve error info for invalid input colors', () => {
      const result = convertColor('invalid', { targetNotation: NOTATIONS.RGB })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_FORMAT)
      expect(result.originalColor).toBe('invalid')
    })
  })

  describe('convertBatch - batch conversion', () => {
    test('should convert all items successfully', () => {
      const items = ['#ff0000', 'rgb(0, 255, 0)', 'hsl(240, 100%, 50%)']
      const result = convertBatch(items, { targetNotation: NOTATIONS.RGB })
      
      expect(result.allSuccess).toBe(true)
      expect(result.totalCount).toBe(3)
      expect(result.successCount).toBe(3)
      expect(result.failureCount).toBe(0)
      expect(result.items).toHaveLength(3)
      expect(result.items.every(item => item.valid)).toBe(true)
    })

    test('should track indices for each item', () => {
      const items = ['#ff0000', '#00ff00']
      const result = convertBatch(items, { targetNotation: NOTATIONS.HEX })
      
      expect(result.items[0].index).toBe(0)
      expect(result.items[1].index).toBe(1)
      expect(result.items[0].input).toBe('#ff0000')
      expect(result.items[1].input).toBe('#00ff00')
    })

    test('should handle partial failures', () => {
      const items = ['#ff0000', 'invalid', 'rgb(0, 0, 255)']
      const result = convertBatch(items, { targetNotation: NOTATIONS.RGB })
      
      expect(result.allSuccess).toBe(false)
      expect(result.totalCount).toBe(3)
      expect(result.successCount).toBe(2)
      expect(result.failureCount).toBe(1)
      expect(result.items[0].valid).toBe(true)
      expect(result.items[1].valid).toBe(false)
      expect(result.items[2].valid).toBe(true)
    })

    test('should stop on first failure when failFast is true', () => {
      const items = ['invalid1', '#ff0000', 'invalid2']
      const result = convertBatch(items, { 
        targetNotation: NOTATIONS.RGB, 
        failFast: true 
      })
      
      expect(result.allSuccess).toBe(false)
      expect(result.failureCount).toBe(1)
      expect(result.items).toHaveLength(1)
    })

    test('should process all items when failFast is false (default)', () => {
      const items = ['invalid1', '#ff0000', 'invalid2']
      const result = convertBatch(items, { targetNotation: NOTATIONS.RGB })
      
      expect(result.items).toHaveLength(3)
      expect(result.successCount).toBe(1)
      expect(result.failureCount).toBe(2)
    })

    test('should return INVALID_PARAMETER for non-array items', () => {
      const result = convertBatch('not an array', { targetNotation: NOTATIONS.RGB })
      
      expect(result.allSuccess).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_PARAMETER)
    })

    test('should return BATCH_SIZE_EXCEEDED for too many items', () => {
      const items = new Array(101).fill('#ff0000')
      const result = convertBatch(items, { targetNotation: NOTATIONS.RGB })
      
      expect(result.allSuccess).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.BATCH_SIZE_EXCEEDED)
    })

    test('should accept exactly MAX_BATCH_SIZE items', () => {
      const items = new Array(100).fill('#ff0000')
      const result = convertBatch(items, { targetNotation: NOTATIONS.RGB })
      
      expect(result.allSuccess).toBe(true)
      expect(result.totalCount).toBe(100)
      expect(result.items).toHaveLength(100)
    })

    test('should pass conversion options to each item', () => {
      const items = ['rgba(255, 0, 0, 0.5)']
      const result = convertBatch(items, { targetNotation: NOTATIONS.HSLA })
      
      expect(result.items[0].valid).toBe(true)
      expect(result.items[0].targetNotation).toBe(NOTATIONS.HSLA)
      expect(result.items[0].convertedColor).toContain('hsla(')
    })
  })

  describe('color conversion accuracy', () => {
    test('should convert red correctly across formats', () => {
      const hexResult = convertColor('#ff0000', { targetNotation: NOTATIONS.RGB })
      expect(hexResult.rgb.r).toBe(255)
      expect(hexResult.rgb.g).toBe(0)
      expect(hexResult.rgb.b).toBe(0)
      expect(hexResult.hsl.h).toBe(0)
      expect(hexResult.hsl.s).toBe(100)
      expect(hexResult.hsl.l).toBe(50)
    })

    test('should convert white correctly', () => {
      const result = convertColor('#ffffff', { targetNotation: NOTATIONS.HSL })
      expect(result.hsl.s).toBe(0)
      expect(result.hsl.l).toBe(100)
    })

    test('should convert black correctly', () => {
      const result = convertColor('rgb(0, 0, 0)', { targetNotation: NOTATIONS.HSL })
      expect(result.hsl.s).toBe(0)
      expect(result.hsl.l).toBe(0)
    })

    test('should convert gray correctly', () => {
      const result = convertColor('rgb(128, 128, 128)', { targetNotation: NOTATIONS.HSL })
      expect(result.hsl.s).toBe(0)
      expect(result.hsl.l).toBe(50)
    })

    test('should be consistent with round-trip conversion', () => {
      const original = '#123456'
      const toRgb = convertColor(original, { targetNotation: NOTATIONS.RGB })
      const backToHex = convertColor(toRgb.convertedColor, { targetNotation: NOTATIONS.HEX })
      
      expect(backToHex.convertedColor.toLowerCase()).toBe(original)
    })
  })
})
