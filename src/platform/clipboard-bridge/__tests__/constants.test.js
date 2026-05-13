import { describe, expect, test } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  DEFAULT_DEBOUNCE_DELAY,
  MAX_TEXT_SIZE_BYTES,
  LARGE_TEXT_WARNING_THRESHOLD,
  FEATURE_CACHE_TTL_MS,
  CLIPBOARD_CAPABILITIES,
  MIME_TO_EXTENSION,
  TEXT_BASED_MIMES,
  IMAGE_MIMES,
  READ_MODES,
} from '../logic/constants.js'

describe('constants module', () => {
  describe('ERROR_CODES', () => {
    test('should have all required error codes', () => {
      expect(ERROR_CODES.NOT_ALLOWED).toBe('NOT_ALLOWED')
      expect(ERROR_CODES.SECURITY_ERROR).toBe('SECURITY_ERROR')
      expect(ERROR_CODES.INSECURE_CONTEXT).toBe('INSECURE_CONTEXT')
      expect(ERROR_CODES.API_NOT_AVAILABLE).toBe('API_NOT_AVAILABLE')
      expect(ERROR_CODES.USER_GESTURE_REQUIRED).toBe('USER_GESTURE_REQUIRED')
      expect(ERROR_CODES.PERMISSION_DENIED).toBe('PERMISSION_DENIED')
      expect(ERROR_CODES.CLIPBOARD_WRITE_FAILED).toBe('CLIPBOARD_WRITE_FAILED')
      expect(ERROR_CODES.CLIPBOARD_READ_FAILED).toBe('CLIPBOARD_READ_FAILED')
      expect(ERROR_CODES.CONTENT_TOO_LARGE).toBe('CONTENT_TOO_LARGE')
      expect(ERROR_CODES.INVALID_INPUT).toBe('INVALID_INPUT')
      expect(ERROR_CODES.INVALID_MIME_TYPE).toBe('INVALID_MIME_TYPE')
      expect(ERROR_CODES.ABORTED).toBe('ABORTED')
      expect(ERROR_CODES.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR')
    })
  })

  describe('ERROR_MESSAGES', () => {
    test('should have messages for all error codes', () => {
      Object.values(ERROR_CODES).forEach((code) => {
        expect(ERROR_MESSAGES[code]).toBeDefined()
        expect(typeof ERROR_MESSAGES[code]).toBe('string')
        expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
      })
    })
  })

  describe('size constants', () => {
    test('MAX_TEXT_SIZE_BYTES should be 1MB', () => {
      expect(MAX_TEXT_SIZE_BYTES).toBe(1024 * 1024)
    })

    test('LARGE_TEXT_WARNING_THRESHOLD should be 512KB', () => {
      expect(LARGE_TEXT_WARNING_THRESHOLD).toBe(512 * 1024)
    })
  })

  describe('time constants', () => {
    test('DEFAULT_DEBOUNCE_DELAY should be 300ms', () => {
      expect(DEFAULT_DEBOUNCE_DELAY).toBe(300)
    })

    test('FEATURE_CACHE_TTL_MS should be 5 minutes', () => {
      expect(FEATURE_CACHE_TTL_MS).toBe(5 * 60 * 1000)
    })
  })

  describe('CLIPBOARD_CAPABILITIES', () => {
    test('should have all capability keys', () => {
      expect(CLIPBOARD_CAPABILITIES.CLIPBOARD_API).toBe('clipboard_api')
      expect(CLIPBOARD_CAPABILITIES.CLIPBOARD_WRITE_TEXT).toBe('clipboard_write_text')
      expect(CLIPBOARD_CAPABILITIES.CLIPBOARD_READ_TEXT).toBe('clipboard_read_text')
      expect(CLIPBOARD_CAPABILITIES.CLIPBOARD_ITEM).toBe('clipboard_item')
      expect(CLIPBOARD_CAPABILITIES.CLIPBOARD_WRITE).toBe('clipboard_write')
      expect(CLIPBOARD_CAPABILITIES.CLIPBOARD_READ).toBe('clipboard_read')
      expect(CLIPBOARD_CAPABILITIES.EXEC_COMMAND_COPY).toBe('exec_command_copy')
      expect(CLIPBOARD_CAPABILITIES.IS_SECURE_CONTEXT).toBe('is_secure_context')
    })
  })

  describe('MIME_TO_EXTENSION', () => {
    test('should map common text types', () => {
      expect(MIME_TO_EXTENSION['text/plain']?.extension).toBe('txt')
      expect(MIME_TO_EXTENSION['text/html']?.extension).toBe('html')
      expect(MIME_TO_EXTENSION['text/css']?.extension).toBe('css')
      expect(MIME_TO_EXTENSION['application/javascript']?.extension).toBe('js')
      expect(MIME_TO_EXTENSION['application/json']?.extension).toBe('json')
    })

    test('should map common image types', () => {
      expect(MIME_TO_EXTENSION['image/png']?.extension).toBe('png')
      expect(MIME_TO_EXTENSION['image/jpeg']?.extension).toBe('jpg')
      expect(MIME_TO_EXTENSION['image/gif']?.extension).toBe('gif')
      expect(MIME_TO_EXTENSION['image/webp']?.extension).toBe('webp')
      expect(MIME_TO_EXTENSION['image/svg+xml']?.extension).toBe('svg')
    })
  })

  describe('READ_MODES', () => {
    test('should have PLAIN_TEXT and RAW_HTML', () => {
      expect(READ_MODES.PLAIN_TEXT).toBe('plain_text')
      expect(READ_MODES.RAW_HTML).toBe('raw_html')
    })
  })
})
