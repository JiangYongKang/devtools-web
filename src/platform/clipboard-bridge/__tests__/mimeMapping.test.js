import { describe, expect, test } from 'vitest'
import {
  normalizeMimeType,
  getExtensionForMime,
  getExtensionForMimeOrDefault,
  suggestFilenameFromMime,
  isTextBasedMime,
  isImageMime,
  isImagePng,
  isImageJpeg,
  getAllKnownMimes,
  getAllImageMimes,
} from '../logic/mimeMapping.js'
import { ERROR_CODES } from '../logic/constants.js'

describe('mimeMapping module', () => {
  describe('normalizeMimeType', () => {
    test('should handle null and undefined', () => {
      expect(normalizeMimeType(null)).toBe('')
      expect(normalizeMimeType(undefined)).toBe('')
    })

    test('should trim whitespace', () => {
      expect(normalizeMimeType('  text/plain  ')).toBe('text/plain')
    })

    test('should convert to lowercase', () => {
      expect(normalizeMimeType('TEXT/HTML')).toBe('text/html')
    })

    test('should strip parameters after semicolon', () => {
      expect(normalizeMimeType('text/plain; charset=utf-8')).toBe('text/plain')
      expect(normalizeMimeType('application/json; charset=UTF-8')).toBe('application/json')
    })

    test('should handle combined cases', () => {
      expect(normalizeMimeType('  TEXT/HTML; CHARSET=UTF-8  ')).toBe('text/html')
    })
  })

  describe('getExtensionForMime', () => {
    test('should return error for empty input', () => {
      const result = getExtensionForMime('')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_MIME_TYPE)
    })

    test('should map common text types', () => {
      expect(getExtensionForMime('text/plain').extension).toBe('txt')
      expect(getExtensionForMime('text/html').extension).toBe('html')
      expect(getExtensionForMime('application/json').extension).toBe('json')
      expect(getExtensionForMime('application/javascript').extension).toBe('js')
    })

    test('should map common image types', () => {
      expect(getExtensionForMime('image/png').extension).toBe('png')
      expect(getExtensionForMime('image/jpeg').extension).toBe('jpg')
      expect(getExtensionForMime('image/gif').extension).toBe('gif')
      expect(getExtensionForMime('image/webp').extension).toBe('webp')
    })

    test('should normalize before lookup', () => {
      expect(getExtensionForMime('  IMAGE/PNG; charset=utf-8  ').extension).toBe('png')
    })

    test('should infer from subtype for known types', () => {
      const result = getExtensionForMime('application/x-custom-png')
      expect(result.success).toBe(false)
    })
  })

  describe('getExtensionForMimeOrDefault', () => {
    test('should return extension for known types', () => {
      expect(getExtensionForMimeOrDefault('image/png')).toBe('png')
    })

    test('should return default for unknown types', () => {
      expect(getExtensionForMimeOrDefault('unknown/type', 'dat')).toBe('dat')
      expect(getExtensionForMimeOrDefault('unknown/type')).toBe('bin')
    })
  })

  describe('suggestFilenameFromMime', () => {
    test('should generate filename with correct extension', () => {
      const filename = suggestFilenameFromMime('image/png')
      expect(filename).toMatch(/^clipboard_\d+\.png$/)
    })

    test('should use custom prefix', () => {
      const filename = suggestFilenameFromMime('text/plain', 'mydata')
      expect(filename).toMatch(/^mydata_\d+\.txt$/)
    })
  })

  describe('isTextBasedMime', () => {
    test('should return true for text types', () => {
      expect(isTextBasedMime('text/plain')).toBe(true)
      expect(isTextBasedMime('text/html')).toBe(true)
      expect(isTextBasedMime('application/json')).toBe(true)
      expect(isTextBasedMime('application/javascript')).toBe(true)
    })

    test('should return true for any text/* type', () => {
      expect(isTextBasedMime('text/css')).toBe(true)
      expect(isTextBasedMime('text/x-custom')).toBe(true)
    })

    test('should return false for non-text types', () => {
      expect(isTextBasedMime('image/png')).toBe(false)
      expect(isTextBasedMime('application/pdf')).toBe(false)
    })
  })

  describe('isImageMime', () => {
    test('should return true for known image types', () => {
      expect(isImageMime('image/png')).toBe(true)
      expect(isImageMime('image/jpeg')).toBe(true)
      expect(isImageMime('image/gif')).toBe(true)
      expect(isImageMime('image/webp')).toBe(true)
      expect(isImageMime('image/svg+xml')).toBe(true)
    })

    test('should return false for non-image types', () => {
      expect(isImageMime('text/plain')).toBe(false)
      expect(isImageMime('application/json')).toBe(false)
    })

    test('should normalize before check', () => {
      expect(isImageMime('  IMAGE/PNG; charset=utf-8  ')).toBe(true)
    })
  })

  describe('isImagePng', () => {
    test('should return true for image/png', () => {
      expect(isImagePng('image/png')).toBe(true)
      expect(isImagePng('IMAGE/PNG')).toBe(true)
    })

    test('should return false for other image types', () => {
      expect(isImagePng('image/jpeg')).toBe(false)
      expect(isImagePng('image/gif')).toBe(false)
    })
  })

  describe('isImageJpeg', () => {
    test('should return true for image/jpeg and image/jpg', () => {
      expect(isImageJpeg('image/jpeg')).toBe(true)
      expect(isImageJpeg('image/jpg')).toBe(true)
    })

    test('should return false for other types', () => {
      expect(isImageJpeg('image/png')).toBe(false)
    })
  })

  describe('getAllKnownMimes', () => {
    test('should return array of mime types', () => {
      const mimes = getAllKnownMimes()
      expect(Array.isArray(mimes)).toBe(true)
      expect(mimes.length).toBeGreaterThan(0)
      expect(mimes).toContain('text/plain')
      expect(mimes).toContain('image/png')
    })
  })

  describe('getAllImageMimes', () => {
    test('should return array of image mime types', () => {
      const mimes = getAllImageMimes()
      expect(Array.isArray(mimes)).toBe(true)
      expect(mimes.length).toBeGreaterThan(0)
      mimes.forEach((mime) => {
        expect(mime.startsWith('image/')).toBe(true)
      })
    })
  })
})
