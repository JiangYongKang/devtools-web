import { describe, test, expect } from 'vitest'
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  isValidBase64,
  arrayBufferToHex,
  hexToArrayBuffer,
  isValidHex,
  detectFormat,
  encodeArrayBuffer,
  decodeToArrayBuffer,
} from '../logic/encoding.js'
import { ERROR_CODES } from '../logic/errors.js'

describe('encoding utilities', () => {
  describe('arrayBufferToBase64 and base64ToArrayBuffer', () => {
    test('should correctly convert between ArrayBuffer and Base64', () => {
      const text = 'Hello, World!'
      const encoder = new TextEncoder()
      const buffer = encoder.encode(text).buffer
      
      const base64 = arrayBufferToBase64(buffer)
      expect(typeof base64).toBe('string')
      
      const decodedBuffer = base64ToArrayBuffer(base64)
      const decoder = new TextDecoder()
      const decodedText = decoder.decode(decodedBuffer)
      
      expect(decodedText).toBe(text)
    })

    test('should handle empty buffer', () => {
      const emptyBuffer = new Uint8Array(0).buffer
      const base64 = arrayBufferToBase64(emptyBuffer)
      expect(base64).toBe('')
    })

    test('should throw error for null input to arrayBufferToBase64', () => {
      expect(() => arrayBufferToBase64(null)).toThrow(ERROR_CODES.NULL_INPUT)
      expect(() => arrayBufferToBase64(undefined)).toThrow(ERROR_CODES.NULL_INPUT)
    })

    test('should throw error for null input to base64ToArrayBuffer', () => {
      expect(() => base64ToArrayBuffer(null)).toThrow(ERROR_CODES.NULL_INPUT)
      expect(() => base64ToArrayBuffer(undefined)).toThrow(ERROR_CODES.NULL_INPUT)
    })

    test('should throw error for non-string input to base64ToArrayBuffer', () => {
      expect(() => base64ToArrayBuffer(123)).toThrow(ERROR_CODES.INVALID_BASE64)
    })

    test('should throw error for empty string to base64ToArrayBuffer', () => {
      expect(() => base64ToArrayBuffer('')).toThrow(ERROR_CODES.INVALID_BASE64)
      expect(() => base64ToArrayBuffer('   ')).toThrow(ERROR_CODES.INVALID_BASE64)
    })

    test('should throw error for invalid Base64 characters', () => {
      expect(() => base64ToArrayBuffer('Hello!@#')).toThrow(ERROR_CODES.INVALID_BASE64)
    })
  })

  describe('isValidBase64', () => {
    test('should return true for valid Base64 strings', () => {
      expect(isValidBase64('SGVsbG8=')).toBe(true)
      expect(isValidBase64('SGVsbG8sIFdvcmxkIQ==')).toBe(true)
      expect(isValidBase64('  SGVsbG8=  ')).toBe(true)
    })

    test('should return false for invalid Base64 strings', () => {
      expect(isValidBase64(null)).toBe(false)
      expect(isValidBase64(undefined)).toBe(false)
      expect(isValidBase64(123)).toBe(false)
      expect(isValidBase64('')).toBe(false)
      expect(isValidBase64('   ')).toBe(false)
      expect(isValidBase64('Hello!@#')).toBe(false)
      expect(isValidBase64('SGVsbG')).toBe(false)
    })
  })

  describe('arrayBufferToHex and hexToArrayBuffer', () => {
    test('should correctly convert between ArrayBuffer and Hex', () => {
      const text = 'Hello, World!'
      const encoder = new TextEncoder()
      const buffer = encoder.encode(text).buffer
      
      const hex = arrayBufferToHex(buffer)
      expect(typeof hex).toBe('string')
      expect(hex).toMatch(/^[0-9a-f]+$/)
      
      const decodedBuffer = hexToArrayBuffer(hex)
      const decoder = new TextDecoder()
      const decodedText = decoder.decode(decodedBuffer)
      
      expect(decodedText).toBe(text)
    })

    test('should handle empty buffer', () => {
      const emptyBuffer = new Uint8Array(0).buffer
      const hex = arrayBufferToHex(emptyBuffer)
      expect(hex).toBe('')
    })

    test('should throw error for null input to arrayBufferToHex', () => {
      expect(() => arrayBufferToHex(null)).toThrow(ERROR_CODES.NULL_INPUT)
      expect(() => arrayBufferToHex(undefined)).toThrow(ERROR_CODES.NULL_INPUT)
    })

    test('should throw error for null input to hexToArrayBuffer', () => {
      expect(() => hexToArrayBuffer(null)).toThrow(ERROR_CODES.NULL_INPUT)
      expect(() => hexToArrayBuffer(undefined)).toThrow(ERROR_CODES.NULL_INPUT)
    })

    test('should throw error for non-string input to hexToArrayBuffer', () => {
      expect(() => hexToArrayBuffer(123)).toThrow(ERROR_CODES.INVALID_HEX)
    })

    test('should throw error for empty string to hexToArrayBuffer', () => {
      expect(() => hexToArrayBuffer('')).toThrow(ERROR_CODES.INVALID_HEX)
      expect(() => hexToArrayBuffer('   ')).toThrow(ERROR_CODES.INVALID_HEX)
    })

    test('should throw error for invalid Hex characters', () => {
      expect(() => hexToArrayBuffer('Hello!')).toThrow(ERROR_CODES.INVALID_HEX)
    })

    test('should throw error for odd-length Hex strings', () => {
      expect(() => hexToArrayBuffer('abc')).toThrow(ERROR_CODES.INVALID_HEX)
    })
  })

  describe('isValidHex', () => {
    test('should return true for valid Hex strings', () => {
      expect(isValidHex('48656c6c6f')).toBe(true)
      expect(isValidHex('48656C6C6F')).toBe(true)
      expect(isValidHex('  48656c6c6f  ')).toBe(true)
      expect(isValidHex('')).toBe(false)
    })

    test('should return false for invalid Hex strings', () => {
      expect(isValidHex(null)).toBe(false)
      expect(isValidHex(undefined)).toBe(false)
      expect(isValidHex(123)).toBe(false)
      expect(isValidHex('   ')).toBe(false)
      expect(isValidHex('Hello!')).toBe(false)
      expect(isValidHex('abc')).toBe(false)
    })
  })

  describe('detectFormat', () => {
    test('should detect Hex format', () => {
      expect(detectFormat('48656c6c6f')).toBe('hex')
      expect(detectFormat('48656C6C6F')).toBe('hex')
    })

    test('should detect Base64 format', () => {
      expect(detectFormat('SGVsbG8=')).toBe('base64')
    })

    test('should return null for null, undefined, or empty string', () => {
      expect(detectFormat(null)).toBe(null)
      expect(detectFormat(undefined)).toBe(null)
      expect(detectFormat('')).toBe(null)
      expect(detectFormat('   ')).toBe(null)
    })

    test('should return null for non-string input', () => {
      expect(detectFormat(123)).toBe(null)
    })
  })

  describe('encodeArrayBuffer and decodeToArrayBuffer', () => {
    test('should encode and decode with Base64 format', () => {
      const text = 'Test data'
      const encoder = new TextEncoder()
      const buffer = encoder.encode(text).buffer
      
      const encoded = encodeArrayBuffer(buffer, 'base64')
      const decoded = decodeToArrayBuffer(encoded, 'base64')
      const decoder = new TextDecoder()
      
      expect(decoder.decode(decoded)).toBe(text)
    })

    test('should encode and decode with Hex format', () => {
      const text = 'Test data'
      const encoder = new TextEncoder()
      const buffer = encoder.encode(text).buffer
      
      const encoded = encodeArrayBuffer(buffer, 'hex')
      const decoded = decodeToArrayBuffer(encoded, 'hex')
      const decoder = new TextDecoder()
      
      expect(decoder.decode(decoded)).toBe(text)
    })

    test('should use Base64 as default format', () => {
      const text = 'Default format'
      const encoder = new TextEncoder()
      const buffer = encoder.encode(text).buffer
      
      const encoded = encodeArrayBuffer(buffer)
      expect(isValidBase64(encoded)).toBe(true)
    })
  })
})
