import { describe, test, expect } from 'vitest'
import {
  parsePEM,
  formatPEM,
  isPEMPrivateKey,
  isPEMPublicKey,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  arrayBufferToHex,
  hexToArrayBuffer,
  formatHexWithColon,
  parseHexWithColon,
  PEM_TYPES,
} from '../logic/formatConverter.js'
import { ERROR_CODES } from '../logic/errors.js'

describe('formatConverter - PEM 编解码', () => {
  describe('parsePEM', () => {
    test('解析有效的公钥 PEM', () => {
      const validPEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0z5v5KjKbQz7Xl9q6Zux
AgMBAAE=
-----END PUBLIC KEY-----`

      const result = parsePEM(validPEM)
      expect(result.errorCode).toBeNull()
      expect(result.type).toBe('PUBLIC KEY')
      expect(result.base64Content).toBeDefined()
      expect(result.derBuffer).toBeDefined()
    })

    test('解析有效的私钥 PEM', () => {
      const validPEM = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDTPm/kqMptDPte
AgMBAAECggEANZ8K6t5e4R0J0vJk
-----END PRIVATE KEY-----`

      const result = parsePEM(validPEM)
      expect(result.errorCode).toBeNull()
      expect(result.type).toBe('PRIVATE KEY')
    })

    test('缺少 BEGIN 标记时返回错误', () => {
      const invalidPEM = `MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0z5v5KjKbQz7Xl9q6Zux
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0z5v5KjKbQz7Xl9q6Zux
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0z5v5KjKbQz7Xl9q6Zux
-----END PUBLIC KEY-----`

      const result = parsePEM(invalidPEM)
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_PEM_BEGIN)
    })

    test('缺少 END 标记时返回错误', () => {
      const invalidPEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0z5v5KjKbQz7Xl9q6Zux
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0z5v5KjKbQz7Xl9q6Zux
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0z5v5KjKbQz7Xl9q6Zux`

      const result = parsePEM(invalidPEM)
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_PEM_END)
    })

    test('BEGIN 和 END 类型不匹配时返回错误', () => {
      const invalidPEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0z5v5KjKbQz7Xl9q6Zux
-----END PRIVATE KEY-----`

      const result = parsePEM(invalidPEM)
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_PEM_FORMAT)
    })

    test('内容过短时返回错误', () => {
      const invalidPEM = `-----BEGIN PUBLIC KEY-----
-----END PUBLIC KEY-----`

      const result = parsePEM(invalidPEM)
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_PEM_FORMAT)
    })

    test('无效的 Base64 内容时返回错误', () => {
      const invalidPEM = `-----BEGIN PUBLIC KEY-----
!!!invalid-base64!!!
-----END PUBLIC KEY-----`

      const result = parsePEM(invalidPEM)
      expect(result.error).toBeDefined()
    })
  })

  describe('formatPEM', () => {
    test('正确格式化 PEM', () => {
      const base64Content = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA'
      const type = 'PUBLIC KEY'
      const result = formatPEM(base64Content, type)

      expect(result).toContain(`-----BEGIN ${type}-----`)
      expect(result).toContain(`-----END ${type}-----`)
      expect(result).toContain(base64Content)
    })

    test('长内容正确换行', () => {
      const longContent = 'A'.repeat(200)
      const result = formatPEM(longContent, 'PUBLIC KEY')
      const lines = result.split('\n')
      const contentLines = lines.slice(1, -1)

      contentLines.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(64)
      })
    })
  })

  describe('isPEMPrivateKey / isPEMPublicKey', () => {
    test('正确识别私钥类型', () => {
      expect(isPEMPrivateKey('PRIVATE KEY')).toBe(true)
      expect(isPEMPrivateKey('RSA PRIVATE KEY')).toBe(true)
      expect(isPEMPrivateKey('EC PRIVATE KEY')).toBe(true)
      expect(isPEMPrivateKey('PUBLIC KEY')).toBe(false)
    })

    test('正确识别公钥类型', () => {
      expect(isPEMPublicKey('PUBLIC KEY')).toBe(true)
      expect(isPEMPublicKey('RSA PUBLIC KEY')).toBe(true)
      expect(isPEMPublicKey('PRIVATE KEY')).toBe(false)
    })
  })

  describe('arrayBufferToBase64 / base64ToArrayBuffer', () => {
    test('ArrayBuffer 转 Base64 往返转换', () => {
      const original = 'Hello, World!'
      const encoder = new TextEncoder()
      const buffer = encoder.encode(original).buffer

      const base64 = arrayBufferToBase64(buffer)
      const decodedBuffer = base64ToArrayBuffer(base64)
      const decoder = new TextDecoder()
      const decoded = decoder.decode(decodedBuffer)

      expect(decoded).toBe(original)
    })
  })

  describe('arrayBufferToHex / hexToArrayBuffer', () => {
    test('ArrayBuffer 转 Hex 往返转换', () => {
      const original = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd])
      const hex = arrayBufferToHex(original.buffer)

      expect(hex).toBe('000102fffefd')

      const decodedBuffer = hexToArrayBuffer(hex)
      const decoded = new Uint8Array(decodedBuffer)

      expect(decoded).toEqual(original)
    })
  })

  describe('formatHexWithColon / parseHexWithColon', () => {
    test('Hex 字符串添加冒号分隔符', () => {
      const hex = 'aabbccddeeff'
      const formatted = formatHexWithColon(hex)
      expect(formatted).toBe('aa:bb:cc:dd:ee:ff')
    })

    test('移除冒号分隔符', () => {
      const formatted = 'aa:bb:cc:dd:ee:ff'
      const hex = parseHexWithColon(formatted)
      expect(hex).toBe('aabbccddeeff')
    })

    test('往返转换保持一致', () => {
      const original = 'aabbccddeeff'
      const formatted = formatHexWithColon(original)
      const parsed = parseHexWithColon(formatted)
      expect(parsed).toBe(original)
    })
  })

  describe('PEM_TYPES', () => {
    test('包含所有必要的 PEM 类型', () => {
      expect(PEM_TYPES.PUBLIC_KEY).toBe('PUBLIC KEY')
      expect(PEM_TYPES.PRIVATE_KEY).toBe('PRIVATE KEY')
      expect(PEM_TYPES.RSA_PUBLIC_KEY).toBe('RSA PUBLIC KEY')
      expect(PEM_TYPES.RSA_PRIVATE_KEY).toBe('RSA PRIVATE KEY')
      expect(PEM_TYPES.EC_PRIVATE_KEY).toBe('EC PRIVATE KEY')
    })
  })
})
