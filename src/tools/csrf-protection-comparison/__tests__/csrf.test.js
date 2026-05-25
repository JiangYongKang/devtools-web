import { describe, test, expect } from 'vitest'
import {
  CSRF_STRATEGIES,
  REQUEST_TYPES,
  SAME_SITE_VALUES,
  HTTP_METHODS,
  compareTokens,
  validateDoubleSubmitCookie,
  validateSynchronizerToken,
  shouldSendSameSiteCookie,
  validateSameSiteCookie,
  extractOrigin,
  isOriginAllowed,
  validateOrigin,
  evaluateStrategy,
  generateChecklist,
  checklistToMarkdown,
} from '../logic/csrf.js'

describe('Token 比对逻辑', () => {
  describe('compareTokens', () => {
    test('相同 token 应返回 true', () => {
      expect(compareTokens('abc123', 'abc123')).toBe(true)
      expect(compareTokens('xyz789', 'xyz789')).toBe(true)
    })

    test('不同 token 应返回 false', () => {
      expect(compareTokens('abc123', 'abc124')).toBe(false)
      expect(compareTokens('abc123', 'ABC123')).toBe(false)
    })

    test('长度不同应返回 false', () => {
      expect(compareTokens('abc123', 'abc12')).toBe(false)
      expect(compareTokens('a', 'aa')).toBe(false)
    })

    test('空值或 null 应返回 false', () => {
      expect(compareTokens(null, 'abc123')).toBe(false)
      expect(compareTokens('abc123', null)).toBe(false)
      expect(compareTokens('', 'abc123')).toBe(false)
      expect(compareTokens('abc123', '')).toBe(false)
      expect(compareTokens(undefined, 'abc123')).toBe(false)
    })

    test('长 token 比对应正确', () => {
      const longToken = 'a'.repeat(100)
      expect(compareTokens(longToken, longToken)).toBe(true)
      expect(compareTokens(longToken, longToken.slice(0, -1) + 'b')).toBe(false)
    })
  })
})

describe('Double Submit Cookie 验证', () => {
  test('Cookie 和请求中 Token 匹配应通过验证', () => {
    const result = validateDoubleSubmitCookie('token123', 'token123')
    expect(result.valid).toBe(true)
    expect(result.reason).toBe('Token 匹配成功')
  })

  test('Token 不匹配应验证失败', () => {
    const result = validateDoubleSubmitCookie('token123', 'token456')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('Token 不匹配')
  })

  test('缺少 Cookie Token 应验证失败', () => {
    const result = validateDoubleSubmitCookie('', 'token123')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('Cookie 中缺少 CSRF Token')
  })

  test('缺少请求 Token 应验证失败', () => {
    const result = validateDoubleSubmitCookie('token123', '')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('请求中缺少 CSRF Token')
  })

  test('要求自定义请求头但未提供应验证失败', () => {
    const result = validateDoubleSubmitCookie('token123', 'token123', {
      requireCustomHeader: true,
      customHeaderPresent: false,
    })
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('缺少自定义请求头')
  })

  test('要求自定义请求头且已提供应通过验证', () => {
    const result = validateDoubleSubmitCookie('token123', 'token123', {
      requireCustomHeader: true,
      customHeaderPresent: true,
    })
    expect(result.valid).toBe(true)
  })
})

describe('Synchronizer Token 验证', () => {
  test('会话和请求中 Token 匹配应通过验证', () => {
    const result = validateSynchronizerToken('session_token', 'session_token')
    expect(result.valid).toBe(true)
    expect(result.reason).toBe('Token 匹配成功')
  })

  test('Token 不匹配应验证失败', () => {
    const result = validateSynchronizerToken('session_token', 'wrong_token')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('Token 不匹配')
  })

  test('缺少会话 Token 应验证失败', () => {
    const result = validateSynchronizerToken('', 'request_token')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('会话中缺少 CSRF Token')
  })

  test('缺少请求 Token 应验证失败', () => {
    const result = validateSynchronizerToken('session_token', '')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('请求中缺少 CSRF Token')
  })

  test('要求自定义请求头但未提供应验证失败', () => {
    const result = validateSynchronizerToken('token123', 'token123', {
      requireCustomHeader: true,
      customHeaderPresent: false,
    })
    expect(result.valid).toBe(false)
  })
})

