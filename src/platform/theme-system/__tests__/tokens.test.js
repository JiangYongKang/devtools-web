import { describe, expect, test } from 'vitest'
import {
  generateTokenSet,
  generateLightTokenSet,
  generateDarkTokenSet,
  generateDomainTokenSets,
  getAllDomainsTokenSets,
  tokensToCSSVars,
  createThemeSchema,
  getTokenKeys,
  validateTokenSetConsistency,
  SPACING_SCALE,
  RADIUS_SCALE,
  FONT_SCALE,
  SHADOWS,
  MOTION,
  Z_INDEX,
} from '../logic/tokens.js'
import { DOMAINS, DEFAULT_PRIMARY_HUE, CURRENT_THEME_SCHEMA_VERSION } from '../logic/constants.js'

describe('tokens', () => {
  describe('base scales', () => {
    test('spacing scale should have expected keys', () => {
      expect(Object.keys(SPACING_SCALE).length).toBeGreaterThan(0)
      expect(SPACING_SCALE['0']).toBe('0px')
      expect(SPACING_SCALE['4']).toBe('16px')
    })
    
    test('radius scale should have expected keys', () => {
      expect(RADIUS_SCALE.none).toBe('0px')
      expect(RADIUS_SCALE.base).toBe('8px')
      expect(RADIUS_SCALE.full).toBe('9999px')
    })
    
    test('font scale should have expected keys', () => {
      expect(FONT_SCALE.base).toBe('1rem')
      expect(FONT_SCALE['2xl']).toBe('1.5rem')
    })
    
    test('shadows should have expected keys', () => {
      expect(SHADOWS.sm).toBeDefined()
      expect(SHADOWS['2xl']).toBeDefined()
    })
    
    test('motion should have expected keys', () => {
      expect(MOTION['0']).toBe('0s')
      expect(MOTION['300']).toBe('300ms')
    })
    
    test('z-index should have expected keys', () => {
      expect(Z_INDEX['0']).toBe('0')
      expect(Z_INDEX['50']).toBe('50')
    })
  })
  
  describe('generateTokenSet', () => {
    test('should generate token set with all categories', () => {
      const tokens = generateTokenSet()
      const keys = Object.keys(tokens)
      
      expect(keys.length).toBeGreaterThan(0)
    })
    
    test('should include color tokens', () => {
      const tokens = generateTokenSet()
      expect(tokens['-background-default']).toBeDefined()
      expect(tokens['-text-default']).toBeDefined()
      expect(tokens['-accent-default']).toBeDefined()
    })
    
    test('should include spacing tokens', () => {
      const tokens = generateTokenSet()
      expect(tokens['-spacing-4']).toBeDefined()
    })
    
    test('should include radius tokens', () => {
      const tokens = generateTokenSet()
      expect(tokens['-radius-base']).toBeDefined()
    })
    
    test('should include typography tokens', () => {
      const tokens = generateTokenSet()
      expect(tokens['-font-size-base']).toBeDefined()
      expect(tokens['-font-family-sans']).toBeDefined()
    })
    
    test('should include shadow tokens', () => {
      const tokens = generateTokenSet()
      expect(tokens['-shadow-base']).toBeDefined()
    })
    
    test('should include motion tokens', () => {
      const tokens = generateTokenSet()
      expect(tokens['-motion-300']).toBeDefined()
    })
    
    test('should include z-index tokens', () => {
      const tokens = generateTokenSet()
      expect(tokens['-z-50']).toBeDefined()
    })
  })
  
  describe('light vs dark tokens', () => {
    test('light and dark should have same keys', () => {
      const light = generateLightTokenSet()
      const dark = generateDarkTokenSet()
      
      const result = validateTokenSetConsistency(light, dark)
      expect(result.valid).toBe(true)
    })
    
    test('light and dark should have different values', () => {
      const light = generateLightTokenSet()
      const dark = generateDarkTokenSet()
      
      expect(light['-background-default']).not.toBe(dark['-background-default'])
      expect(light['-text-default']).not.toBe(dark['-text-default'])
    })
  })
  
  describe('domain prefix', () => {
    test('should add domain prefix', () => {
      const tokens = generateTokenSet({ domain: DOMAINS.SHELL })
      expect(tokens['shell-background-default']).toBeDefined()
      expect(tokens['shell-spacing-4']).toBeDefined()
    })
    
    test('should generate domain token sets', () => {
      const sets = generateDomainTokenSets(DOMAINS.TOOL)
      expect(sets.light).toBeDefined()
      expect(sets.dark).toBeDefined()
      expect(sets.light['tool-background-default']).toBeDefined()
    })
    
    test('should generate all domain sets', () => {
      const all = getAllDomainsTokenSets()
      expect(all[DOMAINS.SHELL]).toBeDefined()
      expect(all[DOMAINS.TOOL]).toBeDefined()
      expect(all[DOMAINS.CODE]).toBeDefined()
    })
  })
  
  describe('tokensToCSSVars', () => {
    test('should convert tokens to CSS vars', () => {
      const tokens = generateTokenSet()
      const css = tokensToCSSVars(tokens)
      
      expect(typeof css).toBe('string')
      expect(css.length).toBeGreaterThan(0)
      expect(css).toContain('--')
    })
  })
  
  describe('createThemeSchema', () => {
    test('should create valid schema', () => {
      const schema = createThemeSchema()
      
      expect(schema.version).toBe(CURRENT_THEME_SCHEMA_VERSION)
      expect(schema.name).toBe('default')
      expect(schema.primaryHue).toBe(DEFAULT_PRIMARY_HUE)
      expect(schema.tokens.light).toBeDefined()
      expect(schema.tokens.dark).toBeDefined()
      expect(schema.createdAt).toBeDefined()
    })
    
    test('should accept custom options', () => {
      const schema = createThemeSchema({
        name: 'custom',
        primaryHue: 200,
        radiusBase: 12,
      })
      
      expect(schema.name).toBe('custom')
      expect(schema.primaryHue).toBe(200)
      expect(schema.radiusBase).toBe(12)
    })
  })
  
  describe('getTokenKeys', () => {
    test('should return sorted keys', () => {
      const tokens = generateTokenSet()
      const keys = getTokenKeys(tokens)
      
      expect(Array.isArray(keys)).toBe(true)
      expect(keys.length).toBe(Object.keys(tokens).length)
    })
  })
  
  describe('validateTokenSetConsistency', () => {
    test('should validate consistent sets', () => {
      const light = generateLightTokenSet()
      const dark = generateDarkTokenSet()
      
      const result = validateTokenSetConsistency(light, dark)
      expect(result.valid).toBe(true)
    })
    
    test('should detect missing keys', () => {
      const tokens1 = generateLightTokenSet()
      const tokens2 = generateLightTokenSet()
      delete tokens2['-spacing-4']
      
      const result = validateTokenSetConsistency(tokens1, tokens2)
      expect(result.valid).toBe(false)
      expect(result.missingIn2).toContain('-spacing-4')
    })
  })
})
