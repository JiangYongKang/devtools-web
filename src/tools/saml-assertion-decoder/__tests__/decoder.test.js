import { describe, test, expect } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
} from '../logic/errors.js'
import {
  detectEncoding,
  parseSamlTimestamp,
  formatSamlTimestamp,
  validateTiming,
  validateAudience,
} from '../logic/decoder.js'
import {
  createValidAssertionXml,
  createExpiredAssertionXml,
  createWrongAudienceAssertionXml,
  getExample,
  getAllExamplesInfo,
} from '../logic/examples.js'

describe('errors', () => {
  describe('ERROR_CODES', () => {
    test('包含所有必需的错误码', () => {
      expect(ERROR_CODES.NULL_INPUT).toBe('NULL_INPUT')
      expect(ERROR_CODES.EMPTY_INPUT).toBe('EMPTY_INPUT')
      expect(ERROR_CODES.INVALID_BASE64).toBe('INVALID_BASE64')
      expect(ERROR_CODES.INVALID_XML).toBe('INVALID_XML')
      expect(ERROR_CODES.XML_PARSE_ERROR).toBe('XML_PARSE_ERROR')
      expect(ERROR_CODES.MISSING_ASSERTION).toBe('MISSING_ASSERTION')
      expect(ERROR_CODES.INVALID_TIMESTAMP).toBe('INVALID_TIMESTAMP')
    })
  })

  describe('ERROR_MESSAGES', () => {
    test('所有错误码都有对应的错误信息', () => {
      Object.values(ERROR_CODES).forEach((code) => {
        expect(ERROR_MESSAGES[code]).toBeDefined()
        expect(typeof ERROR_MESSAGES[code]).toBe('string')
        expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
      })
    })
  })

  describe('getErrorMessage', () => {
    test('已知错误码返回正确的错误信息', () => {
      expect(getErrorMessage(ERROR_CODES.NULL_INPUT)).toBe(ERROR_MESSAGES[ERROR_CODES.NULL_INPUT])
      expect(getErrorMessage(ERROR_CODES.EMPTY_INPUT)).toBe(ERROR_MESSAGES[ERROR_CODES.EMPTY_INPUT])
    })

    test('未知错误码返回默认信息', () => {
      expect(getErrorMessage('UNKNOWN_ERROR')).toBe('未知错误')
    })
  })

  describe('createError', () => {
    test('创建包含正确错误码和默认信息的错误对象', () => {
      const result = createError(ERROR_CODES.INVALID_BASE64)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_BASE64)
      expect(result.errorMessage).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_BASE64])
    })

    test('创建包含自定义信息的错误对象', () => {
      const customMessage = '自定义错误信息'
      const result = createError(ERROR_CODES.INVALID_BASE64, customMessage)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_BASE64)
      expect(result.errorMessage).toBe(customMessage)
    })
  })
})

describe('detectEncoding', () => {
  test('以 < 开头的输入识别为 XML', () => {
    expect(detectEncoding('<saml2:Assertion>')).toBe('xml')
    expect(detectEncoding('  <Response>')).toBe('xml')
  })

  test('不以 < 开头的输入识别为 Base64', () => {
    expect(detectEncoding('PD94bWwg')).toBe('base64')
    expect(detectEncoding('  SGVsbG8=')).toBe('base64')
  })
})

describe('parseSamlTimestamp', () => {
  test('解析有效的 ISO 时间戳', () => {
    const timestamp = '2024-01-15T10:30:00Z'
    const result = parseSamlTimestamp(timestamp)
    expect(result).toBeInstanceOf(Date)
    expect(result.getUTCFullYear()).toBe(2024)
    expect(result.getUTCMonth()).toBe(0)
    expect(result.getUTCDate()).toBe(15)
    expect(result.getUTCHours()).toBe(10)
    expect(result.getUTCMinutes()).toBe(30)
  })

  test('解析带有时区偏移的时间戳', () => {
    const timestamp = '2024-01-15T10:30:00+00:00'
    const result = parseSamlTimestamp(timestamp)
    expect(result).toBeInstanceOf(Date)
  })

  test('空输入返回 null', () => {
    expect(parseSamlTimestamp(null)).toBeNull()
    expect(parseSamlTimestamp('')).toBeNull()
    expect(parseSamlTimestamp(undefined)).toBeNull()
  })

  test('无效时间戳抛出错误', () => {
    expect(() => parseSamlTimestamp('invalid-date')).toThrow()
  })
})

