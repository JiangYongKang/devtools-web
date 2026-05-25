import { describe, expect, test } from 'vitest'
import { ERROR_CODES } from '../logic/errors.js'
import {
    base64UrlDecode,
    base64UrlEncode,
    formatJson,
    parseJsonSegment,
    parseJwt,
    splitJwt,
} from '../logic/jwtParser.js'

describe('jwtParser', () => {
  describe('base64UrlDecode', () => {
    test('应该正确解码标准 Base64URL 字符串', () => {
      const result = base64UrlDecode('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
      expect(result.success).toBe(true)
      expect(result.text).toBe('{"alg":"HS256","typ":"JWT"}')
    })

    test('应该正确解码不带填充的字符串', () => {
      const result = base64UrlDecode('YWJj')
      expect(result.success).toBe(true)
      expect(result.text).toBe('abc')
    })

    test('应该正确解码包含 - 和 _ 的字符串', () => {
      const result = base64UrlDecode('Pz8_Pw')
      expect(result.success).toBe(true)
      expect(result.text).toBe('????')
    })

    test('无效 Base64URL 字符串应该返回错误', () => {
      const result = base64UrlDecode('!!!invalid!!!')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.BASE64URL_DECODE_ERROR)
    })

    test('应该返回 Uint8Array 字节数组', () => {
      const result = base64UrlDecode('YWJj')
      expect(result.success).toBe(true)
      expect(result.bytes).toBeInstanceOf(Uint8Array)
      expect(result.bytes.length).toBe(3)
    })
  })

  describe('base64UrlEncode', () => {
    test('应该正确编码字节数组为 Base64URL', () => {
      const encoder = new TextEncoder()
      const bytes = encoder.encode('{"alg":"HS256"}')
      const result = base64UrlEncode(bytes)
      expect(result).toBe('eyJhbGciOiJIUzI1NiJ9')
    })

    test('编码结果不应该包含填充字符', () => {
      const encoder = new TextEncoder()
      const bytes = encoder.encode('ab')
      const result = base64UrlEncode(bytes)
      expect(result).not.toContain('=')
    })

    test('编码结果应该使用 - 和 _ 替代 + 和 /', () => {
      const bytesWithPlus = new Uint8Array([0xfb, 0xff, 0xbf])
      const result1 = base64UrlEncode(bytesWithPlus)
      expect(result1).toContain('-')

      const bytesWithSlash = new Uint8Array([0xff, 0xff, 0x3f])
      const result2 = base64UrlEncode(bytesWithSlash)
      expect(result2).toContain('_')
    })
  })

  describe('parseJsonSegment', () => {
    test('应该正确解析有效 JSON', () => {
      const result = parseJsonSegment('{"alg":"HS256","typ":"JWT"}', 'Header')
      expect(result.success).toBe(true)
      expect(result.data.alg).toBe('HS256')
      expect(result.data.typ).toBe('JWT')
    })

    test('无效 JSON 应该返回错误', () => {
      const result = parseJsonSegment('{invalid json}', 'Header')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_JSON)
      expect(result.error.errorMessage).toContain('Header')
    })

    test('空字符串应该返回错误', () => {
      const result = parseJsonSegment('', 'Header')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_JSON)
    })
  })

  describe('splitJwt', () => {
    test('null 输入应该返回错误', () => {
      const result = splitJwt(null)
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.NULL_INPUT)
    })

    test('空字符串应该返回错误', () => {
      const result = splitJwt('')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.EMPTY_VALUE)
    })

    test('段数不正确应该返回错误', () => {
      const result = splitJwt('a.b')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_SEGMENT_COUNT)
      expect(result.segmentCount).toBe(2)
    })

    test('正确的三段 JWT 应该成功拆分', () => {
      const result = splitJwt('header.payload.signature')
      expect(result.success).toBe(true)
      expect(result.headerSegment).toBe('header')
      expect(result.payloadSegment).toBe('payload')
      expect(result.signatureSegment).toBe('signature')
      expect(result.signingInput).toBe('header.payload')
    })

    test('应该自动去除首尾空白', () => {
      const result = splitJwt('  header.payload.signature  ')
      expect(result.success).toBe(true)
      expect(result.headerSegment).toBe('header')
    })
  })

  describe('parseJwt', () => {
    test('应该正确解析有效的 JWT', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      const result = parseJwt(jwt)
      expect(result.success).toBe(true)
      expect(result.parsed).not.toBeNull()
      expect(result.parsed.header.alg).toBe('HS256')
      expect(result.parsed.payload.sub).toBe('1234567890')
      expect(result.parsed.payload.name).toBe('John Doe')
    })

    test('无效 JWT 格式应该返回错误', () => {
      const result = parseJwt('invalid.jwt')
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_SEGMENT_COUNT)
    })

    test('无效 Base64URL 应该返回错误', () => {
      const result = parseJwt('!!!.!!!.!!!')
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.BASE64URL_DECODE_ERROR)
      expect(result.parsed.segments[0].decodeError).not.toBeNull()
    })

    test('无效 JSON 应该返回错误', () => {
      const invalidHeaderJwt = 'YWJj.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      const result = parseJwt(invalidHeaderJwt)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_JSON)
    })

    test('应该返回所有段的详细信息', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      const result = parseJwt(jwt)
      expect(result.parsed.segments.length).toBe(3)
      expect(result.parsed.segments[0].name).toBe('Header')
      expect(result.parsed.segments[1].name).toBe('Payload')
      expect(result.parsed.segments[2].name).toBe('Signature')
    })
  })

  describe('formatJson', () => {
    test('应该格式化 JSON 对象', () => {
      const obj = { alg: 'HS256', typ: 'JWT' }
      const result = formatJson(obj, 2)
      expect(result).toContain('"alg": "HS256"')
      expect(result).toContain('"typ": "JWT"')
      expect(result).toContain('\n')
    })

    test('应该支持自定义缩进', () => {
      const obj = { alg: 'HS256' }
      const result = formatJson(obj, 4)
      expect(result).toContain('    "alg"')
    })
  })
})
