import { beforeEach, describe, expect, test, vi } from 'vitest'
import { DEFAULT_OPTIONS } from '../logic/constants.js'
import {
    expandShortlink,
    isShortlinkDomain,
    tryExpandShortlink,
} from '../logic/shortlink-expander.js'

describe('shortlink-expander module', () => {
  describe('isShortlinkDomain', () => {
    test('should detect known shortlink domains', () => {
      expect(isShortlinkDomain('bit.ly', DEFAULT_OPTIONS.shortlinkDomains)).toBe(true)
      expect(isShortlinkDomain('goo.gl', DEFAULT_OPTIONS.shortlinkDomains)).toBe(true)
      expect(isShortlinkDomain('tinyurl.com', DEFAULT_OPTIONS.shortlinkDomains)).toBe(true)
    })

    test('should detect subdomains of shortlink domains', () => {
      expect(isShortlinkDomain('test.bit.ly', DEFAULT_OPTIONS.shortlinkDomains)).toBe(true)
    })

    test('should return false for normal domains', () => {
      expect(isShortlinkDomain('example.com', DEFAULT_OPTIONS.shortlinkDomains)).toBe(false)
      expect(isShortlinkDomain('google.com', DEFAULT_OPTIONS.shortlinkDomains)).toBe(false)
    })
  })

  describe('expandShortlink', () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    test('should throw error when max redirects exceeded', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      const mockHeaders = {
        get: (name) => name === 'Location' ? 'https://bit.ly/loop' : null,
      }

      mockFetch.mockResolvedValue({
        status: 301,
        headers: mockHeaders,
        type: 'cors',
      })

      await expect(
        expandShortlink('https://bit.ly/test', {
          ...DEFAULT_OPTIONS,
          maxRedirects: 3,
        })
      ).rejects.toThrow()
    })

    test('should throw error on timeout', async () => {
      const mockFetch = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)))
      global.fetch = mockFetch

      await expect(
        expandShortlink('https://bit.ly/test', {
          ...DEFAULT_OPTIONS,
          expandTimeout: 100,
        })
      ).rejects.toThrow()
    })

    test('should return original URL when no redirect', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      const mockHeaders = {
        get: () => null,
      }

      mockFetch.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        headers: mockHeaders,
        type: 'cors',
      })

      const result = await expandShortlink('https://example.com', DEFAULT_OPTIONS)
      expect(result.finalUrl).toBe('https://example.com')
      expect(result.redirectCount).toBe(0)
    })
  })

  describe('tryExpandShortlink', () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    test('should return success result when expansion succeeds', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      const mockHeaders = {
        get: () => null,
      }

      mockFetch.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        headers: mockHeaders,
        type: 'cors',
      })

      const result = await tryExpandShortlink('https://example.com', DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.finalUrl).toBe('https://example.com')
    })

    test('should return failure result when expansion fails', async () => {
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await tryExpandShortlink('https://bit.ly/test', DEFAULT_OPTIONS)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