describe('formatSamlTimestamp', () => {
  test('格式化 Date 对象为 ISO 字符串', () => {
    const date = new Date('2024-01-15T10:30:00Z')
    const result = formatSamlTimestamp(date)
    expect(result).toBe('2024-01-15T10:30:00.000Z')
  })

  test('空输入返回 null', () => {
    expect(formatSamlTimestamp(null)).toBeNull()
    expect(formatSamlTimestamp(undefined)).toBeNull()
  })
})

describe('validateTiming', () => {
  const baseConditions = (notBefore, notOnOrAfter) => ({
    notBefore: notBefore ? new Date(notBefore) : null,
    notOnOrAfter: notOnOrAfter ? new Date(notOnOrAfter) : null,
    audiences: [],
  })

  test('无 Conditions 返回 noConditions 状态', () => {
    const result = validateTiming(null)
    expect(result.status).toBe('noConditions')
    expect(result.message).toBe('无时间限制条件')
  })

  test('时间在有效范围内返回 valid 状态', () => {
    const conditions = baseConditions(
      '2024-01-15T10:00:00Z',
      '2024-01-15T11:00:00Z'
    )
    const currentTime = new Date('2024-01-15T10:30:00Z')
    const result = validateTiming(conditions, currentTime)
    expect(result.status).toBe('valid')
    expect(result.message).toBe('时间有效性验证通过')
  })

  test('时间早于 NotBefore 返回 notYetValid 状态', () => {
    const conditions = baseConditions(
      '2024-01-15T10:00:00Z',
      '2024-01-15T11:00:00Z'
    )
    const currentTime = new Date('2024-01-15T09:30:00Z')
    const result = validateTiming(conditions, currentTime)
    expect(result.status).toBe('notYetValid')
    expect(result.message).toBe('断言尚未生效')
  })

  test('时间晚于或等于 NotOnOrAfter 返回 expired 状态', () => {
    const conditions = baseConditions(
      '2024-01-15T10:00:00Z',
      '2024-01-15T11:00:00Z'
    )
    const currentTime = new Date('2024-01-15T11:00:00Z')
    const result = validateTiming(conditions, currentTime)
    expect(result.status).toBe('expired')
    expect(result.message).toBe('断言已过期')
  })

  test('只有 NotBefore 且时间在其之后返回 valid', () => {
    const conditions = baseConditions('2024-01-15T10:00:00Z', null)
    const currentTime = new Date('2024-01-15T10:30:00Z')
    const result = validateTiming(conditions, currentTime)
    expect(result.status).toBe('valid')
  })

  test('只有 NotOnOrAfter 且时间在其之前返回 valid', () => {
    const conditions = baseConditions(null, '2024-01-15T11:00:00Z')
    const currentTime = new Date('2024-01-15T10:30:00Z')
    const result = validateTiming(conditions, currentTime)
    expect(result.status).toBe('valid')
  })

  test('不使用参数时使用当前时间', () => {
    const now = new Date()
    const conditions = baseConditions(
      new Date(now.getTime() - 3600000).toISOString(),
      new Date(now.getTime() + 3600000).toISOString()
    )
    const result = validateTiming(conditions)
    expect(result.status).toBe('valid')
  })
})

