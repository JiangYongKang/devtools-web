import { describe, expect, test, vi } from 'vitest'
import {
  resolveThemeMode,
  parseUrlParams,
  loadFromStorage,
  saveToStorage,
  getSystemDarkPreference,
  validateThemeSchema,
  resolveFinalConfig,
  generateThemeForMode,
  generateCssCustomProperties,
  getCriticalInlineScript,
  buildThemeManifest,
  extractTokensByCategory,
  searchTokens,
  filterTokens,
} from '../logic/core.js'
import {
  THEMES,
  DEFAULT_PRIMARY_HUE,
  DEFAULT_RADIUS,
  CURRENT_THEME_SCHEMA_VERSION,
  ERROR_CODES,
} from '../logic/constants.js'
import { createThemeSchema, generateLightTokenSet, generateDarkTokenSet } from '../logic/tokens.js'

describe('core', () => {
  describe('resolveThemeMode', () => {
    test('should resolve system preference to light', () => {
      expect(resolveThemeMode(THEMES.SYSTEM, false)).toBe(THEMES.LIGHT)
    })
    
    test('should resolve system preference to dark', () => {
      expect(resolveThemeMode(THEMES.SYSTEM, true)).toBe(THEMES.DARK)
    })
    
    test('should return explicit light', () => {
      expect(resolveThemeMode(THEMES.LIGHT, true)).toBe(THEMES.LIGHT)
    })
    
    test('should return explicit dark', () => {
      expect(resolveThemeMode(THEMES.DARK, false)).toBe(THEMES.DARK)
    })
  })
  
  describe('parseUrlParams', () => {
    test('should parse theme param', () => {
      const params = new URLSearchParams('theme=dark')
      const result = parseUrlParams(params)
      expect(result.theme).toBe(THEMES.DARK)
      expect(result.errors.length).toBe(0)
    })
    
    test('should parse primary color and extract hue', () => {
      const params = new URLSearchParams('primary=%23ff0000')
      const result = parseUrlParams(params)
      expect(result.primaryHue).toBe(0)
      expect(result.errors.length).toBe(0)
    })
    
    test('should parse radius param', () => {
      const params = new URLSearchParams('radius=12')
      const result = parseUrlParams(params)
      expect(result.radiusBase).toBe(12)
      expect(result.errors.length).toBe(0)
    })
    
    test('should handle invalid theme', () => {
      const params = new URLSearchParams('theme=invalid')
      const result = parseUrlParams(params)
      expect(result.theme).toBeNull()
      expect(result.errors.length).toBe(1)
      expect(result.errors[0].errorCode).toBe(ERROR_CODES.INVALID_THEME)
    })
    
    test('should handle invalid color', () => {
      const params = new URLSearchParams('primary=notacolor')
      const result = parseUrlParams(params)
      expect(result.primaryHue).toBeNull()
      expect(result.errors.length).toBe(1)
      expect(result.errors[0].errorCode).toBe(ERROR_CODES.INVALID_COLOR)
    })
    
    test('should handle invalid radius', () => {
      const params = new URLSearchParams('radius=notanumber')
      const result = parseUrlParams(params)
      expect(result.radiusBase).toBeNull()
      expect(result.errors.length).toBe(1)
      expect(result.errors[0].errorCode).toBe(ERROR_CODES.INVALID_RADIUS)
    })
    
    test('should return null params for empty searchParams', () => {
      const result = parseUrlParams({})
      expect(result.theme).toBeNull()
      expect(result.primaryHue).toBeNull()
      expect(result.radiusBase).toBeNull()
    })
  })
  
  describe('loadFromStorage', () => {
    test('should return null for null storage', () => {
      expect(loadFromStorage(null)).toBeNull()
    })
    
    test('should load from mock storage', () => {
      const mockStorage = {
        getItem: vi.fn(() => JSON.stringify({ theme: THEMES.DARK })),
      }
      const result = loadFromStorage(mockStorage)
      expect(result.theme).toBe(THEMES.DARK)
    })
    
    test('should handle invalid JSON', () => {
      const mockStorage = {
        getItem: vi.fn(() => 'invalid json'),
      }
      expect(loadFromStorage(mockStorage)).toBeNull()
    })
    
    test('should handle missing key', () => {
      const mockStorage = {
        getItem: vi.fn(() => null),
      }
      expect(loadFromStorage(mockStorage)).toBeNull()
    })
  })
  
  describe('saveToStorage', () => {
    test('should fail for null storage', () => {
      const result = saveToStorage(null, {})
      expect(result.success).toBe(false)
    })
    
    test('should save to mock storage', () => {
      let stored = null
      const mockStorage = {
        setItem: vi.fn((key, value) => { stored = value }),
      }
      const result = saveToStorage(mockStorage, { theme: THEMES.DARK })
      expect(result.success).toBe(true)
      expect(stored).toBe(JSON.stringify({ theme: THEMES.DARK }))
    })
    
    test('should handle exceptions', () => {
      const mockStorage = {
        setItem: vi.fn(() => { throw new Error('full') }),
      }
      const result = saveToStorage(mockStorage, {})
      expect(result.success).toBe(false)
    })
  })
  
  describe('getSystemDarkPreference', () => {
    test('should return false for null window', () => {
      expect(getSystemDarkPreference(null)).toBe(false)
    })
    
    test('should detect light system preference', () => {
      const mockWindow = {
        matchMedia: vi.fn(() => ({ matches: false })),
      }
      expect(getSystemDarkPreference(mockWindow)).toBe(false)
    })
    
    test('should detect dark system preference', () => {
      const mockWindow = {
        matchMedia: vi.fn(() => ({ matches: true })),
      }
      expect(getSystemDarkPreference(mockWindow)).toBe(true)
    })
  })
  
  describe('validateThemeSchema', () => {
    test('should validate correct schema', () => {
      const schema = createThemeSchema()
      const result = validateThemeSchema(schema)
      expect(result.valid).toBe(true)
    })
    
    test('should reject null', () => {
      const result = validateThemeSchema(null)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.SCHEMA_VALIDATION_FAILED)
    })
    
    test('should reject invalid version', () => {
      const schema = {
        version: '99.0.0',
        tokens: { light: {}, dark: {} },
      }
      const result = validateThemeSchema(schema)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.UNKNOWN_VERSION)
    })
    
    test('should reject missing tokens', () => {
      const schema = {
        version: CURRENT_THEME_SCHEMA_VERSION,
      }
      const result = validateThemeSchema(schema)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.SCHEMA_VALIDATION_FAILED)
    })
    
    test('should reject inconsistent token keys', () => {
      const light = generateLightTokenSet()
      const dark = generateDarkTokenSet()
      delete dark[Object.keys(dark)[0]]
      
      const schema = {
        version: CURRENT_THEME_SCHEMA_VERSION,
        tokens: { light, dark },
      }
      const result = validateThemeSchema(schema)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.SCHEMA_VALIDATION_FAILED)
    })
  })
  
  describe('resolveFinalConfig', () => {
    test('should use defaults when nothing provided', () => {
      const config = resolveFinalConfig()
      expect(config.themePreference).toBe(THEMES.SYSTEM)
      expect(config.primaryHue).toBe(DEFAULT_PRIMARY_HUE)
      expect(config.radiusBase).toBe(DEFAULT_RADIUS)
    })
    
    test('should use storage data', () => {
      const config = resolveFinalConfig({
        storageData: {
          theme: THEMES.DARK,
          primaryHue: 200,
          radiusBase: 12,
        },
      })
      expect(config.themePreference).toBe(THEMES.DARK)
      expect(config.primaryHue).toBe(200)
      expect(config.radiusBase).toBe(12)
    })
    
    test('URL params should override storage', () => {
      const config = resolveFinalConfig({
        storageData: { theme: THEMES.DARK, primaryHue: 200 },
        urlParams: { theme: THEMES.LIGHT, primaryHue: 100 },
      })
      expect(config.themePreference).toBe(THEMES.LIGHT)
      expect(config.primaryHue).toBe(100)
    })
    
    test('should resolve system preference', () => {
      const config = resolveFinalConfig({
        storageData: { theme: THEMES.SYSTEM },
        systemDark: true,
      })
      expect(config.themePreference).toBe(THEMES.SYSTEM)
      expect(config.resolvedTheme).toBe(THEMES.DARK)
    })
  })
  
  describe('generateThemeForMode', () => {
    test('should generate light theme', () => {
      const tokens = generateThemeForMode(THEMES.LIGHT)
      expect(Object.keys(tokens).length).toBeGreaterThan(0)
    })
    
    test('should generate dark theme', () => {
      const tokens = generateThemeForMode(THEMES.DARK)
      expect(Object.keys(tokens).length).toBeGreaterThan(0)
    })
    
    test('should accept custom hue', () => {
      const tokens = generateThemeForMode(THEMES.LIGHT, { primaryHue: 200 })
      expect(tokens).toBeDefined()
    })
  })
  
  describe('generateCssCustomProperties', () => {
    test('should generate CSS with :root selector', () => {
      const tokens = generateLightTokenSet()
      const css = generateCssCustomProperties(tokens)
      expect(css).toContain(':root')
    })
    
    test('should accept custom selector', () => {
      const tokens = generateLightTokenSet()
      const css = generateCssCustomProperties(tokens, '[data-theme="dark"]')
      expect(css).toContain('[data-theme="dark"]')
    })
  })
  
  describe('getCriticalInlineScript', () => {
    test('should return a string', () => {
      const script = getCriticalInlineScript()
      expect(typeof script).toBe('string')
      expect(script.length).toBeGreaterThan(0)
    })
    
    test('should use custom storage key', () => {
      const script = getCriticalInlineScript({ storageKey: 'custom-key' })
      expect(script).toContain('custom-key')
    })
  })
  
  describe('buildThemeManifest', () => {
    test('should create manifest', () => {
      const manifest = buildThemeManifest()
      expect(manifest.version).toBe(CURRENT_THEME_SCHEMA_VERSION)
      expect(manifest.tokens.light).toBeDefined()
      expect(manifest.tokens.dark).toBeDefined()
    })
  })
  
  describe('extractTokensByCategory', () => {
    test('should extract spacing tokens', () => {
      const tokens = generateLightTokenSet()
      const extracted = extractTokensByCategory(tokens, 'spacing')
      expect(Object.keys(extracted).length).toBeGreaterThan(0)
      for (const key of Object.keys(extracted)) {
        expect(key.includes('spacing')).toBe(true)
      }
    })
    
    test('should return empty for unknown category', () => {
      const tokens = generateLightTokenSet()
      const extracted = extractTokensByCategory(tokens, 'unknown')
      expect(Object.keys(extracted).length).toBe(0)
    })
  })
  
  describe('searchTokens', () => {
    test('should search by key', () => {
      const tokens = generateLightTokenSet()
      const result = searchTokens(tokens, 'background')
      for (const key of Object.keys(result)) {
        expect(key.toLowerCase().includes('background')).toBe(true)
      }
    })
    
    test('should return all tokens for empty query', () => {
      const tokens = generateLightTokenSet()
      const result = searchTokens(tokens, '')
      expect(Object.keys(result).length).toBe(Object.keys(tokens).length)
    })
  })
  
  describe('filterTokens', () => {
    test('should apply search and category filter', () => {
      const tokens = generateLightTokenSet()
      const result = filterTokens(tokens, {
        search: 'default',
        category: 'background',
      })
      expect(Object.keys(result).length).toBeGreaterThan(0)
    })
  })
})
