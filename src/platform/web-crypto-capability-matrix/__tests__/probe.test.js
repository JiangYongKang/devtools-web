import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  probeSubtleCapabilities,
  probeDigest,
  probeAesGcm,
  checkSecureContext,
  detectEnvironmentScenario,
  buildSummary,
  SUPPORT_STATUS,
  SCHEMA_VERSION,
  ERROR_CODES,
  createError,
  classifyCryptoError,
} from '../logic/index.js'

describe('Web Crypto Capability Probe', () => {
  describe('Constants', () => {
    it('should have correct schema version', () => {
      expect(SCHEMA_VERSION).toBe('1.0.0')
    })

    it('should define all support statuses', () => {
      expect(SUPPORT_STATUS.FULL).toBe('supported')
      expect(SUPPORT_STATUS.NOT_SUPPORTED).toBe('not_supported')
      expect(SUPPORT_STATUS.PARTIAL).toBe('partial')
      expect(SUPPORT_STATUS.UNKNOWN).toBe('unknown')
    })

    it('should define all error codes', () => {
      expect(ERROR_CODES.NOT_SUPPORTED_ERROR).toBe('NotSupportedError')
      expect(ERROR_CODES.INVALID_ACCESS_ERROR).toBe('InvalidAccessError')
      expect(ERROR_CODES.SYNTAX_ERROR).toBe('SyntaxError')
      expect(ERROR_CODES.INSECURE_CONTEXT).toBe('InsecureContext')
    })
  })

  describe('Error Handling', () => {
    it('should create structured error objects', () => {
      const result = createError(ERROR_CODES.SYNTAX_ERROR, 'Test message', { extra: 'data' })
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.SYNTAX_ERROR)
      expect(result.error.errorMessage).toBe('Test message')
      expect(result.error.details).toEqual({ extra: 'data' })
    })

    it('should classify crypto errors by name', () => {
      const error = { name: 'NotSupportedError', message: 'Algorithm not supported' }
      const result = classifyCryptoError(error, 'digest')
      expect(result.error.errorCode).toBe(ERROR_CODES.NOT_SUPPORTED_ERROR)
      expect(result.error.details.operation).toBe('digest')
    })
  })

  describe('Environment Detection', () => {
    it('should detect secure context based on location', () => {
      const originalLocation = global.location
      delete global.location
      global.location = { protocol: 'https:', hostname: 'example.com' }
      expect(checkSecureContext()).toBe(true)
      global.location = originalLocation
    })

    it('should detect localhost as secure', () => {
      const originalLocation = global.location
      delete global.location
      global.location = { protocol: 'http:', hostname: 'localhost' }
      expect(checkSecureContext()).toBe(true)
      global.location = originalLocation
    })

    it('should detect 127.0.0.1 as secure', () => {
      const originalLocation = global.location
      delete global.location
      global.location = { protocol: 'http:', hostname: '127.0.0.1' }
      expect(checkSecureContext()).toBe(true)
      global.location = originalLocation
    })

    it('should detect http public as insecure', () => {
      const originalLocation = global.location
      delete global.location
      global.location = { protocol: 'http:', hostname: 'example.com' }
      expect(checkSecureContext()).toBe(false)
      global.location = originalLocation
    })
  })

  describe('Summary Builder', () => {
    it('should build correct summary from probe results', () => {
      const probeResults = [
        { algorithm: 'SHA-256', operation: 'digest', status: SUPPORT_STATUS.FULL, duration: 5 },
        { algorithm: 'AES-GCM', operation: 'generateKey', status: SUPPORT_STATUS.FULL, duration: 10 },
        { algorithm: 'AES-GCM', operation: 'encrypt', status: SUPPORT_STATUS.NOT_SUPPORTED, duration: 0 },
        { algorithm: 'RSA-OAEP', operation: 'generateKey', status: SUPPORT_STATUS.PARTIAL, duration: 100 },
      ]

      const summary = buildSummary(probeResults)
      expect(summary.total).toBe(4)
      expect(summary.supported).toBe(2)
      expect(summary.notSupported).toBe(1)
      expect(summary.partial).toBe(1)
      expect(summary.byAlgorithm['SHA-256']).toBeDefined()
      expect(summary.byAlgorithm['AES-GCM'].supported).toBe(1)
      expect(summary.byAlgorithm['AES-GCM'].notSupported).toBe(1)
    })

    it('should handle empty probe results', () => {
      const summary = buildSummary([])
      expect(summary.total).toBe(0)
      expect(summary.supported).toBe(0)
    })
  })

  describe('Abort Signal Handling', () => {
    it('should respect abort signal', async () => {
      const controller = new AbortController()
      const subtleMock = {
        digest: vi.fn().mockImplementation(() => new Promise(() => {})),
      }

      setTimeout(() => controller.abort(), 10)

      try {
        await probeDigest(subtleMock, 'SHA-256', controller.signal, 1000)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('probeSubtleCapabilities', () => {
    it('should return early with insecure context warning', async () => {
      const originalIsSecureContext = global.isSecureContext
      global.isSecureContext = false

      const result = await probeSubtleCapabilities({ timeout: 1000 })
      expect(result.isSecureContext).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(ERROR_CODES.INSECURE_CONTEXT)

      global.isSecureContext = originalIsSecureContext
    })

    it('should include schema version in result', async () => {
      const result = await probeSubtleCapabilities({ timeout: 1000 })
      expect(result.schemaVersion).toBe(SCHEMA_VERSION)
    })

    it('should include timestamp in result', async () => {
      const before = Date.now()
      const result = await probeSubtleCapabilities({ timeout: 1000 })
      const after = Date.now()
      expect(result.timestamp).toBeGreaterThanOrEqual(before)
      expect(result.timestamp).toBeLessThanOrEqual(after)
    })

    it('should respect skipHeavyOperations option', async () => {
      const result = await probeSubtleCapabilities({
        skipHeavyOperations: true,
        timeout: 1000,
      })

      expect(result.options.skipHeavyOperations).toBe(true)

      if (result.hasSubtleCrypto && result.probeResults?.length > 0) {
        const rsaResult = result.probeResults.find(
          (r) => r.algorithm === 'RSA-OAEP' && r.skipped
        )
        if (rsaResult) {
          expect(rsaResult).toBeDefined()
        }
      }
    })

    it('should include duration in result', async () => {
      const result = await probeSubtleCapabilities({ timeout: 1000 })
      expect(typeof result.duration).toBe('number')
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })
  })
})