describe('SameSite Cookie 发送规则（表驱动）', () => {
  const sameSiteTestCases = [
    {
      name: 'Strict - 同源请求应发送 Cookie',
      sameSite: SAME_SITE_VALUES.STRICT,
      requestType: REQUEST_TYPES.LEGITIMATE,
      isTopLevelNavigation: false,
      method: HTTP_METHODS.POST,
      expected: true,
    },
    {
      name: 'Strict - 跨站请求不应发送 Cookie',
      sameSite: SAME_SITE_VALUES.STRICT,
      requestType: REQUEST_TYPES.CSRF,
      isTopLevelNavigation: false,
      method: HTTP_METHODS.POST,
      expected: false,
    },
    {
      name: 'Strict - 跨站顶级导航 GET 不应发送 Cookie',
      sameSite: SAME_SITE_VALUES.STRICT,
      requestType: REQUEST_TYPES.CSRF,
      isTopLevelNavigation: true,
      method: HTTP_METHODS.GET,
      expected: false,
    },
    {
      name: 'Lax - 同源请求应发送 Cookie',
      sameSite: SAME_SITE_VALUES.LAX,
      requestType: REQUEST_TYPES.LEGITIMATE,
      isTopLevelNavigation: false,
      method: HTTP_METHODS.POST,
      expected: true,
    },
    {
      name: 'Lax - 跨站 POST 不应发送 Cookie',
      sameSite: SAME_SITE_VALUES.LAX,
      requestType: REQUEST_TYPES.CSRF,
      isTopLevelNavigation: false,
      method: HTTP_METHODS.POST,
      expected: false,
    },
    {
      name: 'Lax - 跨站顶级导航 GET 应发送 Cookie',
      sameSite: SAME_SITE_VALUES.LAX,
      requestType: REQUEST_TYPES.CSRF,
      isTopLevelNavigation: true,
      method: HTTP_METHODS.GET,
      expected: true,
    },
    {
      name: 'Lax - 跨站顶级导航 POST 不应发送 Cookie',
      sameSite: SAME_SITE_VALUES.LAX,
      requestType: REQUEST_TYPES.CSRF,
      isTopLevelNavigation: true,
      method: HTTP_METHODS.POST,
      expected: false,
    },
    {
      name: 'None - 跨站 POST 应发送 Cookie',
      sameSite: SAME_SITE_VALUES.NONE,
      requestType: REQUEST_TYPES.CSRF,
      isTopLevelNavigation: false,
      method: HTTP_METHODS.POST,
      expected: true,
    },
    {
      name: 'None - 同源请求应发送 Cookie',
      sameSite: SAME_SITE_VALUES.NONE,
      requestType: REQUEST_TYPES.LEGITIMATE,
      isTopLevelNavigation: false,
      method: HTTP_METHODS.POST,
      expected: true,
    },
    {
      name: '未设置 SameSite - 默认行为应发送 Cookie',
      sameSite: undefined,
      requestType: REQUEST_TYPES.CSRF,
      isTopLevelNavigation: false,
      method: HTTP_METHODS.POST,
      expected: true,
    },
  ]

  test.each(sameSiteTestCases)('$name', ({ sameSite, requestType, isTopLevelNavigation, method, expected }) => {
    const result = shouldSendSameSiteCookie(sameSite, requestType, isTopLevelNavigation, method)
    expect(result).toBe(expected)
  })
})

