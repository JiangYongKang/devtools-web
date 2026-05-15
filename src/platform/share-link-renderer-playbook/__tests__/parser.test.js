import { describe, expect, test } from 'vitest'
import {
    DEFAULT_OPTIONS,
    OPEN_STRATEGY,
    RISK_FLAGS,
} from '../logic/constants.js'
import {
    detectOpenStrategy,
    hasAbnormalDoubleSlash,
    hasControlCharacters,
    hasOAuthState,
    hasUserCredentials,
    hasUtmParams,
    isIPv6Literal,
    isPunycode,
    maskSensitiveParams,
    parseShareLink,
    stripUtmParams,
    summarizePath
} from '../logic/parser.js'

describe('parser module', () => {
  describe('hasControlCharacters', () => {
    test('should detect control characters', () => {
      expect(hasControlCharacters('https://example.com\x00')).toBe(true)
      expect(hasControlCharacters('https://example.com\x1F')).toBe(true)
      expect(hasControlCharacters('https://example.com\x7F')).toBe(true)
    })

    test('should return false for normal strings', () => {
      expect(hasControlCharacters('https://example.com')).toBe(false)
      expect(hasControlCharacters('hello world')).toBe(false)
      expect(hasControlCharacters('')).toBe(false)
    })
  })

  describe('hasAbnormalDoubleSlash', () => {
    test('should detect double slashes after protocol', () => {
      expect(hasAbnormalDoubleSlash('https://example.com//path')).toBe(true)
      expect(hasAbnormalDoubleSlash('https://example.com/path//to//file')).toBe(true)
    })

    test('should not consider protocol slashes as abnormal', () => {
      expect(hasAbnormalDoubleSlash('https://example.com')).toBe(false)
      expect(hasAbnormalDoubleSlash('https://example.com/path/to/file')).toBe(false)
    })

    test('should detect double slashes in urls without protocol', () => {
      expect(hasAbnormalDoubleSlash('//example.com//path')).toBe(true)
    })
  })

  describe('isPunycode', () => {
    test('should detect punycode hostnames', () => {
      expect(isPunycode('xn--fiqs8s.xn--fiqz9s')).toBe(true)
      expect(isPunycode('xn--bcher-kva.ch')).toBe(true)
    })

    test('should return false for normal hostnames', () => {
      expect(isPunycode('example.com')).toBe(false)
      expect(isPunycode('www.google.com')).toBe(false)
    })
  })

  describe('isIPv6Literal', () => {
    test('should detect IPv6 literals', () => {
      expect(isIPv6Literal('[::1]')).toBe(true)
      expect(isIPv6Literal('[2001:db8:85a3:8d3:1319:8a2e:370:7348]')).toBe(true)
    })

    test('should return false for normal hostnames', () => {
      expect(isIPv6Literal('example.com')).toBe(false)
      expect(isIPv6Literal('192.168.1.1')).toBe(false)
    })
  })

  describe('hasUserCredentials', () => {
    test('should detect user credentials in URL', () => {
      const urlWithCreds = new URL('https://user:pass@example.com')
      expect(hasUserCredentials(urlWithCreds)).toBe(true)
    })

    test('should return false for URLs without credentials', () => {
      const url = new URL('https://example.com')
      expect(hasUserCredentials(url)).toBe(false)
    })
  })

  describe('hasUtmParams', () => {
    test('should detect UTM parameters', () => {
      const params = new URLSearchParams('utm_source=twitter&utm_medium=social')
      expect(hasUtmParams(params, DEFAULT_OPTIONS.utmParams)).toBe(true)
    })

    test('should return false when no UTM params present', () => {
      const params = new URLSearchParams('foo=bar&baz=qux')
      expect(hasUtmParams(params, DEFAULT_OPTIONS.utmParams)).toBe(false)
    })
  })

  describe('hasOAuthState', () => {
    test('should detect OAuth state parameter', () => {
      const params = new URLSearchParams('state=abcdefghijklmnopqrstuvwxyz0123456789')
      expect(hasOAuthState(params)).toBe(true)
    })

    test('should return false for short state values', () => {
      const params = new URLSearchParams('state=short')
      expect(hasOAuthState(params)).toBe(false)
    })

    test('should return false when no state param', () => {
      const params = new URLSearchParams('foo=bar')
      expect(hasOAuthState(params)).toBe(false)
    })
  })

  describe('stripUtmParams', () => {
    test('should remove UTM parameters', () => {
      const params = new URLSearchParams('utm_source=twitter&foo=bar&utm_medium=social')
      const stripped = stripUtmParams(params, DEFAULT_OPTIONS.utmParams)
      expect(stripped.has('utm_source')).toBe(false)
      expect(stripped.has('utm_medium')).toBe(false)
      expect(stripped.has('foo')).toBe(true)
    })

    test('should return same params when no UTM params present', () => {
      const params = new URLSearchParams('foo=bar&baz=qux')
      const stripped = stripUtmParams(params, DEFAULT_OPTIONS.utmParams)
      expect(stripped.toString()).toBe('foo=bar&baz=qux')
    })
  })

  describe('summarizePath', () => {
    test('should return root for empty path', () => {
      expect(summarizePath('/')).toBe('/')
      expect(summarizePath('')).toBe('/')
    })

    test('should return full path for short paths', () => {
      expect(summarizePath('/api/users')).toBe('/api/users')
      expect(summarizePath('/a/b/c')).toBe('/a/b/c')
    })

    test('should summarize long paths', () => {
      const summary = summarizePath('/a/b/c/d/e/f/g')
      expect(summary).toContain('...')
      expect(summary).toContain('/a/b')
      expect(summary).toContain('/g')
    })
  })

  describe('maskSensitiveParams', () => {
    test('should mask state parameter', () => {
      const params = new URLSearchParams('state=abcdefghijklmnopqrstuvwxyz0123456789')
      const masked = maskSensitiveParams(params)
      expect(masked.get('state')).toContain('[HASH:')
    })

    test('should mask code parameter', () => {
      const params = new URLSearchParams('code=secret_code_12345')
      const masked = maskSensitiveParams(params)
      expect(masked.get('code')).toBe('[REDACTED]')
    })

    test('should mask token parameter', () => {
      const params = new URLSearchParams('token=secret_token_67890')
      const masked = maskSensitiveParams(params)
      expect(masked.get('token')).toBe('[REDACTED]')
    })

    test('should leave other params unchanged', () => {
      const params = new URLSearchParams('foo=bar&baz=qux')
      const masked = maskSensitiveParams(params)
      expect(masked.get('foo')).toBe('bar')
      expect(masked.get('baz')).toBe('qux')
    })
  })

  describe('detectOpenStrategy', () => {
    test('should detect external blank for http/https', () => {
      expect(detectOpenStrategy('https:', DEFAULT_OPTIONS.schemeWhitelist)).toBe(OPEN_STRATEGY.EXTERNAL_BLANK)
      expect(detectOpenStrategy('http:', DEFAULT_OPTIONS.schemeWhitelist)).toBe(OPEN_STRATEGY.EXTERNAL_BLANK)
    })

    test('should detect desktop deeplink for mailto/tel', () => {
      expect(detectOpenStrategy('mailto:', DEFAULT_OPTIONS.schemeWhitelist)).toBe(OPEN_STRATEGY.DESKTOP_DEEPLINK)
      expect(detectOpenStrategy('tel:', DEFAULT_OPTIONS.schemeWhitelist)).toBe(OPEN_STRATEGY.DESKTOP_DEEPLINK)
    })

    test('should detect mobile universal for unknown schemes', () => {
      expect(detectOpenStrategy('unknown:', DEFAULT_OPTIONS.schemeWhitelist)).toBe(OPEN_STRATEGY.MOBILE_UNIVERSAL)
    })
  })

  describe('parseShareLink', () => {
    test('should parse normal https URL correctly', () => {
      const result = parseShareLink('https://example.com/path?foo=bar#section')
      expect(result.raw).toBe('https://example.com/path?foo=bar#section')
      expect(result.canonical).toBe('https://example.com/path?foo=bar#section')
      expect(result.displayHost).toBe('example.com')
      expect(result.protocol).toBe('https:')
      expect(result.queryCount).toBe(1)
      expect(result.fragment).toBe('#section')
      expect(result.riskFlags).toHaveLength(0)
      expect(result.openStrategy).toBe(OPEN_STRATEGY.EXTERNAL_BLANK)
    })

    test('should detect punycode risk flag', () => {
      const result = parseShareLink('https://xn--fiqs8s.xn--fiqz9s/')
      expect(result.riskFlags.some(f => f.id === RISK_FLAGS.PUNYCODE.id)).toBe(true)
      expect(result.isIdn).toBe(true)
    })

    test('should detect user credentials risk flag', () => {
      const result = parseShareLink('https://user:password@example.com/')
      expect(result.riskFlags.some(f => f.id === RISK_FLAGS.USER_CREDENTIALS.id)).toBe(true)
      expect(result.hasCredentials).toBe(true)
    })

    test('should detect non-standard port risk flag', () => {
      const result = parseShareLink('https://example.com:8080/')
      expect(result.riskFlags.some(f => f.id === RISK_FLAGS.SUSPICIOUS_PORT.id)).toBe(true)
      expect(result.port).toBe('8080')
    })

    test('should detect IPv6 literal risk flag', () => {
      const result = parseShareLink('http://[::1]/')
      expect(result.riskFlags.some(f => f.id === RISK_FLAGS.IPV6_LITERAL.id)).toBe(true)
    })

    test('should detect UTM params risk flag and strip them', () => {
      const result = parseShareLink('https://example.com/?utm_source=twitter&foo=bar')
      expect(result.riskFlags.some(f => f.id === RISK_FLAGS.UTM_TAGS.id)).toBe(true)
      expect(result.strippedUtm).toBe('https://example.com/?foo=bar')
    })

    test('should detect OAuth state risk flag', () => {
      const result = parseShareLink('https://example.com/callback?state=abcdefghijklmnopqrstuvwxyz0123456789')
      expect(result.riskFlags.some(f => f.id === RISK_FLAGS.OAUTH_STATE.id)).toBe(true)
    })

    test('should detect unknown scheme risk flag', () => {
      const result = parseShareLink('unknown-scheme://somewhere/path')
      expect(result.riskFlags.some(f => f.id === RISK_FLAGS.UNKNOWN_SCHEME.id)).toBe(true)
    })

    test('should parse mailto URL correctly', () => {
      const result = parseShareLink('mailto:support@example.com?subject=Help')
      expect(result.protocol).toBe('mailto:')
      expect(result.openStrategy).toBe(OPEN_STRATEGY.DESKTOP_DEEPLINK)
      expect(result.canonical).toBe('mailto:support@example.com?subject=Help')
    })

    test('should parse tel URL correctly with query params', () => {
      const result = parseShareLink('tel:+8613800138000?phone=123')
      expect(result.protocol).toBe('tel:')
      expect(result.openStrategy).toBe(OPEN_STRATEGY.DESKTOP_DEEPLINK)
      expect(result.canonical).toBe('tel:+8613800138000?phone=123')
    })

    test('should throw error for empty input', () => {
      expect(() => parseShareLink('')).toThrow()
      expect(() => parseShareLink('   ')).toThrow()
    })

    test('should throw error for invalid URL', () => {
      expect(() => parseShareLink('not a valid url')).toThrow()
    })

    test('should throw error for URL exceeding max length', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(DEFAULT_OPTIONS.maxUrlLength)
      expect(() => parseShareLink(longUrl)).toThrow()
    })

    test('should mask sensitive params in result', () => {
      const result = parseShareLink('https://example.com/callback?code=secret123&token=abc456&state=abcdefghijklmnopqrstuvwxyz0123456789')
      expect(result.maskedParams).toContain('%5BREDACTED%5D')
      expect(result.maskedParams).toContain('%5BHASH%3A')
    })
  })
})
