import {
  isSSR,
  detectBrowserType,
  BROWSER_COMPATIBILITY_TABLE,
  getBrowserCompatibility,
  getRecommendedChunkSize,
} from '../logic/index.js'

describe('capabilityDetector', () => {
  describe('isSSR', () => {
    it('should return false in browser environment', () => {
      expect(isSSR()).toBe(false)
    })
  })

  describe('detectBrowserType', () => {
    it('should detect chromium-like browsers', () => {
      const originalUserAgent = navigator.userAgent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36',
        configurable: true,
      })

      expect(detectBrowserType()).toBe('chromium')

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      })
    })

    it('should detect edge browser', () => {
      const originalUserAgent = navigator.userAgent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Edg/100.0.0.0',
        configurable: true,
      })

      expect(detectBrowserType()).toBe('edge')

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      })
    })

    it('should detect firefox browser', () => {
      const originalUserAgent = navigator.userAgent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; rv:100.0) Gecko/20100101 Firefox/100.0',
        configurable: true,
      })

      expect(detectBrowserType()).toBe('firefox')

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      })
    })
  })

  describe('BROWSER_COMPATIBILITY_TABLE', () => {
    it('should have entries for all browser types', () => {
      expect(BROWSER_COMPATIBILITY_TABLE).toHaveProperty('safari')
      expect(BROWSER_COMPATIBILITY_TABLE).toHaveProperty('chromium')
      expect(BROWSER_COMPATIBILITY_TABLE).toHaveProperty('firefox')
      expect(BROWSER_COMPATIBILITY_TABLE).toHaveProperty('edge')
      expect(BROWSER_COMPATIBILITY_TABLE).toHaveProperty('other')
    })

    it('should have objectUrl support info for each browser', () => {
      Object.values(BROWSER_COMPATIBILITY_TABLE).forEach((compat) => {
        expect(compat.objectUrl).toHaveProperty('supported')
        expect(compat.objectUrl).toHaveProperty('notes')
        expect(compat.objectUrl).toHaveProperty('maxBlobSize')
      })
    })

    it('should have readableStream support info for each browser', () => {
      Object.values(BROWSER_COMPATIBILITY_TABLE).forEach((compat) => {
        expect(compat.readableStream).toHaveProperty('supported')
        expect(compat.readableStream).toHaveProperty('notes')
      })
    })

    it('should have multiBlobSequential support info for each browser', () => {
      Object.values(BROWSER_COMPATIBILITY_TABLE).forEach((compat) => {
        expect(compat.multiBlobSequential).toHaveProperty('supported')
        expect(compat.multiBlobSequential).toHaveProperty('notes')
      })
    })

    it('should have proper maxBlobSize values', () => {
      expect(BROWSER_COMPATIBILITY_TABLE.chromium.objectUrl.maxBlobSize).toBe(2 * 1024 * 1024 * 1024)
      expect(BROWSER_COMPATIBILITY_TABLE.edge.objectUrl.maxBlobSize).toBe(2 * 1024 * 1024 * 1024)
      expect(BROWSER_COMPATIBILITY_TABLE.safari.objectUrl.maxBlobSize).toBe(500 * 1024 * 1024)
      expect(BROWSER_COMPATIBILITY_TABLE.other.objectUrl.maxBlobSize).toBe(500 * 1024 * 1024)
    })
  })

  describe('getBrowserCompatibility', () => {
    it('should return compatibility for current browser', () => {
      const compat = getBrowserCompatibility()
      expect(compat).toHaveProperty('objectUrl')
      expect(compat).toHaveProperty('readableStream')
      expect(compat).toHaveProperty('multiBlobSequential')
    })
  })

  describe('getRecommendedChunkSize', () => {
    it('should return reasonable chunk size', () => {
      const size = getRecommendedChunkSize('chromium')
      expect(typeof size).toBe('number')
      expect(size).toBeGreaterThan(0)
    })

    it('should return smaller chunk size for safari', () => {
      const safariSize = getRecommendedChunkSize('safari')
      const chromiumSize = getRecommendedChunkSize('chromium')
      expect(safariSize).toBeLessThanOrEqual(chromiumSize)
    })

    it('should use detected browser if no parameter', () => {
      const size = getRecommendedChunkSize()
      expect(typeof size).toBe('number')
      expect(size).toBeGreaterThan(0)
    })
  })
})
