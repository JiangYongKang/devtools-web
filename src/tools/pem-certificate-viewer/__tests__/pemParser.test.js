import { describe, test, expect } from 'vitest'
import {
  splitPemBlocks,
  classifyPemLabel,
  hasPrivateKey,
  countCertificates,
} from '../logic/pemParser'
import { ERROR_CODES, createError, getErrorMessage } from '../logic/errors'
import { formatFingerprint, escapeHtml } from '../logic'
import { PRIVATE_KEY_LABELS, CERTIFICATE_LABELS } from '../logic/constants'

describe('PEM Parser - Block Splitting', () => {
  test('should split single PEM block', () => {
    const pem = `-----BEGIN CERTIFICATE-----
TESTCONTENT
-----END CERTIFICATE-----`

    const blocks = splitPemBlocks(pem)
    expect(blocks.length).toBe(1)
    expect(blocks[0].content).toContain('BEGIN CERTIFICATE')
    expect(blocks[0].content).toContain('END CERTIFICATE')
  })

  test('should split multiple PEM blocks', () => {
    const pem = `-----BEGIN CERTIFICATE-----
CERT1
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
CERT2
-----END CERTIFICATE-----`

    const blocks = splitPemBlocks(pem)
    expect(blocks.length).toBe(2)
  })

  test('should handle mixed content around PEM blocks', () => {
    const pem = `Some text before
-----BEGIN CERTIFICATE-----
TEST
-----END CERTIFICATE-----
Some text between
-----BEGIN PRIVATE KEY-----
KEY
-----END PRIVATE KEY-----
Some text after`

    const blocks = splitPemBlocks(pem)
    expect(blocks.length).toBe(2)
    expect(blocks[0].content).toContain('CERTIFICATE')
    expect(blocks[1].content).toContain('PRIVATE KEY')
  })

  test('should return empty array for text without PEM markers', () => {
    const pem = 'Just some random text without any PEM markers'
    const blocks = splitPemBlocks(pem)
    expect(blocks.length).toBe(0)
  })

  test('should handle incomplete PEM markers', () => {
    const pem = `-----BEGIN CERTIFICATE-----
TEST`
    const blocks = splitPemBlocks(pem)
    expect(blocks.length).toBe(0)
  })
})

describe('PEM Parser - Label Classification', () => {
  test('should classify certificate labels', () => {
    expect(classifyPemLabel('CERTIFICATE')).toBe('certificate')
    expect(classifyPemLabel('X509 CERTIFICATE')).toBe('certificate')
    expect(classifyPemLabel('TRUSTED CERTIFICATE')).toBe('certificate')
  })

  test('should classify private key labels', () => {
    expect(classifyPemLabel('PRIVATE KEY')).toBe('privateKey')
    expect(classifyPemLabel('RSA PRIVATE KEY')).toBe('privateKey')
    expect(classifyPemLabel('EC PRIVATE KEY')).toBe('privateKey')
    expect(classifyPemLabel('ENCRYPTED PRIVATE KEY')).toBe('privateKey')
  })

  test('should classify unknown labels', () => {
    expect(classifyPemLabel('SOMETHING ELSE')).toBe('unknown')
    expect(classifyPemLabel('')).toBe('unknown')
  })

  test('CERTIFICATE_LABELS should contain all certificate types', () => {
    expect(CERTIFICATE_LABELS.has('CERTIFICATE')).toBe(true)
    expect(CERTIFICATE_LABELS.has('X509 CERTIFICATE')).toBe(true)
    expect(CERTIFICATE_LABELS.has('TRUSTED CERTIFICATE')).toBe(true)
  })

  test('PRIVATE_KEY_LABELS should contain all key types', () => {
    expect(PRIVATE_KEY_LABELS.has('PRIVATE KEY')).toBe(true)
    expect(PRIVATE_KEY_LABELS.has('RSA PRIVATE KEY')).toBe(true)
    expect(PRIVATE_KEY_LABELS.has('EC PRIVATE KEY')).toBe(true)
    expect(PRIVATE_KEY_LABELS.has('ENCRYPTED PRIVATE KEY')).toBe(true)
  })
})

describe('PEM Parser - Private Key Detection', () => {
  test('should detect PRIVATE KEY block', () => {
    const pem = `-----BEGIN CERTIFICATE-----
TEST
-----END CERTIFICATE-----
-----BEGIN PRIVATE KEY-----
KEY
-----END PRIVATE KEY-----`
    expect(hasPrivateKey(pem)).toBe(true)
  })

  test('should detect RSA PRIVATE KEY block', () => {
    const pem = `-----BEGIN RSA PRIVATE KEY-----
KEY
-----END RSA PRIVATE KEY-----`
    expect(hasPrivateKey(pem)).toBe(true)
  })

  test('should detect EC PRIVATE KEY block', () => {
    const pem = `-----BEGIN EC PRIVATE KEY-----
KEY
-----END EC PRIVATE KEY-----`
    expect(hasPrivateKey(pem)).toBe(true)
  })

  test('should not detect private key in certificate only', () => {
    const pem = `-----BEGIN CERTIFICATE-----
TEST
-----END CERTIFICATE-----`
    expect(hasPrivateKey(pem)).toBe(false)
  })

  test('should not detect private key in plain text', () => {
    const pem = 'Just some text'
    expect(hasPrivateKey(pem)).toBe(false)
  })
})

