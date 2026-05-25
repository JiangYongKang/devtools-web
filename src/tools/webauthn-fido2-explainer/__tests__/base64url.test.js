import { describe, test, expect, beforeEach, vi } from 'vitest'
import {
  base64UrlToBase64,
  base64ToBase64Url,
  base64UrlToUint8Array,
  uint8ArrayToBase64Url,
  stringToUint8Array,
  uint8ArrayToString,
  stringToBase64Url,
  base64UrlToString,
  generateRandomBytes,
  generateChallenge,
  generateUserId,
} from '../logic/base64url.js'

describe('Base64URL 编解码', () => {
  describe('base64UrlToBase64', () => {
    test('将 Base64URL 转换为标准 Base64', () => {
      expect(base64UrlToBase64('aGVsbG8')).toBe('aGVsbG8=')
      expect(base64UrlToBase64('aGVsbG8t')).toBe('aGVsbG8t')
      expect(base64UrlToBase64('aGVsbG8_')).toBe('aGVsbG8/')
      expect(base64UrlToBase64('SGVsbG8gV29ybGQ')).toBe('SGVsbG8gV29ybGQ=')
    })

    test('处理不需要填充的情况', () => {
      expect(base64UrlToBase64('dGVzdA')).toBe('dGVzdA==')
    })

    test('对余数为1的无效长度抛出错误', () => {
      expect(() => base64UrlToBase64('a')).toThrow('无效的 Base64URL 字符串长度')
    })
  })

  describe('base64ToBase64Url', () => {
    test('将标准 Base64 转换为 Base64URL', () => {
      expect(base64ToBase64Url('aGVsbG8=')).toBe('aGVsbG8')
      expect(base64ToBase64Url('aGVsbG8t')).toBe('aGVsbG8t')
      expect(base64ToBase64Url('aGVsbG8/')).toBe('aGVsbG8_')
      expect(base64ToBase64Url('SGVsbG8gV29ybGQ=')).toBe('SGVsbG8gV29ybGQ')
    })

    test('移除填充字符', () => {
      expect(base64ToBase64Url('dGVzdA==')).toBe('dGVzdA')
    })
  })

  describe('uint8Array 与 Base64URL 互转', () => {
    test('编码和解码空数组', () => {
      const bytes = new Uint8Array([])
      const encoded = uint8ArrayToBase64Url(bytes)
      expect(encoded).toBe('')
      expect(base64UrlToUint8Array(encoded)).toEqual(bytes)
    })

    test('编码和解码简单字符串', () => {
      const str = 'Hello, World!'
      const bytes = new Uint8Array(str.split('').map(c => c.charCodeAt(0)))
      const encoded = uint8ArrayToBase64Url(bytes)
      const decoded = base64UrlToUint8Array(encoded)
      expect(decoded).toEqual(bytes)
    })

    test('编码和解码二进制数据', () => {
      const bytes = new Uint8Array([0x00, 0x01, 0x7F, 0x80, 0xFF])
      const encoded = uint8ArrayToBase64Url(bytes)
      const decoded = base64UrlToUint8Array(encoded)
      expect(decoded).toEqual(bytes)
    })
  })

  describe('字符串与 Uint8Array 互转', () => {
    test('UTF-8 字符串编码解码', () => {
      const str = 'Hello, World! 你好，世界！'
      const encoded = stringToUint8Array(str)
      const decoded = uint8ArrayToString(encoded)
      expect(decoded).toBe(str)
    })

    test('空字符串', () => {
      const str = ''
      const encoded = stringToUint8Array(str)
      expect(encoded.length).toBe(0)
      expect(uint8ArrayToString(encoded)).toBe(str)
    })
  })

  describe('stringToBase64Url 和 base64UrlToString', () => {
    test('字符串与 Base64URL 互转', () => {
      const str = 'Hello, World! 你好'
      const encoded = stringToBase64Url(str)
      const decoded = base64UrlToString(encoded)
      expect(decoded).toBe(str)
    })
  })

  describe('随机字节生成', () => {
    beforeEach(() => {
      const mockCrypto = {
        getRandomValues: (arr) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = i % 256
          }
          return arr
        },
      }
      vi.stubGlobal('crypto', mockCrypto)
    })

    test('generateRandomBytes 生成指定长度的字节数组', () => {
      const bytes = generateRandomBytes(16)
      expect(bytes).toBeInstanceOf(Uint8Array)
      expect(bytes.length).toBe(16)
    })

    test('generateRandomBytes 默认长度为 32', () => {
      const bytes = generateRandomBytes()
      expect(bytes.length).toBe(32)
    })

    test('generateChallenge 生成 Base64URL 编码的 challenge', () => {
      const challenge = generateChallenge(32)
      expect(typeof challenge).toBe('string')
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    test('generateUserId 生成 Base64URL 编码的用户 ID', () => {
      const userId = generateUserId(16)
      expect(typeof userId).toBe('string')
      expect(userId).toMatch(/^[A-Za-z0-9_-]+$/)
    })
  })
})
