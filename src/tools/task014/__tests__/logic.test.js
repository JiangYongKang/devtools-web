import { describe, test, expect } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  SECURITY_WARNING,
  AUDIT_NOTE,
  PAYLOAD_DISPLAY_LIMIT,
  getErrorMessage,
  base64UrlDecode,
  stringToUtf8,
  decodeJsonSegment,
  parseToken,
} from '../logic'

describe('JWT Logic Functions', () => {
  describe('Constants', () => {
    test('ERROR_CODES should contain all required error codes', () => {
      expect(ERROR_CODES.NULL_INPUT).toBe('NULL_INPUT')
      expect(ERROR_CODES.EMPTY_TOKEN).toBe('EMPTY_TOKEN')
      expect(ERROR_CODES.INVALID_SEGMENTS).toBe('INVALID_SEGMENTS')
      expect(ERROR_CODES.MISSING_HEADER).toBe('MISSING_HEADER')
      expect(ERROR_CODES.MISSING_PAYLOAD).toBe('MISSING_PAYLOAD')
      expect(ERROR_CODES.MISSING_SIGNATURE).toBe('MISSING_SIGNATURE')
      expect(ERROR_CODES.BASE64URL_DECODE_FAILED).toBe('BASE64URL_DECODE_FAILED')
      expect(ERROR_CODES.JSON_PARSE_FAILED).toBe('JSON_PARSE_FAILED')
      expect(ERROR_CODES.ALGORITHM_SEGMENT_INVALID).toBe('ALGORITHM_SEGMENT_INVALID')
      expect(ERROR_CODES.INVALID_PARAMETER).toBe('INVALID_PARAMETER')
    })

    test('ERROR_MESSAGES should have messages for all error codes', () => {
      expect(ERROR_MESSAGES[ERROR_CODES.NULL_INPUT]).toBeTruthy()
      expect(ERROR_MESSAGES[ERROR_CODES.EMPTY_TOKEN]).toBeTruthy()
      expect(ERROR_MESSAGES[ERROR_CODES.INVALID_SEGMENTS]).toBeTruthy()
      expect(ERROR_MESSAGES[ERROR_CODES.MISSING_HEADER]).toBeTruthy()
      expect(ERROR_MESSAGES[ERROR_CODES.MISSING_PAYLOAD]).toBeTruthy()
      expect(ERROR_MESSAGES[ERROR_CODES.MISSING_SIGNATURE]).toBeTruthy()
      expect(ERROR_MESSAGES[ERROR_CODES.BASE64URL_DECODE_FAILED]).toBeTruthy()
      expect(ERROR_MESSAGES[ERROR_CODES.JSON_PARSE_FAILED]).toBeTruthy()
      expect(ERROR_MESSAGES[ERROR_CODES.ALGORITHM_SEGMENT_INVALID]).toBeTruthy()
      expect(ERROR_MESSAGES[ERROR_CODES.INVALID_PARAMETER]).toBeTruthy()
    })

    test('SECURITY_WARNING should be the required message', () => {
      expect(SECURITY_WARNING).toBe('仅解码未验签，不可用于安全决策')
    })

    test('AUDIT_NOTE should contain necessary content', () => {
      expect(AUDIT_NOTE).toContain('仅在浏览器本地解码')
      expect(AUDIT_NOTE).toContain('不验证签名有效性')
      expect(AUDIT_NOTE).toContain('仅供调试和开发分析使用')
    })

    test('PAYLOAD_DISPLAY_LIMIT should be a positive number', () => {
      expect(typeof PAYLOAD_DISPLAY_LIMIT).toBe('number')
      expect(PAYLOAD_DISPLAY_LIMIT).toBeGreaterThan(0)
    })
  })

  describe('getErrorMessage', () => {
    test('should return message for known error code', () => {
      expect(getErrorMessage(ERROR_CODES.NULL_INPUT)).toBe(ERROR_MESSAGES[ERROR_CODES.NULL_INPUT])
      expect(getErrorMessage(ERROR_CODES.EMPTY_TOKEN)).toBe(ERROR_MESSAGES[ERROR_CODES.EMPTY_TOKEN])
    })

    test('should return default message for unknown error code', () => {
      expect(getErrorMessage('UNKNOWN_CODE')).toBe('未知错误')
    })
  })

  describe('base64UrlDecode', () => {
    test('should decode standard base64url encoded string', () => {
      const encoded = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      const result = base64UrlDecode(encoded)
      expect(typeof result).toBe('string')
      expect(result).toBeTruthy()
    })

    test('should handle padding-less base64url', () => {
      const encoded = 'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ'
      const result = base64UrlDecode(encoded)
      expect(typeof result).toBe('string')
    })

    test('should handle special characters (- and _)', () => {
      const encoded = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      const result = base64UrlDecode(encoded)
      expect(result).toBe('{"alg":"HS256","typ":"JWT"}')
    })

    test('should throw error for non-string input', () => {
      expect(() => base64UrlDecode(null)).toThrow(ERROR_CODES.BASE64URL_DECODE_FAILED)
      expect(() => base64UrlDecode(undefined)).toThrow(ERROR_CODES.BASE64URL_DECODE_FAILED)
      expect(() => base64UrlDecode(123)).toThrow(ERROR_CODES.BASE64URL_DECODE_FAILED)
    })

    test('should throw error for invalid base64', () => {
      expect(() => base64UrlDecode('!!!')).toThrow(ERROR_CODES.BASE64URL_DECODE_FAILED)
    })
  })

  describe('stringToUtf8', () => {
    test('should convert binary string to UTF-8', () => {
      const binary = '{"alg":"HS256","typ":"JWT"}'
      const result = stringToUtf8(binary)
      expect(result).toBe(binary)
    })

    test('should handle UTF-8 characters', () => {
      const binary = '{"name":"John"}'
      const result = stringToUtf8(binary)
      expect(result).toBe('{"name":"John"}')
    })
  })

  describe('decodeJsonSegment', () => {
    test('should decode and parse valid JSON segment', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      const result = decodeJsonSegment(header)

      expect(result).toHaveProperty('raw')
      expect(result).toHaveProperty('json')
      expect(result.json.alg).toBe('HS256')
      expect(result.json.typ).toBe('JWT')
    })

    test('should throw JSON_PARSE_FAILED for invalid JSON', () => {
      const invalidJson = btoa('not valid json')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      expect(() => decodeJsonSegment(invalidJson)).toThrow(ERROR_CODES.JSON_PARSE_FAILED)
    })

    test('should throw BASE64URL_DECODE_FAILED for invalid base64', () => {
      expect(() => decodeJsonSegment('!!!')).toThrow(ERROR_CODES.BASE64URL_DECODE_FAILED)
    })
  })

  describe('parseToken - success cases', () => {
    const createValidToken = (headerObj, payloadObj) => {
      const header = btoa(JSON.stringify(headerObj))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const payload = btoa(JSON.stringify(payloadObj))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const signature = 'signature123'
      return `${header}.${payload}.${signature}`
    }

    test('should parse valid JWT token successfully', () => {
      const headerObj = { alg: 'HS256', typ: 'JWT' }
      const payloadObj = {
        sub: '1234567890',
        name: 'John Doe',
        iat: 1516239022,
      }
      const token = createValidToken(headerObj, payloadObj)

      const result = parseToken(token)

      expect(result.success).toBe(true)
      expect(result.isUnverifiedDecodeOnly).toBe(true)
      expect(result.rawToken).toBe(token)
      expect(result.headerSegment).toBeTruthy()
      expect(result.payloadSegment).toBeTruthy()
      expect(result.signatureSegment).toBe('signature123')
      expect(result.headerJson).toContain('"alg": "HS256"')
      expect(result.payloadJson).toContain('"sub": "1234567890"')
      expect(result.payloadRaw).toBeTruthy()
      expect(result.securityWarning).toBe(SECURITY_WARNING)
      expect(result.auditNote).toBe(AUDIT_NOTE)
      expect(result.payloadTruncated).toBe(false)
      expect(typeof result.payloadDisplayedLength).toBe('number')
    })

    test('should support different algorithms (RS256)', () => {
      const token = createValidToken(
        { alg: 'RS256', typ: 'JWT', kid: 'key-123' },
        { sub: 'user123' }
      )

      const result = parseToken(token)
      expect(result.success).toBe(true)
      expect(result.headerJson).toContain('"RS256"')
    })

    test('should trim whitespace from input', () => {
      const token = createValidToken(
        { alg: 'HS256', typ: 'JWT' },
        { sub: 'test' }
      )
      const tokenWithSpaces = `  ${token}  \n\t`

      const result = parseToken(tokenWithSpaces)
      expect(result.success).toBe(true)
      expect(result.rawToken).toBe(token)
    })

    test('should handle large payload without truncation when within limit', () => {
      const smallPayload = { data: 'x'.repeat(1000) }
      const token = createValidToken(
        { alg: 'HS256', typ: 'JWT' },
        smallPayload
      )

      const result = parseToken(token)
      expect(result.success).toBe(true)
      expect(result.payloadTruncated).toBe(false)
    })
  })

  describe('parseToken - error cases', () => {
    test('should return NULL_INPUT for null input', () => {
      const result = parseToken(null)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
      expect(result.errorMessage).toBeTruthy()
    })

    test('should return NULL_INPUT for undefined input', () => {
      const result = parseToken(undefined)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
    })

    test('should return INVALID_PARAMETER for non-string input', () => {
      expect(parseToken(123).errorCode).toBe(ERROR_CODES.INVALID_PARAMETER)
      expect(parseToken({}).errorCode).toBe(ERROR_CODES.INVALID_PARAMETER)
      expect(parseToken([]).errorCode).toBe(ERROR_CODES.INVALID_PARAMETER)
    })

    test('should return EMPTY_TOKEN for empty string', () => {
      expect(parseToken('').errorCode).toBe(ERROR_CODES.EMPTY_TOKEN)
      expect(parseToken('   ').errorCode).toBe(ERROR_CODES.EMPTY_TOKEN)
      expect(parseToken('\n\t').errorCode).toBe(ERROR_CODES.EMPTY_TOKEN)
    })

    test('should return INVALID_SEGMENTS for wrong number of segments', () => {
      expect(parseToken('header.payload').errorCode).toBe(ERROR_CODES.INVALID_SEGMENTS)
      expect(parseToken('header').errorCode).toBe(ERROR_CODES.INVALID_SEGMENTS)
      expect(parseToken('a.b.c.d').errorCode).toBe(ERROR_CODES.INVALID_SEGMENTS)
    })

    test('should return MISSING_HEADER for empty header segment', () => {
      const result = parseToken('.payload.signature')
      expect(result.errorCode).toBe(ERROR_CODES.MISSING_HEADER)
    })

    test('should return MISSING_PAYLOAD for empty payload segment', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const result = parseToken(`${header}..signature`)
      expect(result.errorCode).toBe(ERROR_CODES.MISSING_PAYLOAD)
    })

    test('should return MISSING_SIGNATURE for empty signature segment', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const payload = btoa(JSON.stringify({ sub: 'test' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const result = parseToken(`${header}.${payload}.`)
      expect(result.errorCode).toBe(ERROR_CODES.MISSING_SIGNATURE)
    })

    test('should return ALGORITHM_SEGMENT_INVALID when header has no alg field', () => {
      const header = btoa(JSON.stringify({ typ: 'JWT' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const payload = btoa(JSON.stringify({ sub: 'test' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const token = `${header}.${payload}.sig`

      const result = parseToken(token)
      expect(result.errorCode).toBe(ERROR_CODES.ALGORITHM_SEGMENT_INVALID)
    })

    test('should return BASE64URL_DECODE_FAILED for invalid base64 in header', () => {
      const token = '!!!.payload.signature'
      const result = parseToken(token)
      expect(result.errorCode).toBe(ERROR_CODES.BASE64URL_DECODE_FAILED)
    })

    test('should return JSON_PARSE_FAILED for invalid JSON in header', () => {
      const header = btoa('not valid json')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const payload = btoa(JSON.stringify({ sub: 'test' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const token = `${header}.${payload}.sig`

      const result = parseToken(token)
      expect(result.errorCode).toBe(ERROR_CODES.JSON_PARSE_FAILED)
    })

    test('should return BASE64URL_DECODE_FAILED for invalid base64 in payload', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const token = `${header}.!!!.sig`

      const result = parseToken(token)
      expect(result.errorCode).toBe(ERROR_CODES.BASE64URL_DECODE_FAILED)
    })

    test('should return JSON_PARSE_FAILED for invalid JSON in payload', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const payload = btoa('not valid json')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const token = `${header}.${payload}.sig`

      const result = parseToken(token)
      expect(result.errorCode).toBe(ERROR_CODES.JSON_PARSE_FAILED)
    })
  })

  describe('segment information and security warning', () => {
    test('should always include security warning in successful result', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const payload = btoa(JSON.stringify({ sub: 'test' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const token = `${header}.${payload}.sig`

      const result = parseToken(token)

      expect(result.success).toBe(true)
      expect(result.securityWarning).toBe('仅解码未验签，不可用于安全决策')
      expect(result.isUnverifiedDecodeOnly).toBe(true)
    })

    test('should correctly map segments to their labels', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const payload = btoa(JSON.stringify({ sub: '123', name: 'Test' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const signature = 'test-signature-abc'
      const token = `${header}.${payload}.${signature}`

      const result = parseToken(token)

      expect(result.success).toBe(true)
      expect(result.headerSegment).toBe(header)
      expect(result.payloadSegment).toBe(payload)
      expect(result.signatureSegment).toBe(signature)
    })

    test('should include both raw and decoded JSON for header and payload', () => {
      const headerObj = { alg: 'HS256', typ: 'JWT', kid: 'key-1' }
      const payloadObj = { sub: 'user-1', role: 'admin', iat: 12345 }

      const header = btoa(JSON.stringify(headerObj))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const payload = btoa(JSON.stringify(payloadObj))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const token = `${header}.${payload}.sig`

      const result = parseToken(token)

      expect(result.success).toBe(true)
      expect(result.headerJson).toContain('HS256')
      expect(result.headerJson).toContain('key-1')
      expect(result.payloadJson).toContain('user-1')
      expect(result.payloadJson).toContain('admin')
    })
  })

  describe('integration tests', () => {
    test('realistic JWT token scenario', () => {
      const realisticHeader = {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'test-key-id',
      }

      const realisticPayload = {
        iss: 'https://auth.example.com',
        sub: 'google-oauth2|123456789',
        aud: 'client-id-abc',
        iat: 1516239022,
        exp: 1516242622,
        azp: 'client-id-abc',
        scope: 'openid profile email',
      }

      const header = btoa(JSON.stringify(realisticHeader))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const payload = btoa(JSON.stringify(realisticPayload))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const token = `${header}.${payload}.real-signature`

      const result = parseToken(token)

      expect(result.success).toBe(true)
      expect(result.isUnverifiedDecodeOnly).toBe(true)
      expect(result.securityWarning).toBeTruthy()
      expect(result.auditNote).toBeTruthy()
      expect(result.payloadTruncated).toBe(false)
      expect(result.headerJson).toContain('RS256')
      expect(result.payloadJson).toContain('auth.example.com')
      expect(result.payloadJson).toContain('google-oauth2|123456789')
      expect(result.payloadRaw).toBeTruthy()
    })

    test('error should have both code and message', () => {
      const result = parseToken(null)

      expect(result.success).toBe(false)
      expect(result.errorCode).toBeTruthy()
      expect(result.errorMessage).toBeTruthy()
      expect(typeof result.errorCode).toBe('string')
      expect(typeof result.errorMessage).toBe('string')
    })
  })
})