describe('PEM Parser - Certificate Counting', () => {
  test('should count single certificate', () => {
    const pem = `-----BEGIN CERTIFICATE-----
TEST
-----END CERTIFICATE-----`
    expect(countCertificates(pem)).toBe(1)
  })

  test('should count multiple certificates', () => {
    const pem = `-----BEGIN CERTIFICATE-----
CERT1
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
CERT2
-----END CERTIFICATE-----`
    expect(countCertificates(pem)).toBe(2)
  })

  test('should not count private keys', () => {
    const pem = `-----BEGIN CERTIFICATE-----
CERT
-----END CERTIFICATE-----
-----BEGIN PRIVATE KEY-----
KEY
-----END PRIVATE KEY-----`
    expect(countCertificates(pem)).toBe(1)
  })

  test('should return 0 for non-certificate content', () => {
    const pem = `-----BEGIN PRIVATE KEY-----
KEY
-----END PRIVATE KEY-----`
    expect(countCertificates(pem)).toBe(0)
  })

  test('should return 0 for plain text', () => {
    const pem = 'No certificates here'
    expect(countCertificates(pem)).toBe(0)
  })
})

describe('Error Handling', () => {
  test('should create error with code', () => {
    const error = createError(ERROR_CODES.EMPTY_INPUT)
    expect(error.code).toBe(ERROR_CODES.EMPTY_INPUT)
    expect(error.message).toBeTruthy()
    expect(error.details).toBeNull()
  })

  test('should create error with details', () => {
    const error = createError(ERROR_CODES.INVALID_BASE64, 'Extra info')
    expect(error.code).toBe(ERROR_CODES.INVALID_BASE64)
    expect(error.details).toBe('Extra info')
  })

  test('should get error message', () => {
    const message = getErrorMessage(ERROR_CODES.EMPTY_INPUT)
    expect(message).toBeTruthy()
    expect(typeof message).toBe('string')
  })

  test('should return default message for unknown code', () => {
    const message = getErrorMessage('UNKNOWN_CODE')
    expect(message).toBeTruthy()
  })

  test('should have all required error codes', () => {
    expect(ERROR_CODES.EMPTY_INPUT).toBeTruthy()
    expect(ERROR_CODES.NO_VALID_BLOCKS).toBeTruthy()
    expect(ERROR_CODES.INVALID_BASE64).toBeTruthy()
    expect(ERROR_CODES.MALFORMED_ASN1).toBeTruthy()
    expect(ERROR_CODES.NOT_A_CERTIFICATE).toBeTruthy()
    expect(ERROR_CODES.CERTIFICATE_PARSE_FAILED).toBeTruthy()
    expect(ERROR_CODES.INVALID_PEM_FORMAT).toBeTruthy()
  })
})

describe('Utility Functions', () => {
  describe('formatFingerprint', () => {
    test('should format fingerprint with colon separator', () => {
      const fingerprint = 'a1b2c3d4e5f6'
      const formatted = formatFingerprint(fingerprint, ':')
      expect(formatted).toBe('A1:B2:C3:D4:E5:F6')
    })

    test('should handle empty string', () => {
      expect(formatFingerprint('')).toBe('')
    })

    test('should handle N/A', () => {
      expect(formatFingerprint('N/A')).toBe('N/A')
    })

    test('should handle null/undefined', () => {
      expect(formatFingerprint(null)).toBeFalsy()
      expect(formatFingerprint(undefined)).toBeFalsy()
    })
  })

  describe('escapeHtml', () => {
    test('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>'
      const escaped = escapeHtml(input)
      expect(escaped).not.toContain('<')
      expect(escaped).not.toContain('>')
      expect(escaped).not.toContain('"')
      expect(escaped).toContain('&lt;')
      expect(escaped).toContain('&gt;')
      expect(escaped).toContain('&quot;')
    })

    test('should escape ampersands', () => {
      const input = 'test & test'
      const escaped = escapeHtml(input)
      expect(escaped).toBe('test &amp; test')
    })

    test('should escape single quotes', () => {
      const input = "test ' quote"
      const escaped = escapeHtml(input)
      expect(escaped).toBe('test &#039; quote')
    })

    test('should handle null and undefined', () => {
      expect(escapeHtml(null)).toBe('')
      expect(escapeHtml(undefined)).toBe('')
    })

    test('should handle empty string', () => {
      expect(escapeHtml('')).toBe('')
    })

    test('should handle plain text', () => {
      const input = 'Hello World'
      expect(escapeHtml(input)).toBe(input)
    })
  })
})
