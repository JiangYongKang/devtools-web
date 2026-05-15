import { describe, expect, test } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  DEFAULT_MAX_HTML_SIZE_BYTES,
  DEFAULT_WHITELIST,
  TAGS_TO_ALWAYS_REMOVE,
  ALLOWED_DATA_URL_MIME_TYPES,
  UNKNOWN_TAG_POLICIES,
  SANITIZATION_MODES,
  OWASP_SAMPLES,
} from '../logic/constants.js'
import {
  getErrorMessage,
  createError,
  isValidErrorCode,
} from '../logic/errors.js'

describe('constants', () => {
  test('ERROR_CODES should have all required error codes', () => {
    expect(ERROR_CODES.INVALID_INPUT).toBe('INVALID_INPUT')
    expect(ERROR_CODES.CONTENT_TOO_LARGE).toBe('CONTENT_TOO_LARGE')
    expect(ERROR_CODES.PARSING_FAILED).toBe('PARSING_FAILED')
    expect(ERROR_CODES.SANITIZATION_ERROR).toBe('SANITIZATION_ERROR')
  })

  test('ERROR_MESSAGES should have messages for all error codes', () => {
    Object.values(ERROR_CODES).forEach((code) => {
      expect(ERROR_MESSAGES[code]).toBeDefined()
    })
  })

  test('DEFAULT_MAX_HTML_SIZE_BYTES should be at least 1MB', () => {
    expect(DEFAULT_MAX_HTML_SIZE_BYTES).toBeGreaterThanOrEqual(1024 * 1024)
  })

  test('DEFAULT_WHITELIST should have tags, attributes, and protocols', () => {
    expect(DEFAULT_WHITELIST.tags).toBeDefined()
    expect(Array.isArray(DEFAULT_WHITELIST.tags)).toBe(true)
    expect(DEFAULT_WHITELIST.attributes).toBeDefined()
    expect(typeof DEFAULT_WHITELIST.attributes).toBe('object')
    expect(DEFAULT_WHITELIST.protocols).toBeDefined()
    expect(typeof DEFAULT_WHITELIST.protocols).toBe('object')
  })

  test('DEFAULT_WHITELIST should include common safe tags', () => {
    const safeTags = ['p', 'div', 'span', 'a', 'strong', 'em', 'ul', 'li', 'table', 'h1']
    safeTags.forEach((tag) => {
      expect(DEFAULT_WHITELIST.tags).toContain(tag)
    })
  })

  test('DEFAULT_WHITELIST should NOT include dangerous tags', () => {
    const dangerousTags = ['script', 'style', 'iframe', 'template', 'form']
    dangerousTags.forEach((tag) => {
      expect(DEFAULT_WHITELIST.tags).not.toContain(tag)
    })
  })

  test('DEFAULT_WHITELIST attributes should NOT include style', () => {
    const globalAttrs = DEFAULT_WHITELIST.attributes['*'] || []
    expect(globalAttrs).not.toContain('style')
  })

  test('TAGS_TO_ALWAYS_REMOVE should include all dangerous tags', () => {
    expect(TAGS_TO_ALWAYS_REMOVE).toContain('script')
    expect(TAGS_TO_ALWAYS_REMOVE).toContain('style')
    expect(TAGS_TO_ALWAYS_REMOVE).toContain('iframe')
    expect(TAGS_TO_ALWAYS_REMOVE).toContain('frame')
    expect(TAGS_TO_ALWAYS_REMOVE).toContain('frameset')
    expect(TAGS_TO_ALWAYS_REMOVE).toContain('template')
    expect(TAGS_TO_ALWAYS_REMOVE).toContain('form')
  })

  test('ALLOWED_DATA_URL_MIME_TYPES should only include image/png', () => {
    expect(ALLOWED_DATA_URL_MIME_TYPES).toContain('image/png')
    expect(ALLOWED_DATA_URL_MIME_TYPES).not.toContain('text/html')
    expect(ALLOWED_DATA_URL_MIME_TYPES).not.toContain('application/javascript')
  })

  test('UNKNOWN_TAG_POLICIES should have REMOVE and UNWRAP', () => {
    expect(UNKNOWN_TAG_POLICIES.REMOVE).toBe('remove')
    expect(UNKNOWN_TAG_POLICIES.UNWRAP).toBe('unwrap')
  })

  test('SANITIZATION_MODES should have PLAIN_TEXT and WHITELIST', () => {
    expect(SANITIZATION_MODES.PLAIN_TEXT).toBe('plain_text')
    expect(SANITIZATION_MODES.WHITELIST).toBe('whitelist')
  })

  test('OWASP_SAMPLES should have common XSS vectors', () => {
    expect(OWASP_SAMPLES.basicXss).toBeDefined()
    expect(OWASP_SAMPLES.svgOnload).toBeDefined()
    expect(OWASP_SAMPLES.javascriptProtocol).toBeDefined()
    expect(OWASP_SAMPLES.dataTextHtml).toBeDefined()
    expect(OWASP_SAMPLES.eventHandler).toBeDefined()
    expect(OWASP_SAMPLES.styleAttribute).toBeDefined()
    expect(OWASP_SAMPLES.mixedCase).toBeDefined()
    expect(OWASP_SAMPLES.hexEncoded).toBeDefined()
  })

  test('OWASP_SAMPLES should contain actual XSS vector patterns', () => {
    expect(OWASP_SAMPLES.basicXss).toContain('<script>')
    expect(OWASP_SAMPLES.svgOnload).toContain('onload')
    expect(OWASP_SAMPLES.javascriptProtocol).toContain('javascript:')
    expect(OWASP_SAMPLES.dataTextHtml).toContain('data:text/html')
    expect(OWASP_SAMPLES.eventHandler).toContain('onerror')
  })
})

describe('errors module', () => {
  test('getErrorMessage should return correct message for valid code', () => {
    expect(getErrorMessage(ERROR_CODES.INVALID_INPUT)).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_INPUT])
  })

  test('getErrorMessage should return default error for unknown code', () => {
    expect(getErrorMessage('UNKNOWN_CODE')).toBe(ERROR_MESSAGES[ERROR_CODES.SANITIZATION_ERROR])
  })

  test('createError should return error object with required fields', () => {
    const error = createError(ERROR_CODES.INVALID_INPUT, 'Custom message', { detail: 'test' })
    expect(error.errorCode).toBe(ERROR_CODES.INVALID_INPUT)
    expect(error.errorMessage).toBe('Custom message')
    expect(error.details).toEqual({ detail: 'test' })
    expect(error.timestamp).toBeDefined()
  })

  test('createError should use default message when not provided', () => {
    const error = createError(ERROR_CODES.INVALID_INPUT)
    expect(error.errorMessage).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_INPUT])
  })

  test('isValidErrorCode should return true for valid codes', () => {
    Object.values(ERROR_CODES).forEach((code) => {
      expect(isValidErrorCode(code)).toBe(true)
    })
  })

  test('isValidErrorCode should return false for invalid codes', () => {
    expect(isValidErrorCode('INVALID_CODE')).toBe(false)
    expect(isValidErrorCode(null)).toBe(false)
    expect(isValidErrorCode(undefined)).toBe(false)
    expect(isValidErrorCode(123)).toBe(false)
  })
})