describe('validateAudience', () => {
  test('无 Conditions 返回 noAudience 状态', () => {
    const result = validateAudience(null, 'https://sp.example.com')
    expect(result.status).toBe('noAudience')
  })

  test('空 Audiences 返回 noAudience 状态', () => {
    const conditions = { audiences: [] }
    const result = validateAudience(conditions, 'https://sp.example.com')
    expect(result.status).toBe('noAudience')
  })

  test('未设置期望 SP Entity ID 返回 noExpected 状态', () => {
    const conditions = { audiences: ['https://sp.example.com'] }
    const result = validateAudience(conditions, '')
    expect(result.status).toBe('noExpected')
    expect(result.audiences).toEqual(['https://sp.example.com'])
  })

  test('Audience 匹配返回 valid 状态', () => {
    const conditions = { audiences: ['https://sp.example.com'] }
    const result = validateAudience(conditions, 'https://sp.example.com')
    expect(result.status).toBe('valid')
    expect(result.message).toBe('受众验证通过')
    expect(result.expected).toBe('https://sp.example.com')
    expect(result.audiences).toEqual(['https://sp.example.com'])
  })

  test('多个 Audience 中有一个匹配返回 valid 状态', () => {
    const conditions = {
      audiences: [
        'https://sp1.example.com',
        'https://sp2.example.com',
        'https://sp3.example.com',
      ],
    }
    const result = validateAudience(conditions, 'https://sp2.example.com')
    expect(result.status).toBe('valid')
  })

  test('Audience 不匹配返回 mismatch 状态', () => {
    const conditions = { audiences: ['https://wrong-sp.example.com'] }
    const result = validateAudience(conditions, 'https://sp.example.com')
    expect(result.status).toBe('mismatch')
    expect(result.message).toBe('受众不匹配')
    expect(result.expected).toBe('https://sp.example.com')
    expect(result.audiences).toEqual(['https://wrong-sp.example.com'])
  })

  test('匹配时忽略前后空白字符', () => {
    const conditions = { audiences: ['  https://sp.example.com  '] }
    const result = validateAudience(conditions, 'https://sp.example.com')
    expect(result.status).toBe('valid')
  })
})

describe('examples', () => {
  describe('createValidAssertionXml', () => {
    test('生成有效的 SAML 断言 XML', () => {
      const xml = createValidAssertionXml(
        'https://idp.example.com',
        'user@example.com',
        'https://sp.example.com',
        '_session123'
      )
      expect(xml).toContain('<saml2:Assertion')
      expect(xml).toContain('https://idp.example.com')
      expect(xml).toContain('user@example.com')
      expect(xml).toContain('https://sp.example.com')
      expect(xml).toContain('_session123')
      expect(xml).toContain('NotBefore')
      expect(xml).toContain('NotOnOrAfter')
    })
  })

  describe('createExpiredAssertionXml', () => {
    test('生成已过期的 SAML 断言 XML', () => {
      const xml = createExpiredAssertionXml(
        'https://idp.example.com',
        'user@example.com',
        'https://sp.example.com',
        '_session456'
      )
      expect(xml).toContain('<saml2:Assertion')
      expect(xml).toContain('_expired')
    })
  })

  describe('createWrongAudienceAssertionXml', () => {
    test('生成 Audience 不匹配的 SAML 断言 XML', () => {
      const xml = createWrongAudienceAssertionXml(
        'https://idp.example.com',
        'user@example.com',
        'https://wrong-sp.example.com',
        '_session789'
      )
      expect(xml).toContain('https://wrong-sp.example.com')
    })
  })

  describe('getExample', () => {
    test('获取 validIdp 示例', () => {
      const xml = getExample('validIdp')
      expect(xml).toBeDefined()
      expect(typeof xml).toBe('string')
      expect(xml.length).toBeGreaterThan(0)
      expect(xml).toContain('<saml2:Assertion')
    })

    test('获取 expired 示例', () => {
      const xml = getExample('expired')
      expect(xml).toBeDefined()
      expect(xml).toContain('_expired')
    })

    test('获取 wrongAudience 示例', () => {
      const xml = getExample('wrongAudience')
      expect(xml).toBeDefined()
      expect(xml).toContain('wrong-sp.example.com')
    })

    test('未知示例键返回 null', () => {
      expect(getExample('unknown')).toBeNull()
    })
  })

  describe('getAllExamplesInfo', () => {
    test('返回所有示例的信息', () => {
      const examples = getAllExamplesInfo()
      expect(Array.isArray(examples)).toBe(true)
      expect(examples.length).toBe(3)
      expect(examples[0]).toHaveProperty('key')
      expect(examples[0]).toHaveProperty('name')
      expect(examples[0]).toHaveProperty('description')
      expect(examples.map((e) => e.key)).toContain('validIdp')
      expect(examples.map((e) => e.key)).toContain('expired')
      expect(examples.map((e) => e.key)).toContain('wrongAudience')
    })
  })
})
