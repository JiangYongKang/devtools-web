import { describe, test, expect } from 'vitest'
import {
  parseUserAgent,
  detectBrowser,
  detectOS,
  detectEngine,
  detectBot,
  detectDeviceType,
  buildNormalizedTable,
  buildSummaryLine,
  parseParenthesesContent,
  parseKeyValuePairs,
  extractMajorVersion,
  highlightSearchResults,
} from '../logic/parser'
import { DEVICE_TYPES } from '../logic/constants'
import { ERROR_CODES } from '../logic/errors'

describe('User-Agent Parser', () => {
  const CHROME_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  const FIREFOX_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
  const SAFARI_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
  const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  const CURL = 'curl/8.1.0'

  describe('extractMajorVersion', () => {
    test('should extract major version from semver', () => {
      expect(extractMajorVersion('120.0.0.0')).toBe('120')
      expect(extractMajorVersion('121.0')).toBe('121')
      expect(extractMajorVersion('17.2')).toBe('17')
    })

    test('should handle single version number', () => {
      expect(extractMajorVersion('8')).toBe('8')
      expect(extractMajorVersion('100')).toBe('100')
    })

    test('should return null for null input', () => {
      expect(extractMajorVersion(null)).toBeNull()
      expect(extractMajorVersion(undefined)).toBeNull()
    })
  })

  describe('parseParenthesesContent', () => {
    test('should parse simple parentheses', () => {
      const result = parseParenthesesContent('Mozilla/5.0 (Windows NT 10.0) Chrome/120')
      expect(result.length).toBe(3)
      expect(result[0].type).toBe('token')
      expect(result[0].content).toBe('Mozilla/5.0')
      expect(result[1].type).toBe('parentheses')
      expect(result[1].content).toBe('Windows NT 10.0')
      expect(result[2].type).toBe('token')
      expect(result[2].content).toBe('Chrome/120')
    })

    test('should handle nested parentheses', () => {
      const result = parseParenthesesContent('Test (outer (inner) content) End')
      expect(result.length).toBe(3)
      expect(result[1].type).toBe('parentheses')
      expect(result[1].content).toBe('outer (inner) content')
    })

    test('should handle multiple parentheses', () => {
      const result = parseParenthesesContent('A (first) B (second) C')
      expect(result.length).toBe(5)
      expect(result[1].content).toBe('first')
      expect(result[3].content).toBe('second')
    })
  })

  describe('parseKeyValuePairs', () => {
    test('should parse semicolon-separated key-value pairs', () => {
      const result = parseKeyValuePairs('Windows NT 10.0; Win64; x64')
      expect(result.length).toBe(3)
      expect(result[0].value).toBe('Windows NT 10.0')
      expect(result[1].value).toBe('Win64')
      expect(result[2].value).toBe('x64')
    })

    test('should parse slash-separated key-value pairs', () => {
      const result = parseKeyValuePairs('Chrome/120.0.0.0; Safari/537.36')
      expect(result.length).toBe(2)
      expect(result[0].key).toBe('Chrome')
      expect(result[0].value).toBe('120.0.0.0')
      expect(result[1].key).toBe('Safari')
      expect(result[1].value).toBe('537.36')
    })

    test('should parse equals-separated key-value pairs', () => {
      const result = parseKeyValuePairs('Build/TP1A; key=value; test=123')
      expect(result[1].key).toBe('key')
      expect(result[1].value).toBe('value')
    })
  })

  describe('detectBrowser', () => {
    test('should detect Chrome', () => {
      const result = detectBrowser(CHROME_DESKTOP)
      expect(result.name).toBe('Chrome')
      expect(result.majorVersion).toBe('120')
    })

    test('should detect Firefox', () => {
      const result = detectBrowser(FIREFOX_DESKTOP)
      expect(result.name).toBe('Firefox')
      expect(result.majorVersion).toBe('121')
    })

    test('should detect Safari', () => {
      const result = detectBrowser(SAFARI_MOBILE)
      expect(result.name).toBe('Safari')
      expect(result.majorVersion).toBe('17')
    })

    test('should return Unknown for unrecognized browsers', () => {
      const result = detectBrowser('UnknownBrowser/1.0')
      expect(result.name).toBe('Unknown')
    })
  })

  describe('detectOS', () => {
    test('should detect Windows 10', () => {
      const result = detectOS(CHROME_DESKTOP)
      expect(result.name).toBe('Windows 10')
    })

    test('should detect iOS', () => {
      const result = detectOS(SAFARI_MOBILE)
      expect(result.name).toMatch(/iOS/)
    })
  })

  describe('detectEngine', () => {
    test('should detect Blink for Chrome', () => {
      const result = detectEngine(CHROME_DESKTOP)
      expect(result.name).toBe('Blink')
    })

    test('should detect Gecko for Firefox', () => {
      const result = detectEngine(FIREFOX_DESKTOP)
      expect(result.name).toBe('Gecko')
    })

    test('should detect WebKit for Safari', () => {
      const result = detectEngine(SAFARI_MOBILE)
      expect(result.name).toBe('WebKit')
    })
  })

  describe('detectBot', () => {
    test('should detect Googlebot', () => {
      const result = detectBot(GOOGLEBOT)
      expect(result.isBot).toBe(true)
      expect(result.name).toBe('Googlebot')
    })

    test('should detect cURL', () => {
      const result = detectBot(CURL)
      expect(result.isBot).toBe(true)
      expect(result.name).toBe('cURL')
    })

    test('should not detect regular browser as bot', () => {
      const result = detectBot(CHROME_DESKTOP)
      expect(result.isBot).toBe(false)
    })
  })

  describe('detectDeviceType', () => {
    test('should detect desktop for Chrome desktop', () => {
      const result = detectDeviceType(CHROME_DESKTOP)
      expect(result.type).toBe(DEVICE_TYPES.DESKTOP)
      expect(result.isDesktop).toBe(true)
      expect(result.isMobile).toBe(false)
    })

    test('should detect mobile for Safari iOS', () => {
      const result = detectDeviceType(SAFARI_MOBILE)
      expect(result.type).toBe(DEVICE_TYPES.MOBILE)
      expect(result.isMobile).toBe(true)
    })

    test('should detect bot for Googlebot', () => {
      const result = detectDeviceType(GOOGLEBOT)
      expect(result.type).toBe(DEVICE_TYPES.BOT)
      expect(result.isBot).toBe(true)
    })
  })

  describe('parseUserAgent', () => {
    test('should parse Chrome desktop UA successfully', () => {
      const result = parseUserAgent(CHROME_DESKTOP)
      expect(result.success).toBe(true)
      expect(result.result).not.toBeNull()
      expect(result.result.normalizedTable).toBeInstanceOf(Array)
      expect(result.result.normalizedTable.length).toBeGreaterThan(0)
    })

    test('should include summary line', () => {
      const result = parseUserAgent(CHROME_DESKTOP)
      expect(result.result.summaryLine).toContain('Chrome')
      expect(result.result.summaryLine).toContain('Windows')
    })

    test('should generate JSON export', () => {
      const result = parseUserAgent(CHROME_DESKTOP)
      const parsed = JSON.parse(result.result.jsonExportString)
      expect(parsed.raw).toBe(CHROME_DESKTOP)
      expect(parsed.browser.name).toBe('Chrome')
    })

    test('should return EMPTY_INPUT for empty string', () => {
      const result = parseUserAgent('')
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should return EMPTY_INPUT for whitespace-only string', () => {
      const result = parseUserAgent('   \n\t  ')
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should handle null input', () => {
      const result = parseUserAgent(null)
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.MALFORMED)
    })

    test('should handle undefined input', () => {
      const result = parseUserAgent(undefined)
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.MALFORMED)
    })

    test('should handle non-string input', () => {
      const result = parseUserAgent(12345)
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.MALFORMED)
    })

    test('should handle very long UA with truncation', () => {
      const baseUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      const padding = ' X-Custom-Extension=' + 'a'.repeat(5000)
      const longUA = baseUA + padding
      const result = parseUserAgent(longUA)
      expect(result.error).not.toBeNull()
      expect(result.error.code).toBe(ERROR_CODES.INPUT_TOO_LONG)
      expect(result.result.processed.length).toBe(4096)
    })

    test('should handle malformed UA gracefully', () => {
      const malformed = 'Mozilla/5.0 (X11; Linux [broken)extra'
      const result = parseUserAgent(malformed)
      expect(result.success).toBe(true)
      expect(result.result).not.toBeNull()
    })
  })

  describe('highlightSearchResults', () => {
    const table = [
      { key: 'browser.name', label: '浏览器', value: 'Chrome', category: 'browser' },
      { key: 'os.name', label: '操作系统', value: 'Windows', category: 'os' },
      { key: 'device.type', label: '设备', value: 'desktop', category: 'device' },
    ]

    test('should set isHighlighted to false when no search token', () => {
      const result = highlightSearchResults(table, '')
      expect(result).toHaveLength(3)
      expect(result[0].isHighlighted).toBe(false)
      expect(result[1].isHighlighted).toBe(false)
      expect(result[2].isHighlighted).toBe(false)
    })

    test('should highlight matching items', () => {
      const testTable = [
        { key: 'browser.name', label: '浏览器', value: 'Chrome', category: 'browser' },
        { key: 'os.name', label: '操作系统', value: 'Windows', category: 'os' },
        { key: 'device.type', label: '设备', value: 'desktop', category: 'device' },
      ]
      const result = highlightSearchResults(testTable, 'chrome')
      expect(result[0].isHighlighted).toBe(true)
      expect(result[1].isHighlighted).toBe(false)
    })

    test('should be case-insensitive', () => {
      const result1 = highlightSearchResults(table, 'CHROME')
      const result2 = highlightSearchResults(table, 'chrome')
      expect(result1[0].isHighlighted).toBe(true)
      expect(result2[0].isHighlighted).toBe(true)
    })

    test('should match in key, label, and value', () => {
      const result1 = highlightSearchResults(table, 'browser')
      expect(result1[0].isHighlighted).toBe(true)

      const result2 = highlightSearchResults(table, '操作系统')
      expect(result2[1].isHighlighted).toBe(true)

      const result3 = highlightSearchResults(table, 'desktop')
      expect(result3[2].isHighlighted).toBe(true)
    })
  })
})
