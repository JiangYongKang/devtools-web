import {
  createDeprecationNotice,
  mergeNotices,
  extractNoticesFromInput,
  formatDateForDisplay,
  formatRelativeTime,
  getHumanReadableMessage,
  getMachineReadableSummary,
} from '../logic/deprecation-notice'
import { SEVERITY } from '../logic/constants'

describe('createDeprecationNotice', () => {
  it('创建带有过期日期的通知', () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const parsed = {
      sunset: futureDate,
    }
    const notice = createDeprecationNotice(parsed)
    expect(notice.effectiveAt).toBe(futureDate)
    expect(notice.severity).toBeDefined()
  })

  it('对已过期的日期设置 BLOCKING 级别', () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    const parsed = {
      sunset: pastDate,
    }
    const notice = createDeprecationNotice(parsed)
    expect(notice.severity).toBe(SEVERITY.BLOCKING)
  })

  it('对即将过期的日期设置 WARNING 级别', () => {
    const nearFuture = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    const parsed = {
      sunset: nearFuture,
    }
    const notice = createDeprecationNotice(parsed)
    expect(notice.severity).toBe(SEVERITY.WARNING)
  })

  it('对遥远未来的日期设置 INFO 级别', () => {
    const farFuture = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    const parsed = {
      sunset: farFuture,
    }
    const notice = createDeprecationNotice(parsed)
    expect(notice.severity).toBe(SEVERITY.INFO)
  })

  it('提取版本号信息', () => {
    const parsed = {
      deprecation: { type: 'version', value: 'v1' },
    }
    const notice = createDeprecationNotice(parsed)
    expect(notice.version).toBe('v1')
  })

  it('从 Link 头提取文档链接', () => {
    const parsed = {
      links: [
        { url: 'https://example.com/sunset', params: { rel: 'sunset' } },
        { url: 'https://example.com/other', params: { rel: 'other' } },
      ],
    }
    const notice = createDeprecationNotice(parsed)
    expect(notice.link).toBe('https://example.com/sunset')
  })

  it('优先使用 sunset 链接而非 deprecation 链接', () => {
    const parsed = {
      links: [
        { url: 'https://example.com/deprecation', params: { rel: 'deprecation' } },
        { url: 'https://example.com/sunset', params: { rel: 'sunset' } },
      ],
    }
    const notice = createDeprecationNotice(parsed)
    expect(notice.link).toBe('https://example.com/sunset')
  })

  it('从 Warning 头提取详情文本', () => {
    const parsed = {
      warnings: [
        { code: 299, text: 'This API is deprecated' },
      ],
    }
    const notice = createDeprecationNotice(parsed)
    expect(notice.detail).toBe('This API is deprecated')
  })

  it('包含 sourceUrl', () => {
    const notice = createDeprecationNotice({}, 'https://api.example.com')
    expect(notice.sourceUrl).toBe('https://api.example.com')
  })

  it('生成唯一的 id', () => {
    const notice1 = createDeprecationNotice({ sunset: new Date() })
    const notice2 = createDeprecationNotice({})
    expect(notice1.id).toBeDefined()
    expect(typeof notice1.id).toBe('string')
    expect(notice1.id).not.toBe(notice2.id)
  })
})

describe('mergeNotices', () => {
  it('合并重复的通知', () => {
    const notices = [
      { id: 'same', severity: SEVERITY.WARNING, sourceUrl: 'https://a.com' },
      { id: 'same', severity: SEVERITY.WARNING, sourceUrl: 'https://b.com' },
    ]
    const merged = mergeNotices(notices)
    expect(merged).toHaveLength(1)
    expect(merged[0].sourceUrls).toContain('https://a.com')
    expect(merged[0].sourceUrls).toContain('https://b.com')
  })

  it('按严重程度排序', () => {
    const notices = [
      { id: 'info', severity: SEVERITY.INFO },
      { id: 'blocking', severity: SEVERITY.BLOCKING },
      { id: 'warning', severity: SEVERITY.WARNING },
    ]
    const merged = mergeNotices(notices)
    expect(merged[0].severity).toBe(SEVERITY.BLOCKING)
    expect(merged[1].severity).toBe(SEVERITY.WARNING)
    expect(merged[2].severity).toBe(SEVERITY.INFO)
  })
})

