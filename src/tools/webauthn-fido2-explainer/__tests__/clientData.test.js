import { describe, test, expect } from 'vitest'
import {
  parseClientDataJSON,
  getClientDataTypeDescription,
  validateChallenge,
  validateOrigin,
} from '../logic/clientData.js'
import { stringToBase64Url } from '../logic/base64url.js'

describe('clientDataJSON 解析', () => {
  describe('parseClientDataJSON', () => {
    test('解析注册类型的 clientDataJSON', () => {
      const clientData = {
        type: 'webauthn.create',
        challenge: 'test-challenge-123',
        origin: 'https://example.com',
        crossOrigin: false,
      }
      const jsonString = JSON.stringify(clientData)
      const base64url = stringToBase64Url(jsonString)

      const result = parseClientDataJSON(base64url)

      expect(result.type).toBe('webauthn.create')
      expect(result.challenge).toBe('test-challenge-123')
      expect(result.origin).toBe('https://example.com')
      expect(result.crossOrigin).toBe(false)
    })

    test('解析认证类型的 clientDataJSON', () => {
      const clientData = {
        type: 'webauthn.get',
        challenge: 'auth-challenge-456',
        origin: 'https://app.example.com',
      }
      const jsonString = JSON.stringify(clientData)

      const result = parseClientDataJSON(jsonString)

      expect(result.type).toBe('webauthn.get')
      expect(result.challenge).toBe('auth-challenge-456')
      expect(result.origin).toBe('https://app.example.com')
      expect(result.crossOrigin).toBe(false)
    })

    test('解析 Uint8Array 输入', () => {
      const clientData = {
        type: 'webauthn.create',
        challenge: 'challenge',
        origin: 'https://example.com',
      }
      const jsonString = JSON.stringify(clientData)
      const encoder = new TextEncoder()
      const bytes = encoder.encode(jsonString)

      const result = parseClientDataJSON(bytes)

      expect(result.type).toBe('webauthn.create')
      expect(result.challenge).toBe('challenge')
      expect(result.origin).toBe('https://example.com')
    })

    test('crossOrigin 为 true 时正确解析', () => {
      const clientData = {
        type: 'webauthn.get',
        challenge: 'challenge',
        origin: 'https://example.com',
        crossOrigin: true,
      }
      const jsonString = JSON.stringify(clientData)

      const result = parseClientDataJSON(jsonString)

      expect(result.crossOrigin).toBe(true)
    })

    test('包含 tokenBinding 时正确解析', () => {
      const clientData = {
        type: 'webauthn.get',
        challenge: 'challenge',
        origin: 'https://example.com',
        tokenBinding: {
          status: 'present',
          id: 'token-id',
        },
      }
      const jsonString = JSON.stringify(clientData)

      const result = parseClientDataJSON(jsonString)

      expect(result.tokenBinding).toEqual({
        status: 'present',
        id: 'token-id',
      })
    })

    test('对无效输入类型抛出错误', () => {
      expect(() => parseClientDataJSON(123)).toThrow('clientData 必须是 Base64URL 字符串或 Uint8Array')
      expect(() => parseClientDataJSON(null)).toThrow('clientData 必须是 Base64URL 字符串或 Uint8Array')
      expect(() => parseClientDataJSON({})).toThrow('clientData 必须是 Base64URL 字符串或 Uint8Array')
    })
  })

  describe('getClientDataTypeDescription', () => {
    test('返回注册类型的描述', () => {
      expect(getClientDataTypeDescription('webauthn.create')).toBe('WebAuthn 注册（创建新凭证）')
    })

    test('返回认证类型的描述', () => {
      expect(getClientDataTypeDescription('webauthn.get')).toBe('WebAuthn 认证（使用已有凭证）')
    })

    test('返回未知类型的默认描述', () => {
      expect(getClientDataTypeDescription('unknown')).toBe('未知类型: unknown')
    })
  })

  describe('validateChallenge', () => {
    test('challenge 匹配时返回 true', () => {
      expect(validateChallenge('abc123', 'abc123')).toBe(true)
    })

    test('challenge 不匹配时返回 false', () => {
      expect(validateChallenge('abc123', 'def456')).toBe(false)
    })
  })

  describe('validateOrigin', () => {
    test('origin 匹配时返回 true', () => {
      expect(validateOrigin('https://example.com', 'https://example.com')).toBe(true)
    })

    test('origin 不匹配时返回 false', () => {
      expect(validateOrigin('https://example.com', 'https://other.com')).toBe(false)
    })
  })
})
