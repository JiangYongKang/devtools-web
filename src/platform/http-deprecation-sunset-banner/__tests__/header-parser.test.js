import {
  parseHttpDate,
  parseDeprecationHeader,
  parseSunsetHeader,
  parseLinkHeader,
  parseWarningHeader,
  getDeprecationLinks,
  getSunsetLinks,
  parseHeadersFromObject,
  parseHeadersFromText,
  parseAllHeaders,
} from '../logic/header-parser'
import { InvalidDateError } from '../logic/errors'

describe('parseHttpDate', () => {
  it('解析标准 HTTP 日期格式', () => {
    const dateStr = 'Sun, 01 Jan 2026 00:00:00 GMT'
    const result = parseHttpDate(dateStr)
    expect(result).toBeInstanceOf(Date)
    expect(result.getUTCFullYear()).toBe(2026)
    expect(result.getUTCMonth()).toBe(0)
    expect(result.getUTCDate()).toBe(1)
  })

  it('对空输入返回 null', () => {
    expect(parseHttpDate('')).toBeNull()
    expect(parseHttpDate(null)).toBeNull()
  })

  it('无效日期抛出 InvalidDateError', () => {
    expect(() => parseHttpDate('invalid-date')).toThrow(InvalidDateError)
  })
})

describe('parseDeprecationHeader', () => {
  it('解析日期格式的 Deprecation 头', () => {
    const result = parseDeprecationHeader('Sun, 01 Jan 2026 00:00:00 GMT')
    expect(result.type).toBe('date')
    expect(result.value).toBeInstanceOf(Date)
  })

  it('解析版本号格式的 Deprecation 头', () => {
    const result = parseDeprecationHeader('"v1"')
    expect(result.type).toBe('version')
    expect(result.value).toBe('v1')
  })

  it('解析不带引号的版本号', () => {
    const result = parseDeprecationHeader('v2')
    expect(result.type).toBe('version')
    expect(result.value).toBe('v2')
  })

  it('对空输入返回 null', () => {
    expect(parseDeprecationHeader('')).toBeNull()
  })
})

describe('parseSunsetHeader', () => {
  it('解析 Sunset 头日期', () => {
    const result = parseSunsetHeader('Mon, 01 Feb 2026 00:00:00 GMT')
    expect(result).toBeInstanceOf(Date)
    expect(result.getUTCMonth()).toBe(1)
  })

  it('对空输入返回 null', () => {
    expect(parseSunsetHeader('')).toBeNull()
  })
})

describe('parseLinkHeader', () => {
  it('解析单个 Link 头', () => {
    const header = '<https://api.example.com/docs>; rel="deprecation"; type="text/html"'
    const result = parseLinkHeader(header)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://api.example.com/docs')
    expect(result[0].params.rel).toBe('deprecation')
    expect(result[0].params.type).toBe('text/html')
  })

  it('解析逗号分隔的多个 Link 头', () => {
    const header = [
      '<https://api.example.com/deprecation>; rel="deprecation"',
      '<https://api.example.com/sunset>; rel="sunset"',
    ].join(', ')
    const result = parseLinkHeader(header)
    expect(result).toHaveLength(2)
    expect(result[0].params.rel).toBe('deprecation')
    expect(result[1].params.rel).toBe('sunset')
  })

  it('正确处理引号内的逗号', () => {
    const header = '<https://api.example.com/docs>; title="API Docs, v1"; rel="deprecation"'
    const result = parseLinkHeader(header)
    expect(result).toHaveLength(1)
    expect(result[0].params.title).toBe('API Docs, v1')
  })

  it('对空输入返回空数组', () => {
    expect(parseLinkHeader('')).toEqual([])
  })
})

