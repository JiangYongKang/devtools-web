import { describe, expect, test } from 'vitest'
import {
  buildFallbackChain,
  createI18nStore,
  extractPlaceholders,
  getDirection,
  getLocale,
  getValueFromPath,
  hasKey,
  hasNamespace,
  interpolate,
  isRTL,
  normalizeKey,
  normalizeLocale,
  normalizeNamespace,
  registerBundleInStore,
  resolveKeyFromStore,
  setLocale,
  t,
  validateKey,
} from '../logic/core.js'
import {
  DEFAULT_FALLBACK_LOCALE,
  DEFAULT_LOCALE,
  DEFAULT_NAMESPACE,
  ERROR_CODES,
  MAX_KEY_LENGTH,
} from '../logic/constants.js'

describe('core', () => {
  describe('normalizeLocale', () => {
    test('should normalize valid locale', () => {
      expect(normalizeLocale('en-US')).toBe('en-US')
      expect(normalizeLocale('  zh-CN  ')).toBe('zh-CN')
    })

    test('should return null for invalid inputs', () => {
      expect(normalizeLocale(null)).toBeNull()
      expect(normalizeLocale(undefined)).toBeNull()
      expect(normalizeLocale('')).toBeNull()
      expect(normalizeLocale(123)).toBeNull()
    })
  })

  describe('normalizeKey', () => {
    test('should normalize valid key', () => {
      expect(normalizeKey('greeting')).toBe('greeting')
      expect(normalizeKey('  deep.nested.key  ')).toBe('deep.nested.key')
    })

    test('should handle non-string inputs', () => {
      expect(normalizeKey(null)).toBeNull()
      expect(normalizeKey(undefined)).toBeNull()
      expect(normalizeKey(123)).toBeNull()
    })
  })

  describe('normalizeNamespace', () => {
    test('should normalize valid namespace', () => {
      expect(normalizeNamespace('errors')).toBe('errors')
      expect(normalizeNamespace('  common  ')).toBe('common')
    })

    test('should use default for invalid inputs', () => {
      expect(normalizeNamespace(null)).toBe(DEFAULT_NAMESPACE)
      expect(normalizeNamespace(undefined)).toBe(DEFAULT_NAMESPACE)
      expect(normalizeNamespace('')).toBe(DEFAULT_NAMESPACE)
      expect(normalizeNamespace(123)).toBe(DEFAULT_NAMESPACE)
    })
  })

  describe('validateKey', () => {
    test('should accept valid keys', () => {
      expect(validateKey('greeting').valid).toBe(true)
      expect(validateKey('deep.nested.key').valid).toBe(true)
      expect(validateKey('a'.repeat(MAX_KEY_LENGTH)).valid).toBe(true)
    })

    test('should reject null/undefined', () => {
      const result = validateKey(null)
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_KEY)
    })

    test('should reject empty keys', () => {
      const result = validateKey('   ')
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.EMPTY_KEY)
    })

    test('should reject overly long keys', () => {
      const result = validateKey('a'.repeat(MAX_KEY_LENGTH + 1))
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.KEY_TOO_LONG)
    })
  })

  describe('isRTL / getDirection', () => {
    test('should detect Arabic RTL', () => {
      expect(isRTL('ar')).toBe(true)
      expect(isRTL('ar-EG')).toBe(true)
      expect(getDirection('ar')).toBe('rtl')
    })

    test('should detect Hebrew RTL', () => {
      expect(isRTL('he')).toBe(true)
      expect(isRTL('he-IL')).toBe(true)
      expect(getDirection('he-IL')).toBe('rtl')
    })

    test('should detect LTR locales', () => {
      expect(isRTL('en-US')).toBe(false)
      expect(isRTL('zh-CN')).toBe(false)
      expect(getDirection('en-US')).toBe('ltr')
    })

    test('should handle invalid inputs', () => {
      expect(isRTL(null)).toBe(false)
      expect(isRTL(undefined)).toBe(false)
      expect(getDirection(null)).toBe('ltr')
    })
  })

  describe('interpolate', () => {
    test('should replace placeholders with values', () => {
      expect(interpolate('Hello, {{name}}!', { name: 'Alice' })).toBe('Hello, Alice!')
    })

    test('should handle multiple placeholders', () => {
      expect(
        interpolate('{{count}} items from {{user}}', { count: 5, user: 'Bob' })
      ).toBe('5 items from Bob')
    })

    test('should leave unmatched placeholders', () => {
      expect(
        interpolate('Hello, {{name}}! You have {{count}} items.', { name: 'Alice' })
      ).toBe('Hello, Alice! You have {{count}} items.')
    })

    test('should handle null/undefined values', () => {
      expect(interpolate('Test: {{name}}', { name: null })).toBe('Test: ')
      expect(interpolate('Test: {{name}}', { name: undefined })).toBe('Test: ')
    })

    test('should handle null/undefined template', () => {
      expect(interpolate(null, {})).toBe('')
      expect(interpolate(undefined, {})).toBe('')
    })

    test('should handle non-string template', () => {
      expect(interpolate(123, {})).toBe('123')
    })

    test('should handle empty params', () => {
      expect(interpolate('Hello, {{name}}!', {})).toBe('Hello, {{name}}!')
      expect(interpolate('Hello, {{name}}!', null)).toBe('Hello, {{name}}!')
    })
  })

  describe('extractPlaceholders', () => {
    test('should extract placeholder names', () => {
      expect(extractPlaceholders('Hello, {{name}}! You have {{count}} items.')).toEqual(
        expect.arrayContaining(['name', 'count'])
      )
    })

    test('should handle duplicates', () => {
      expect(extractPlaceholders('{{name}} and {{name}}')).toEqual(['name'])
    })

    test('should return empty for non-strings', () => {
      expect(extractPlaceholders(null)).toEqual([])
      expect(extractPlaceholders(123)).toEqual([])
    })
  })

  describe('getValueFromPath', () => {
    test('should get direct key', () => {
      const obj = { greeting: 'Hello' }
      expect(getValueFromPath(obj, 'greeting')).toBe('Hello')
    })

    test('should get nested key', () => {
      const obj = { deep: { nested: { key: 'value' } } }
      expect(getValueFromPath(obj, 'deep.nested.key')).toBe('value')
    })

    test('should return undefined for missing keys', () => {
      const obj = { greeting: 'Hello' }
      expect(getValueFromPath(obj, 'missing')).toBeUndefined()
      expect(getValueFromPath(obj, 'deep.nested')).toBeUndefined()
    })

    test('should handle null/undefined inputs', () => {
      expect(getValueFromPath(null, 'key')).toBeUndefined()
      expect(getValueFromPath({}, null)).toBeUndefined()
    })
  })

  describe('buildFallbackChain', () => {
    test('should build chain for locale with fallback', () => {
      const chain = buildFallbackChain('zh-CN', 'en-US')
      expect(chain).toContain('zh-CN')
      expect(chain).toContain('zh')
      expect(chain).toContain('en-US')
      expect(chain).toContain('en')
    })

    test('should handle only locale', () => {
      const chain = buildFallbackChain('en-US', null)
      expect(chain).toContain('en-US')
      expect(chain).toContain('en')
    })

    test('should deduplicate', () => {
      const chain = buildFallbackChain('en-US', 'en-US')
      expect(chain.filter((l) => l === 'en-US').length).toBe(1)
    })
  })

  describe('i18n store', () => {
    test('should create store with defaults', () => {
      const store = createI18nStore()
      expect(store.locale).toBe(DEFAULT_LOCALE)
      expect(store.fallbackLocale).toBe(DEFAULT_FALLBACK_LOCALE)
      expect(store.loaded).toBeDefined()
    })

    test('should accept custom options', () => {
      const store = createI18nStore({
        defaultLocale: 'zh-CN',
        fallbackLocale: 'en-US',
      })
      expect(store.locale).toBe('zh-CN')
      expect(store.fallbackLocale).toBe('en-US')
    })

    test('should set locale', () => {
      const store = createI18nStore()
      const result = setLocale(store, 'zh-CN')
      expect(result.success).toBe(true)
      expect(getLocale(store)).toBe('zh-CN')
    })

    test('should reject invalid locale', () => {
      const store = createI18nStore()
      const result = setLocale(store, null)
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_LOCALE)
    })

    test('should register and retrieve namespace', () => {
      const store = createI18nStore()
      const bundle = { greeting: 'Hello' }
      const registerResult = registerBundleInStore(store, 'en-US', 'common', bundle)
      expect(registerResult.success).toBe(true)
      expect(hasNamespace(store, 'en-US', 'common')).toBe(true)
    })

    test('should translate with t()', () => {
      const store = createI18nStore()
      registerBundleInStore(store, 'en-US', 'common', { greeting: 'Hello, {{name}}!' })
      setLocale(store, 'en-US')
      expect(t(store, 'greeting', { name: 'World' })).toBe('Hello, World!')
    })

    test('should return key as-is when not found', () => {
      const store = createI18nStore()
      registerBundleInStore(store, 'en-US', 'common', { existing: 'value' })
      setLocale(store, 'en-US')
      expect(t(store, 'non.existent.key')).toBe('non.existent.key')
    })

    test('should check key existence', () => {
      const store = createI18nStore()
      registerBundleInStore(store, 'en-US', 'common', { greeting: 'Hello' })
      setLocale(store, 'en-US')
      expect(hasKey(store, 'greeting')).toBe(true)
      expect(hasKey(store, 'missing')).toBe(false)
    })

    test('should use fallback chain', () => {
      const store = createI18nStore({
        defaultLocale: 'zh-CN',
        fallbackLocale: 'en-US',
      })
      registerBundleInStore(store, 'en-US', 'common', {
        greeting: 'Hello',
        onlyInFallback: 'This is in en-US only',
      })
      registerBundleInStore(store, 'zh-CN', 'common', {
        greeting: '你好',
      })
      setLocale(store, 'zh-CN')
      expect(t(store, 'greeting')).toBe('你好')
      expect(t(store, 'onlyInFallback')).toBe('This is in en-US only')
    })

    test('should support namespace syntax in key', () => {
      const store = createI18nStore()
      registerBundleInStore(store, 'en-US', 'errors', { HTTP_404: 'Not Found' })
      registerBundleInStore(store, 'en-US', 'common', { greeting: 'Hello' })
      setLocale(store, 'en-US')
      expect(t(store, 'errors:HTTP_404')).toBe('Not Found')
      expect(t(store, 'common:greeting')).toBe('Hello')
    })

    test('should resolve key with detailed info', () => {
      const store = createI18nStore()
      registerBundleInStore(store, 'en-US', 'common', { greeting: 'Hello' })
      setLocale(store, 'en-US')
      const result = resolveKeyFromStore(store, 'greeting')
      expect(result.found).toBe(true)
      expect(result.value).toBe('Hello')
      expect(result.locale).toBe('en-US')
      expect(result.namespace).toBe('common')
    })
  })
})