describe('SameSite Cookie 验证', () => {
  test('Strict 跨站请求未发送 Cookie 应防护成功', () => {
    const result = validateSameSiteCookie(
      SAME_SITE_VALUES.STRICT,
      REQUEST_TYPES.CSRF,
      false
    )
    expect(result.valid).toBe(true)
    expect(result.protected).toBe(true)
    expect(result.reason).toContain('阻止了跨站 Cookie')
  })

  test('Strict 同源请求发送 Cookie 应正常', () => {
    const result = validateSameSiteCookie(
      SAME_SITE_VALUES.STRICT,
      REQUEST_TYPES.LEGITIMATE,
      true
    )
    expect(result.valid).toBe(true)
    expect(result.protected).toBeUndefined()
  })

  test('应该发送 Cookie 但未发送应验证失败', () => {
    const result = validateSameSiteCookie(
      SAME_SITE_VALUES.STRICT,
      REQUEST_TYPES.LEGITIMATE,
      false
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Cookie 未发送')
  })

  test('不应该发送 Cookie 但发送了应验证失败', () => {
    const result = validateSameSiteCookie(
      SAME_SITE_VALUES.STRICT,
      REQUEST_TYPES.CSRF,
      true
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('规则异常')
  })
})

describe('Origin 提取与白名单匹配', () => {
  describe('extractOrigin', () => {
    test('应正确提取 HTTP URL 的 Origin', () => {
      expect(extractOrigin('http://example.com/path')).toBe('http://example.com')
      expect(extractOrigin('http://example.com:8080/path')).toBe('http://example.com:8080')
    })

    test('应正确提取 HTTPS URL 的 Origin', () => {
      expect(extractOrigin('https://example.com/path')).toBe('https://example.com')
      expect(extractOrigin('https://api.example.com:8443/path')).toBe('https://api.example.com:8443')
    })

    test('null 或空字符串应返回 null', () => {
      expect(extractOrigin(null)).toBe(null)
      expect(extractOrigin('')).toBe(null)
      expect(extractOrigin(undefined)).toBe(null)
    })

    test('无效 URL 应返回 null', () => {
      expect(extractOrigin('not-a-url')).toBe(null)
    })
  })

  describe('isOriginAllowed', () => {
    const allowedOrigins = [
      'https://example.com',
      'https://api.example.com',
      /^https:\/\/.*\.trusted\.com$/,
    ]

    test('白名单中的 Origin 应返回 true', () => {
      expect(isOriginAllowed('https://example.com', allowedOrigins)).toBe(true)
      expect(isOriginAllowed('https://api.example.com', allowedOrigins)).toBe(true)
    })

    test('不在白名单中的 Origin 应返回 false', () => {
      expect(isOriginAllowed('https://evil.com', allowedOrigins)).toBe(false)
      expect(isOriginAllowed('http://example.com', allowedOrigins)).toBe(false)
    })

    test('正则匹配的 Origin 应返回 true', () => {
      expect(isOriginAllowed('https://app.trusted.com', allowedOrigins)).toBe(true)
      expect(isOriginAllowed('https://api.trusted.com', allowedOrigins)).toBe(true)
    })

    test('null Origin 应返回 false', () => {
      expect(isOriginAllowed(null, allowedOrigins)).toBe(false)
    })
  })

  describe('validateOrigin', () => {
    const allowedOrigins = ['https://example.com', 'https://api.example.com']

    test('Origin 在白名单中应验证通过', () => {
      const result = validateOrigin('https://example.com', null, allowedOrigins)
      expect(result.valid).toBe(true)
      expect(result.origin).toBe('https://example.com')
    })

    test('Origin 不在白名单中应验证失败', () => {
      const result = validateOrigin('https://evil.com', null, allowedOrigins)
      expect(result.valid).toBe(false)
    })

    test('缺失 Origin 但 Referer 在白名单中应验证通过', () => {
      const result = validateOrigin(null, 'https://example.com/path', allowedOrigins)
      expect(result.valid).toBe(true)
      expect(result.origin).toBe('https://example.com')
    })

    test('缺失 Origin 和 Referer 默认应验证失败', () => {
      const result = validateOrigin(null, null, allowedOrigins)
      expect(result.valid).toBe(false)
    })

    test('缺失 Origin 和 Referer 但配置允许降级应验证通过', () => {
      const result = validateOrigin(null, null, allowedOrigins, {
        allowMissingReferer: true,
      })
      expect(result.valid).toBe(true)
      expect(result.warning).toBe(true)
    })
  })
})

describe('策略评估', () => {
  test('Double Submit Cookie 策略评估', () => {
    const result = evaluateStrategy(CSRF_STRATEGIES.DOUBLE_SUBMIT_COOKIE, {
      requestType: REQUEST_TYPES.LEGITIMATE,
      cookieToken: 'token123',
      requestToken: 'token123',
    })
    expect(result.valid).toBe(true)
  })

  test('Synchronizer Token 策略评估', () => {
    const result = evaluateStrategy(CSRF_STRATEGIES.SYNCHRONIZER_TOKEN, {
      requestType: REQUEST_TYPES.LEGITIMATE,
      sessionToken: 'token123',
      requestToken: 'token123',
    })
    expect(result.valid).toBe(true)
  })

  test('SameSite Cookie 策略评估', () => {
    const result = evaluateStrategy(CSRF_STRATEGIES.SAMESITE_COOKIE, {
      requestType: REQUEST_TYPES.CSRF,
      sameSite: SAME_SITE_VALUES.STRICT,
      cookieSent: false,
    })
    expect(result.valid).toBe(true)
    expect(result.protected).toBe(true)
  })
})

describe('Checklist 生成', () => {
  test('应生成完整的 checklist', () => {
    const config = {
      useDoubleSubmit: true,
      sameSite: SAME_SITE_VALUES.LAX,
      secure: true,
      httpOnly: true,
      requireCustomHeader: true,
      checkOrigin: true,
      corsCorrect: true,
    }

    const checklist = generateChecklist(config)
    expect(checklist).toHaveLength(7)
    expect(checklist.every(item => item.checked)).toBe(true)
  })

  test('未启用防护时 checklist 应显示未通过', () => {
    const config = {
      useDoubleSubmit: false,
      useSynchronizerToken: false,
      sameSite: SAME_SITE_VALUES.NONE,
      secure: false,
      httpOnly: false,
      requireCustomHeader: false,
      checkOrigin: false,
      corsCorrect: false,
    }

    const checklist = generateChecklist(config)
    expect(checklist.every(item => !item.checked)).toBe(true)
  })

  test('checklist 应包含正确的严重程度', () => {
    const checklist = generateChecklist({})
    const highSeverity = checklist.filter(item => item.severity === 'high')
    const mediumSeverity = checklist.filter(item => item.severity === 'medium')

    expect(highSeverity.length).toBeGreaterThan(0)
    expect(mediumSeverity.length).toBeGreaterThan(0)
  })
})

describe('Markdown 导出', () => {
  test('应生成有效的 Markdown', () => {
    const config = {
      useDoubleSubmit: true,
      sameSite: SAME_SITE_VALUES.LAX,
      secure: true,
      httpOnly: true,
      requireCustomHeader: true,
      checkOrigin: true,
      corsCorrect: true,
    }

    const checklist = generateChecklist(config)
    const markdown = checklistToMarkdown(checklist, config)

    expect(markdown).toContain('# CSRF 防护配置 Checklist')
    expect(markdown).toContain('## 当前配置')
    expect(markdown).toContain('## 检查项')
    expect(markdown).toContain('## 评分')
    expect(markdown).toContain('Double Submit Cookie')
  })

  test('低分配置应显示警告', () => {
    const config = {
      useDoubleSubmit: false,
      useSynchronizerToken: false,
      sameSite: SAME_SITE_VALUES.NONE,
      secure: false,
      httpOnly: false,
      requireCustomHeader: false,
      checkOrigin: false,
      corsCorrect: false,
    }

    const checklist = generateChecklist(config)
    const markdown = checklistToMarkdown(checklist, config)

    expect(markdown).toContain('建议立即改进')
  })

  test('高分配置应显示良好', () => {
    const config = {
      useDoubleSubmit: true,
      sameSite: SAME_SITE_VALUES.STRICT,
      secure: true,
      httpOnly: true,
      requireCustomHeader: true,
      checkOrigin: true,
      corsCorrect: true,
    }

    const checklist = generateChecklist(config)
    const markdown = checklistToMarkdown(checklist, config)

    expect(markdown).toContain('配置良好')
  })
})