describe('parseWarningHeader', () => {
  it('解析单个 Warning 头', () => {
    const header = '299 - "This API is deprecated"'
    const result = parseWarningHeader(header)
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe(299)
    expect(result[0].agent).toBe('-')
    expect(result[0].text).toBe('This API is deprecated')
  })

  it('解析带日期的 Warning 头', () => {
    const header = '299 - "Deprecated" "Sun, 01 Jan 2026 00:00:00 GMT"'
    const result = parseWarningHeader(header)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBeInstanceOf(Date)
  })

  it('解析逗号分隔的多个 Warning 头', () => {
    const header = '299 - "First", 299 - "Second"'
    const result = parseWarningHeader(header)
    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('First')
    expect(result[1].text).toBe('Second')
  })

  it('对空输入返回空数组', () => {
    expect(parseWarningHeader('')).toEqual([])
  })
})

describe('getDeprecationLinks', () => {
  it('筛选出 rel=deprecation 的链接', () => {
    const links = [
      { url: 'https://a.com', params: { rel: 'deprecation' } },
      { url: 'https://b.com', params: { rel: 'sunset' } },
      { url: 'https://c.com', params: { rel: 'deprecation' } },
    ]
    const result = getDeprecationLinks(links)
    expect(result).toHaveLength(2)
    expect(result.every(l => l.params.rel === 'deprecation')).toBe(true)
  })
})

describe('getSunsetLinks', () => {
  it('筛选出 rel=sunset 的链接', () => {
    const links = [
      { url: 'https://a.com', params: { rel: 'deprecation' } },
      { url: 'https://b.com', params: { rel: 'sunset' } },
    ]
    const result = getSunsetLinks(links)
    expect(result).toHaveLength(1)
    expect(result[0].params.rel).toBe('sunset')
  })
})

describe('parseHeadersFromObject', () => {
  it('解析所有相关头', () => {
    const headers = {
      'Deprecation': 'Sun, 01 Jan 2026 00:00:00 GMT',
      'Sunset': 'Mon, 01 Feb 2026 00:00:00 GMT',
      'Link': '<https://docs.com>; rel="deprecation"',
      'Warning': '299 - "Deprecated"',
    }
    const result = parseHeadersFromObject(headers)
    expect(result.deprecation).toBeDefined()
    expect(result.sunset).toBeDefined()
    expect(result.links).toBeDefined()
    expect(result.warnings).toBeDefined()
  })

  it('忽略不相关的头', () => {
    const headers = {
      'Content-Type': 'application/json',
      'X-Custom-Header': 'value',
    }
    const result = parseHeadersFromObject(headers)
    expect(result.deprecation).toBeUndefined()
    expect(result.sunset).toBeUndefined()
  })
})

describe('parseHeadersFromText', () => {
  it('从文本解析头', () => {
    const text = `HTTP/1.1 200 OK
Deprecation: Sun, 01 Jan 2026 00:00:00 GMT
Sunset: Mon, 01 Feb 2026 00:00:00 GMT`
    const result = parseHeadersFromText(text)
    expect(result.deprecation).toBeDefined()
    expect(result.sunset).toBeDefined()
  })

  it('没有状态行也能解析', () => {
    const text = `Deprecation: Sun, 01 Jan 2026 00:00:00 GMT
Warning: 299 - "Deprecated"`
    const result = parseHeadersFromText(text)
    expect(result.deprecation).toBeDefined()
    expect(result.warnings).toBeDefined()
  })
})

describe('parseAllHeaders', () => {
  it('能够解析对象输入', () => {
    const headers = {
      'Deprecation': 'Sun, 01 Jan 2026 00:00:00 GMT',
    }
    const result = parseAllHeaders(headers)
    expect(result.deprecation).toBeDefined()
  })

  it('能够解析字符串输入', () => {
    const text = 'Deprecation: Sun, 01 Jan 2026 00:00:00 GMT'
    const result = parseAllHeaders(text)
    expect(result.deprecation).toBeDefined()
  })

  it('对无效输入返回空对象', () => {
    expect(parseAllHeaders(null)).toEqual({})
    expect(parseAllHeaders(undefined)).toEqual({})
  })
})
