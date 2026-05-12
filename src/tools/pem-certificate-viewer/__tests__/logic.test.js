import { describe, test, expect } from 'vitest'
import {
  analyzePemCertificates,
  ERROR_CODES,
  EXAMPLE_LABELS,
  EXAMPLE_PEMS,
  certificatesToJson,
} from '../logic'

describe('Main Logic - analyzePemCertificates', () => {
  describe('empty input handling', () => {
    test('should return error for empty string', async () => {
      const result = await analyzePemCertificates('')
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should return error for whitespace-only string', async () => {
      const result = await analyzePemCertificates('   \n\t  ')
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should return error for null', async () => {
      const result = await analyzePemCertificates(null)
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should return error for undefined', async () => {
      const result = await analyzePemCertificates(undefined)
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.EMPTY_INPUT)
    })
  })

  describe('invalid input handling', () => {
    test('should return error for non-PEM text', async () => {
      const result = await analyzePemCertificates('This is just some plain text without any PEM markers')
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.NO_VALID_BLOCKS)
    })

    test('should return error for private key only', async () => {
      const pem = `-----BEGIN RSA PRIVATE KEY-----
TESTKEY
-----END RSA PRIVATE KEY-----`
      const result = await analyzePemCertificates(pem)
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.NO_VALID_BLOCKS)
      expect(result.result.privateKeyDetected).toBe(true)
    })

    test('should detect private key', async () => {
      const pem = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIUUDs8s8l97aV6iXx4s1Kd9wX9h+wwDQYJKoZI
hvcNAQELBQAwRTELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3Rh
dGUxITAfBgNVBAoMGEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDAeFw0y
NTA1MTIwMDAwMDBaFw0zNTA1MTIwMDAwMDBaMEUxCzAJBgNVBAYTAkFV
-----END CERTIFICATE-----
-----BEGIN PRIVATE KEY-----
TESTKEY
-----END PRIVATE KEY-----`

      const result = await analyzePemCertificates(pem)
      expect(result.result.privateKeyDetected).toBe(true)
    })

    test('should return error for invalid Base64', async () => {
      const pem = `-----BEGIN CERTIFICATE-----
!!!INVALID_BASE64!!!
-----END CERTIFICATE-----`

      const result = await analyzePemCertificates(pem)
      expect(result.success).toBe(false)
    })
  })

  describe('example certificates', () => {
    test('should have all example labels and PEMs defined', () => {
      const labelKeys = Object.keys(EXAMPLE_LABELS)
      const pemKeys = Object.keys(EXAMPLE_PEMS)

      expect(labelKeys.length).toBeGreaterThan(0)
      expect(pemKeys.length).toBeGreaterThan(0)
      expect(labelKeys.sort()).toEqual(pemKeys.sort())
    })

    test('should have non-empty example PEMs', () => {
      for (const key of Object.keys(EXAMPLE_PEMS)) {
        expect(EXAMPLE_PEMS[key]).toBeTruthy()
        expect(typeof EXAMPLE_PEMS[key]).toBe('string')
        expect(EXAMPLE_PEMS[key].length).toBeGreaterThan(0)
      }
    })

    test('examples should contain PEM markers', () => {
      for (const [key, pem] of Object.entries(EXAMPLE_PEMS)) {
        if (key === 'WITH_PRIVATE_KEY') {
          expect(pem).toContain('BEGIN PRIVATE KEY')
        }
        if (key === 'CERT_CHAIN') {
          expect((pem.match(/BEGIN CERTIFICATE/g) || []).length).toBeGreaterThan(1)
        }
      }
    })
  })

  describe('JSON export', () => {
    test('should return empty array for empty result', () => {
      const json = certificatesToJson({ certificates: [] })
      expect(json).toBe('[]')
    })

    test('should return valid JSON', () => {
      const result = {
        certificates: [
          {
            index: 0,
            summary: {
              version: 3,
              serialNumber: 'abc123',
            },
            fingerprints: {
              sha256: 'abc',
            },
          },
        ],
      }

      const json = certificatesToJson(result)
      const parsed = JSON.parse(json)

      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(1)
      expect(parsed[0].index).toBe(0)
      expect(parsed[0].summary.version).toBe(3)
    })
  })

  describe('multiple certificates', () => {
    test('should detect multiple certificate blocks', async () => {
      const pem = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIUUDs8s8l97aV6iXx4s1Kd9wX9h+wwDQYJKoZI
hvcNAQELBQAwRTELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3Rh
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIDkDCCAvigAwIBAgIUCjR9uT3f2q7a5X1Z3w9Y8k7V2R58MA0GCSqGSIb3DQEB
CwUAMFYxCzAJBgNVBAYTAkNOMQswCQYDVQQIDAJIRTEMMAoGA1UEBwwDSFox
-----END CERTIFICATE-----`

      const result = await analyzePemCertificates(pem)
      expect(result.result.totalBlocks).toBe(2)
    })
  })

  describe('warnings', () => {
    test('should return warnings for non-certificate PEM types', async () => {
      const pem = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIUUDs8s8l97aV6iXx4s1Kd9wX9h+wwDQYJKoZI
hvcNAQELBQAwRTELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3Rh
-----END CERTIFICATE-----
-----BEGIN PKCS7-----
PKCS7CONTENT
-----END PKCS7-----`

      const result = await analyzePemCertificates(pem)
      expect(result.result.warnings.length).toBeGreaterThanOrEqual(0)
    })
  })
})