describe('extractNoticesFromInput', () => {
  it('从头对象提取通知', () => {
    const headers = {
      'Deprecation': 'Sun, 01 Jan 2026 00:00:00 GMT',
      'Sunset': 'Mon, 01 Feb 2026 00:00:00 GMT',
    }
    const notices = extractNoticesFromInput(headers)
    expect(notices).toHaveLength(1)
    expect(notices[0].effectiveAt).toBeDefined()
  })

  it('从文本输入提取通知', () => {
    const text = `Deprecation: Sun, 01 Jan 2026 00:00:00 GMT
Warning: 299 - "Deprecated"`
    const notices = extractNoticesFromInput(text)
    expect(notices).toHaveLength(1)
  })

  it('没有相关头时返回空数组', () => {
    const headers = {
      'Content-Type': 'application/json',
    }
    const notices = extractNoticesFromInput(headers)
    expect(notices).toEqual([])
  })

  it('包含 sourceUrl', () => {
    const headers = {
      'Deprecation': 'Sun, 01 Jan 2026 00:00:00 GMT',
    }
    const notices = extractNoticesFromInput(headers, 'https://api.example.com')
    expect(notices[0].sourceUrl).toBe('https://api.example.com')
  })
})

describe('formatDateForDisplay', () => {
  it('格式化日期为显示字符串', () => {
    const date = new Date('2026-01-01T00:00:00Z')
    const result = formatDateForDisplay(date)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('对 null 返回空字符串', () => {
    expect(formatDateForDisplay(null)).toBe('')
  })
})

describe('formatRelativeTime', () => {
  it('格式化未来日期', () => {
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    const result = formatRelativeTime(future)
    expect(result).toContain('天后')
  })

  it('格式化过去日期', () => {
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    const result = formatRelativeTime(past)
    expect(result).toContain('天前')
  })

  it('对 null 返回空字符串', () => {
    expect(formatRelativeTime(null)).toBe('')
  })
})

describe('getHumanReadableMessage', () => {
  it('为 BLOCKING 级别生成消息', () => {
    const notice = {
      severity: SEVERITY.BLOCKING,
      effectiveAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    }
    const message = getHumanReadableMessage(notice)
    expect(typeof message).toBe('string')
    expect(message.length).toBeGreaterThan(0)
  })

  it('为 WARNING 级别生成消息', () => {
    const notice = {
      severity: SEVERITY.WARNING,
      effectiveAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    }
    const message = getHumanReadableMessage(notice)
    expect(typeof message).toBe('string')
    expect(message.length).toBeGreaterThan(0)
  })

  it('包含版本号', () => {
    const notice = {
      severity: SEVERITY.WARNING,
      version: 'v1',
    }
    const message = getHumanReadableMessage(notice)
    expect(message).toContain('v1')
  })

  it('使用 detail 文本（如果有）', () => {
    const notice = {
      severity: SEVERITY.WARNING,
      detail: 'Custom deprecation message',
    }
    const message = getHumanReadableMessage(notice)
    expect(message).toBe('Custom deprecation message')
  })
})

describe('getMachineReadableSummary', () => {
  it('生成机器可读的摘要', () => {
    const date = new Date('2026-01-01T00:00:00Z')
    const notice = {
      id: 'test-id',
      effectiveAt: date,
      version: 'v1',
      link: 'https://example.com/docs',
      severity: SEVERITY.WARNING,
      otherField: 'should not be included',
    }
    const summary = getMachineReadableSummary(notice)
    expect(summary).toEqual({
      id: 'test-id',
      effectiveAt: date.toISOString(),
      version: 'v1',
      link: 'https://example.com/docs',
      severity: SEVERITY.WARNING,
    })
  })

  it('处理 null 的 effectiveAt', () => {
    const notice = {
      id: 'test-id',
      effectiveAt: null,
      version: null,
      link: null,
      severity: SEVERITY.INFO,
    }
    const summary = getMachineReadableSummary(notice)
    expect(summary.effectiveAt).toBeNull()
  })
})

describe('generateNoticeId with non-Latin1 characters', () => {
  it('正确处理包含中文字符的 detail', () => {
    const parsed = {
      deprecation: { type: 'version', value: 'v1' },
      warnings: [{ code: 299, text: '此 API 即将废弃，请尽快迁移' }],
    }
    expect(() => createDeprecationNotice(parsed)).not.toThrow()
    const notice = createDeprecationNotice(parsed)
    expect(notice.id).toBeDefined()
    expect(typeof notice.id).toBe('string')
  })

  it('相同的输入生成相同的 ID', () => {
    const parsed = {
      sunset: new Date('2026-01-01T00:00:00Z'),
      warnings: [{ code: 299, text: '此 API 即将废弃' }],
    }
    const notice1 = createDeprecationNotice(parsed)
    const notice2 = createDeprecationNotice(parsed)
    expect(notice1.id).toBe(notice2.id)
  })
})
