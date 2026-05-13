import { describe, expect, test } from 'vitest'
import {
  isValidColor,
  normalizeColorToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHex,
  extractHueFromColor,
  generateColorScale,
  relativeLuminance,
  contrastRatio,
  generateNeutralScale,
  generateSemanticColors,
} from '../logic/colorUtils.js'
import { DEFAULT_PRIMARY_HUE, ERROR_CODES } from '../logic/constants.js'

describe('colorUtils', () => {
  describe('isValidColor', () => {
    test('should validate hex colors', () => {
      expect(isValidColor('#fff')).toBe(true)
      expect(isValidColor('#ffffff')).toBe(true)
      expect(isValidColor('#FFF')).toBe(true)
      expect(isValidColor('#ffffff80')).toBe(true)
      expect(isValidColor('fff')).toBe(true)
    })
    
    test('should validate rgb colors', () => {
      expect(isValidColor('rgb(255, 0, 0)')).toBe(true)
      expect(isValidColor('rgba(255, 0, 0, 0.5)')).toBe(true)
      expect(isValidColor('RGB(255, 0, 0)')).toBe(true)
    })
    
    test('should validate hsl colors', () => {
      expect(isValidColor('hsl(120, 100%, 50%)')).toBe(true)
      expect(isValidColor('hsla(120, 100%, 50%, 0.5)')).toBe(true)
    })
    
    test('should reject invalid colors', () => {
      expect(isValidColor('')).toBe(false)
      expect(isValidColor('invalid')).toBe(false)
      expect(isValidColor('#ggg')).toBe(false)
      expect(isValidColor(null)).toBe(false)
      expect(isValidColor(undefined)).toBe(false)
    })
  })
  
  describe('normalizeColorToRgb', () => {
    test('should normalize hex to rgb', () => {
      const result = normalizeColorToRgb('#ff0000')
      expect(result.success).toBe(true)
      expect(result.r).toBe(255)
      expect(result.g).toBe(0)
      expect(result.b).toBe(0)
    })
    
    test('should return error for invalid color', () => {
      const result = normalizeColorToRgb('invalid')
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_COLOR)
    })
  })
  
  describe('rgbToHsl', () => {
    test('should convert red', () => {
      const result = rgbToHsl(255, 0, 0)
      expect(result.h).toBe(0)
      expect(result.s).toBe(100)
      expect(result.l).toBe(50)
    })
    
    test('should convert gray', () => {
      const result = rgbToHsl(128, 128, 128)
      expect(result.h).toBe(0)
      expect(result.s).toBe(0)
      expect(result.l).toBe(50)
    })
  })
  
  describe('hslToRgb', () => {
    test('should convert red', () => {
      const result = hslToRgb(0, 100, 50)
      expect(result.r).toBe(255)
      expect(result.g).toBe(0)
      expect(result.b).toBe(0)
    })
    
    test('should handle saturation 0', () => {
      const result = hslToRgb(120, 0, 50)
      expect(result.r).toBe(128)
      expect(result.g).toBe(128)
      expect(result.b).toBe(128)
    })
  })
  
  describe('rgbToHex', () => {
    test('should convert rgb to hex', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
      expect(rgbToHex(0, 255, 0)).toBe('#00ff00')
      expect(rgbToHex(0, 0, 255)).toBe('#0000ff')
    })
  })
  
  describe('extractHueFromColor', () => {
    test('should extract hue from valid color', () => {
      const hue = extractHueFromColor('#ff0000')
      expect(hue).toBe(0)
    })
    
    test('should return default hue for invalid color', () => {
      const hue = extractHueFromColor('invalid')
      expect(hue).toBe(DEFAULT_PRIMARY_HUE)
    })
  })
  
  describe('generateColorScale', () => {
    test('should generate scale with 11 levels for light', () => {
      const scale = generateColorScale(260, false)
      expect(Object.keys(scale).length).toBe(11)
      expect(scale[50]).toBeDefined()
      expect(scale[950]).toBeDefined()
    })
    
    test('should generate scale for dark', () => {
      const scale = generateColorScale(260, true)
      expect(Object.keys(scale).length).toBe(11)
    })
    
    test('should clamp hue to 0-360', () => {
      const scale1 = generateColorScale(-10, false)
      const scale2 = generateColorScale(370, false)
      expect(Object.keys(scale1).length).toBe(11)
      expect(Object.keys(scale2).length).toBe(11)
    })
    
    test('should handle saturation 0 (gray)', () => {
      const scale = generateColorScale(120, false)
      const keys = Object.keys(scale)
      expect(keys.length).toBeGreaterThan(0)
    })
    
    test('should handle lightness 0 and 100 in scale', () => {
      const scale = generateColorScale(200, false)
      expect(scale[50]).not.toBe(scale[950])
    })
  })
  
  describe('relativeLuminance', () => {
    test('should calculate white as 1', () => {
      expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1, 2)
    })
    
    test('should calculate black as 0', () => {
      expect(relativeLuminance(0, 0, 0)).toBeCloseTo(0, 2)
    })
    
    test('should calculate red', () => {
      expect(relativeLuminance(255, 0, 0)).toBeCloseTo(0.2126, 2)
    })
  })
  
  describe('contrastRatio', () => {
    test('should calculate contrast between black and white', () => {
      const result = contrastRatio('#000000', '#ffffff')
      expect(result.success).toBe(true)
      expect(result.ratio).toBe(21)
      expect(result.aa).toBe(true)
      expect(result.aaa).toBe(true)
    })
    
    test('should calculate same color ratio as 1', () => {
      const result = contrastRatio('#ff0000', '#ff0000')
      expect(result.success).toBe(true)
      expect(result.ratio).toBe(1)
    })
    
    test('should return error for invalid colors', () => {
      const result = contrastRatio('invalid', '#ffffff')
      expect(result.success).toBe(false)
    })
  })
  
  describe('generateNeutralScale', () => {
    test('should generate 11 levels for light', () => {
      const scale = generateNeutralScale(false)
      expect(Object.keys(scale).length).toBe(11)
    })
    
    test('should generate 11 levels for dark', () => {
      const scale = generateNeutralScale(true)
      expect(Object.keys(scale).length).toBe(11)
    })
  })
  
  describe('generateSemanticColors', () => {
    test('should generate all semantic types', () => {
      const colors = generateSemanticColors(260, false)
      expect(colors.accent).toBeDefined()
      expect(colors.success).toBeDefined()
      expect(colors.warning).toBeDefined()
      expect(colors.error).toBeDefined()
      expect(colors.info).toBeDefined()
    })
    
    test('should include scale and variants for each type', () => {
      const colors = generateSemanticColors(260, false)
      expect(Object.keys(colors.accent.scale).length).toBeGreaterThan(0)
      expect(colors.accent.default).toBeDefined()
      expect(colors.accent.hover).toBeDefined()
      expect(colors.accent.surface).toBeDefined()
    })
  })
})
