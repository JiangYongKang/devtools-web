import { describe, test, expect } from 'vitest'
import {
  interpretUserAgent,
  EXAMPLE_UAS,
  EXAMPLE_LABELS,
  ERROR_CODES,
} from '../logic'

describe('Main Logic - interpretUserAgent', () => {
  describe('basic parsing', () => {
    test('should parse Chrome desktop UA', () => {
      const result = interpretUserAgent({
        uaString: EXAMPLE_UAS.desktopChrome,
      })
      
      expect(result.success).toBe(true)
      expect(result.result.normalizedTable.length).toBeGreaterThan(0)
      expect(result.result.summaryLine).toContain('Chrome')
      expect(result.result.jsonExportString).toBeTruthy()
    })

    test('should parse Firefox desktop UA', () => {
      const result = interpretUserAgent({
        uaString: EXAMPLE_UAS.desktopFirefox,
      })
      
      expect(result.success).toBe(true)
      expect(result.result.summaryLine).toContain('Firefox')
      expect(result.result.summaryLine).toContain('Gecko')
    })

    test('should parse mobile Safari UA', () => {
      const result = interpretUserAgent({
        uaString: EXAMPLE_UAS.mobileSafari,
      })
      
      expect(result.success).toBe(true)
      expect(result.result.summaryLine).toContain('Safari')
      expect(result.result.summaryLine).toContain('iOS')
      expect(result.result.summaryLine).toContain('移动')
    })

    test('should parse Googlebot UA', () => {
      const result = interpretUserAgent({
        uaString: EXAMPLE_UAS.googlebot,
      })
      
      expect(result.success).toBe(true)
      expect(result.result.summaryLine).toContain('爬虫')
      expect(result.result.summaryLine).toContain('Googlebot')
    })
  })

  describe('error handling', () => {
    test('should return error for empty string', () => {
      const result = interpretUserAgent({
        uaString: '',
      })
      
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.EMPTY_INPUT)
      expect(result.result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should return error for whitespace-only string', () => {
      const result = interpretUserAgent({
        uaString: '   \n\t  ',
      })
      
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should handle null uaString', () => {
      const result = interpretUserAgent({
        uaString: null,
      })
      
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.MALFORMED)
    })

    test('should handle undefined params', () => {
      const result = interpretUserAgent()
      
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should handle very long UA', () => {
      const baseUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      const padding = ' X-Custom-Extension=' + 'a'.repeat(5000)
      const longUA = baseUA + padding
      const result = interpretUserAgent({
        uaString: longUA,
      })
      
      expect(result.success).toBe(true)
      expect(result.error).not.toBeNull()
      expect(result.error.code).toBe(ERROR_CODES.INPUT_TOO_LONG)
    })
  })

  describe('comparison mode', () => {
    test('should compare two different UAs', () => {
      const result = interpretUserAgent({
        uaString: EXAMPLE_UAS.desktopChrome,
        comparisonPairEnabled: true,
        secondUaString: EXAMPLE_UAS.mobileSafari,
      })
      
      expect(result.success).toBe(true)
      expect(result.result.secondResult).not.toBeNull()
      expect(result.result.diffFields.length).toBeGreaterThan(0)
    })

    test('should return empty diff for identical UAs', () => {
      const result = interpretUserAgent({
        uaString: EXAMPLE_UAS.desktopChrome,
        comparisonPairEnabled: true,
        secondUaString: EXAMPLE_UAS.desktopChrome,
      })
      
      expect(result.result.diffFields.length).toBe(0)
    })

    test('should handle empty second UA', () => {
      const result = interpretUserAgent({
        uaString: EXAMPLE_UAS.desktopChrome,
        comparisonPairEnabled: true,
        secondUaString: '',
      })
      
      expect(result.success).toBe(true)
      expect(result.result.secondResult).toBeUndefined()
    })

    test('should not compare when disabled', () => {
      const result = interpretUserAgent({
        uaString: EXAMPLE_UAS.desktopChrome,
        comparisonPairEnabled: false,
        secondUaString: EXAMPLE_UAS.mobileSafari,
      })
      
      expect(result.result.secondResult).toBeUndefined()
      expect(result.result.diffFields.length).toBe(0)
    })
  })

  describe('search token', () => {
    test('should apply search highlighting', () => {
      const result = interpretUserAgent({
        uaString: EXAMPLE_UAS.desktopChrome,
        searchToken: 'Chrome',
      })
      
      const highlighted = result.result.normalizedTable.filter((item) => item.isHighlighted)
      expect(highlighted.length).toBeGreaterThan(0)
    })

    test('should not highlight when no search token', () => {
      const result = interpretUserAgent({
        uaString: EXAMPLE_UAS.desktopChrome,
        searchToken: '',
      })
      
      const highlighted = result.result.normalizedTable.filter((item) => item.isHighlighted)
      expect(highlighted.length).toBe(0)
    })

    test('should apply search to both UAs in comparison mode', () => {
      const result = interpretUserAgent({
        uaString: EXAMPLE_UAS.desktopChrome,
        comparisonPairEnabled: true,
        secondUaString: EXAMPLE_UAS.mobileChrome,
        searchToken: 'Chrome',
      })
      
      const highlighted1 = result.result.normalizedTable.filter((item) => item.isHighlighted)
      const highlighted2 = result.result.secondResult?.normalizedTable.filter((item) => item.isHighlighted) || []
      
      expect(highlighted1.length).toBeGreaterThan(0)
      expect(highlighted2.length).toBeGreaterThan(0)
    })
  })

  describe('JSON export', () => {
    test('should generate valid JSON', () => {
      const result = interpretUserAgent({
        uaString: EXAMPLE_UAS.desktopChrome,
      })
      
      const parsed = JSON.parse(result.result.jsonExportString)
      expect(parsed.raw).toBe(EXAMPLE_UAS.desktopChrome)
      expect(parsed.browser.name).toBe('Chrome')
      expect(parsed.summary).toBeTruthy()
    })

    test('should include all required fields in JSON', () => {
      const result = interpretUserAgent({
        uaString: EXAMPLE_UAS.desktopChrome,
      })
      
      const parsed = JSON.parse(result.result.jsonExportString)
      expect(parsed).toHaveProperty('raw')
      expect(parsed).toHaveProperty('summary')
      expect(parsed).toHaveProperty('browser')
      expect(parsed).toHaveProperty('os')
      expect(parsed).toHaveProperty('engine')
      expect(parsed).toHaveProperty('device')
      expect(parsed).toHaveProperty('bot')
      expect(parsed).toHaveProperty('normalizedTable')
      expect(parsed).toHaveProperty('_parsedAt')
    })
  })

  describe('example UAs', () => {
    test('should have all example UAs defined', () => {
      expect(EXAMPLE_UAS.desktopChrome).toBeTruthy()
      expect(EXAMPLE_UAS.desktopFirefox).toBeTruthy()
      expect(EXAMPLE_UAS.desktopSafari).toBeTruthy()
      expect(EXAMPLE_UAS.desktopEdge).toBeTruthy()
      expect(EXAMPLE_UAS.mobileSafari).toBeTruthy()
      expect(EXAMPLE_UAS.mobileChrome).toBeTruthy()
      expect(EXAMPLE_UAS.mobileAndroid).toBeTruthy()
      expect(EXAMPLE_UAS.googlebot).toBeTruthy()
      expect(EXAMPLE_UAS.bingbot).toBeTruthy()
      expect(EXAMPLE_UAS.curl).toBeTruthy()
      expect(EXAMPLE_UAS.empty).toBe('')
      expect(EXAMPLE_UAS.abnormal).toBeTruthy()
    })

    test('should have matching labels for examples', () => {
      const keys = Object.keys(EXAMPLE_UAS)
      const labelKeys = Object.keys(EXAMPLE_LABELS)
      expect(keys.sort()).toEqual(labelKeys.sort())
    })

    test('should parse all example UAs successfully', () => {
      const examples = Object.entries(EXAMPLE_UAS).filter(([key]) => key !== 'empty')
      
      for (const [key, ua] of examples) {
        const result = interpretUserAgent({ uaString: ua })
        
        if (key === 'abnormal') {
          expect(result.success).toBe(true)
        } else {
          expect(result.success).toBe(true)
          expect(result.error?.code).not.toBe(ERROR_CODES.MALFORMED)
        }
      }
    })
  })
})
