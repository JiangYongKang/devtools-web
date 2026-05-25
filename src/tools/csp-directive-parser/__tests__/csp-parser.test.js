import { describe, expect, test } from 'vitest'
import {
    checkSecurityIssues,
    detectConflicts,
} from '../logic/conflict-detector.js'
import {
    comparePolicies,
    extractReportingEndpoints,
    getEffectiveDirectiveForType,
    parseDirectives,
    tokenizePolicy,
} from '../logic/directive-parser.js'
import {
    generateSampleViolationReport,
    getReportingApiVsLegacyComparison,
    prettyPrintJson,
} from '../logic/report-generator.js'
import {
    isHashSource,
    isNonceSource,
    isSchemeSource,
    isSpecialSource,
    matchesHostPattern,
    matchesPathPattern,
    matchesWildcardHost,
    parseHash,
    parseNonce,
    parseSource,
    validateSourceSyntax
} from '../logic/source-matcher.js'

describe('指令分词 (tokenizePolicy)', () => {
  test('应正确解析简单策略字符串', () => {
    const policy = "default-src 'self'; script-src 'unsafe-inline'"
    const tokens = tokenizePolicy(policy)
    expect(tokens.length).toBe(2)
    expect(tokens[0].directive).toBe('default-src')
    expect(tokens[0].sources).toEqual(["'self'"])
    expect(tokens[1].directive).toBe('script-src')
    expect(tokens[1].sources).toEqual(["'unsafe-inline'"])
  })

  test('应处理 HTTP 头格式', () => {
    const policy = "Content-Security-Policy: default-src 'self'"
    const tokens = tokenizePolicy(policy)
    expect(tokens.length).toBe(1)
    expect(tokens[0].directive).toBe('default-src')
  })

  test('应处理 Report-Only 头格式', () => {
    const policy = "Content-Security-Policy-Report-Only: default-src 'self'"
    const tokens = tokenizePolicy(policy)
    expect(tokens.length).toBe(1)
  })

  test('应处理 meta 标签格式', () => {
    const policy = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'">'
    const tokens = tokenizePolicy(policy)
    expect(tokens.length).toBe(1)
    expect(tokens[0].directive).toBe('default-src')
  })

  test('应处理空字符串', () => {
    expect(tokenizePolicy('')).toEqual([])
    expect(tokenizePolicy(null)).toEqual([])
    expect(tokenizePolicy(undefined)).toEqual([])
  })

  test('应处理多余的空格和分号', () => {
    const policy = "  default-src   'self'  ;  script-src   'unsafe-inline'  ;  "
    const tokens = tokenizePolicy(policy)
    expect(tokens.length).toBe(2)
  })

  test('应转换指令名为小写', () => {
    const policy = "DEFAULT-SRC 'self'; SCRIPT-SRC 'unsafe-inline'"
    const tokens = tokenizePolicy(policy)
    expect(tokens[0].directive).toBe('default-src')
    expect(tokens[1].directive).toBe('script-src')
  })
})

describe('源匹配 - 特殊源 (isSpecialSource)', () => {
  test("应识别 'none'", () => {
    expect(isSpecialSource("'none'")).toBe(true)
  })

  test("应识别 'self'", () => {
    expect(isSpecialSource("'self'")).toBe(true)
  })

  test("应识别 'unsafe-inline'", () => {
    expect(isSpecialSource("'unsafe-inline'")).toBe(true)
  })

  test("应识别 'unsafe-eval'", () => {
    expect(isSpecialSource("'unsafe-eval'")).toBe(true)
  })

  test('不应识别普通字符串', () => {
    expect(isSpecialSource('example.com')).toBe(false)
    expect(isSpecialSource('https:')).toBe(false)
  })
})

describe('源匹配 - 协议源 (isSchemeSource)', () => {
  test('应识别 https:', () => {
    expect(isSchemeSource('https:')).toBe(true)
  })

  test('应识别 http:', () => {
    expect(isSchemeSource('http:')).toBe(true)
  })

  test('应识别 data:', () => {
    expect(isSchemeSource('data:')).toBe(true)
  })

  test('应识别 blob:', () => {
    expect(isSchemeSource('blob:')).toBe(true)
  })

  test('应不区分大小写', () => {
    expect(isSchemeSource('HTTPS:')).toBe(true)
  })

  test('不应识别普通域名', () => {
    expect(isSchemeSource('example.com')).toBe(false)
  })
})

describe('源匹配 - Nonce 源 (isNonceSource)', () => {
  test('应识别有效的 nonce', () => {
    expect(isNonceSource("'nonce-abc123'")).toBe(true)
    expect(isNonceSource("'nonce-ABC+/123='")).toBe(true)
  })

  test('不应识别无效的 nonce 格式', () => {
    expect(isNonceSource("nonce-abc123")).toBe(false)
    expect(isNonceSource("'nonce-'")).toBe(false)
    expect(isNonceSource("'Nonce-abc'")).toBe(false)
  })

  test('应正确解析 nonce 值', () => {
    expect(parseNonce("'nonce-abc123'")).toBe('abc123')
    expect(parseNonce("'nonce-ABC+/123='")).toBe('ABC+/123=')
    expect(parseNonce('invalid')).toBeNull()
  })
})

describe('源匹配 - Hash 源 (isHashSource)', () => {
  test('应识别有效的 sha256 hash', () => {
    expect(isHashSource("'sha256-abc123'")).toBe(true)
  })

  test('应识别有效的 sha384 hash', () => {
    expect(isHashSource("'sha384-abc123'")).toBe(true)
  })

  test('应识别有效的 sha512 hash', () => {
    expect(isHashSource("'sha512-abc123'")).toBe(true)
  })

  test('不应识别无效的 hash 算法', () => {
    expect(isHashSource("'md5-abc123'")).toBe(false)
    expect(isHashSource("'sha1-abc123'")).toBe(false)
  })

  test('应正确解析 hash 值', () => {
    const result = parseHash("'sha256-abc123XYZ='")
    expect(result).toEqual({
      algorithm: 'sha256',
      value: 'abc123XYZ=',
    })
    expect(parseHash('invalid')).toBeNull()
  })
})

describe('源匹配 - 源解析 (parseSource)', () => {
  test('应解析特殊源', () => {
    const result = parseSource("'self'")
    expect(result.type).toBe('special')
    expect(result.value).toBe("'self'")
  })

  test('应解析 nonce 源', () => {
    const result = parseSource("'nonce-abc123'")
    expect(result.type).toBe('nonce')
    expect(result.value).toBe('abc123')
  })

  test('应解析 hash 源', () => {
    const result = parseSource("'sha256-abc123'")
    expect(result.type).toBe('hash')
    expect(result.algorithm).toBe('sha256')
    expect(result.value).toBe('abc123')
  })

  test('应解析协议源', () => {
    const result = parseSource('https:')
    expect(result.type).toBe('scheme')
    expect(result.value).toBe('https:')
  })

  test('应解析主机源', () => {
    const result = parseSource('example.com')
    expect(result.type).toBe('host')
    expect(result.host).toBe('example.com')
    expect(result.scheme).toBeNull()
    expect(result.path).toBeNull()
  })

  test('应解析带协议的主机源', () => {
    const result = parseSource('https://example.com')
    expect(result.type).toBe('host')
    expect(result.scheme).toBe('https:')
    expect(result.host).toBe('example.com')
  })

  test('应解析带路径的主机源', () => {
    const result = parseSource('example.com/path/to/')
    expect(result.type).toBe('host')
    expect(result.host).toBe('example.com')
    expect(result.path).toBe('/path/to/')
  })

  test('应解析通配符子域名', () => {
    const result = parseSource('*.example.com')
    expect(result.type).toBe('host')
    expect(result.host).toBe('*.example.com')
  })
})

describe('源匹配 - 主机匹配 (matchesWildcardHost)', () => {
  test('应匹配完全相同的主机', () => {
    expect(matchesWildcardHost('example.com', 'example.com')).toBe(true)
  })

  test('应匹配通配符任何主机', () => {
    expect(matchesWildcardHost('*', 'anything.com')).toBe(true)
    expect(matchesWildcardHost('*', 'sub.example.com')).toBe(true)
  })

  test('应匹配通配符子域名', () => {
    expect(matchesWildcardHost('*.example.com', 'sub.example.com')).toBe(true)
    expect(matchesWildcardHost('*.example.com', 'a.b.example.com')).toBe(true)
    expect(matchesWildcardHost('*.example.com', 'example.com')).toBe(true)
  })

  test('不应匹配不同的域名', () => {
    expect(matchesWildcardHost('example.com', 'other.com')).toBe(false)
    expect(matchesWildcardHost('*.example.com', 'other.com')).toBe(false)
  })
})

describe('源匹配 - 主机匹配函数 (matchesHostPattern)', () => {
  test('应匹配完全相同的主机', () => {
    expect(matchesHostPattern('example.com', 'example.com')).toBe(true)
  })

  test('应匹配通配符子域名', () => {
    expect(matchesHostPattern('*.example.com', 'sub.example.com')).toBe(true)
    expect(matchesHostPattern('*.example.com', 'example.com')).toBe(true)
  })

  test('应不区分大小写', () => {
    expect(matchesHostPattern('Example.COM', 'EXAMPLE.com')).toBe(true)
  })
})

describe('源匹配 - 路径匹配 (matchesPathPattern)', () => {
  test('应匹配完全相同的路径', () => {
    expect(matchesPathPattern('/path/exact', '/path/exact')).toBe(true)
    expect(matchesPathPattern('/path/exact', '/other/path')).toBe(false)
  })

  test('应匹配目录前缀', () => {
    expect(matchesPathPattern('/path/', '/path/page.html')).toBe(true)
    expect(matchesPathPattern('/path/', '/path/sub/page.html')).toBe(true)
    expect(matchesPathPattern('/path/', '/path')).toBe(true)
  })

  test('应匹配通配符前缀', () => {
    expect(matchesPathPattern('/path/*', '/path/page.html')).toBe(true)
    expect(matchesPathPattern('/path/*', '/path/sub/page.html')).toBe(true)
    expect(matchesPathPattern('/path/*', '/path')).toBe(true)
  })

  test('不应匹配不同的路径', () => {
    expect(matchesPathPattern('/path/', '/other/path')).toBe(false)
    expect(matchesPathPattern('/path/*', '/other/path')).toBe(false)
  })
})

describe('源匹配 - 语法验证 (validateSourceSyntax)', () => {
  test('应通过特殊源验证', () => {
    const result = validateSourceSyntax("'self'")
    expect(result.valid).toBe(true)
    expect(result.errors.length).toBe(0)
  })

  test('应通过 nonce 验证', () => {
    const result = validateSourceSyntax("'nonce-abc123xyz789'")
    expect(result.valid).toBe(true)
  })

  test('应对短 nonce 发出警告', () => {
    const result = validateSourceSyntax("'nonce-short'")
    expect(result.valid).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  test('应通过 hash 验证', () => {
    const result = validateSourceSyntax("'sha256-abc123'")
    expect(result.valid).toBe(true)
  })

  test('应拒绝无效的通配符位置', () => {
    const result = validateSourceSyntax('*example.com')
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  test('应警告未知的特殊源', () => {
    const result = validateSourceSyntax("'unknown-source'")
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('指令解析 (parseDirectives)', () => {
  test('应解析指令并返回结构化数据', () => {
    const policy = "default-src 'self'; script-src 'unsafe-inline' example.com"
    const result = parseDirectives(policy)
    expect(result.directiveCount).toBe(2)
    expect(result.directives['default-src']).toBeDefined()
    expect(result.directives['script-src']).toBeDefined()
    expect(result.directives['script-src'].sources.length).toBe(2)
  })

  test('应合并重复的指令', () => {
    const policy = "script-src 'self'; script-src example.com"
    const result = parseDirectives(policy)
    expect(result.directives['script-src'].sources.length).toBe(2)
    expect(result.directives['script-src'].count).toBe(2)
    expect(result.warnings.some(w => w.type === 'duplicate-directive')).toBe(true)
  })

  test('应警告未知的指令', () => {
    const policy = 'unknown-directive example.com'
    const result = parseDirectives(policy)
    expect(result.warnings.some(w => w.type === 'unknown-directive')).toBe(true)
  })
})

describe('生效指令获取 (getEffectiveDirectiveForType)', () => {
  test('应返回最具体的指令', () => {
    const policy = "default-src 'none'; script-src 'self'"
    const parsed = parseDirectives(policy)
    const effective = getEffectiveDirectiveForType(parsed, 'script')
    expect(effective.directive).toBe('script-src')
    expect(effective.fromFallback).toBe(false)
  })

  test('应回退到 default-src', () => {
    const policy = "default-src 'self'"
    const parsed = parseDirectives(policy)
    const effective = getEffectiveDirectiveForType(parsed, 'script')
    expect(effective.directive).toBe('default-src')
    expect(effective.fromFallback).toBe(true)
  })

  test('无任何指令时应隐式返回 none', () => {
    const policy = ''
    const parsed = parseDirectives(policy)
    const effective = getEffectiveDirectiveForType(parsed, 'script')
    expect(effective.directive).toBe('default-src')
    expect(effective.sources).toEqual(["'none'"])
    expect(effective.implicit).toBe(true)
  })
})

describe('冲突检测 (detectConflicts)', () => {
  test('应检测 script-src 与 default-src 覆盖关系', () => {
    const policy = "default-src 'self'; script-src 'unsafe-inline'"
    const parsed = parseDirectives(policy)
    const conflicts = detectConflicts(parsed)
    expect(conflicts.conflicts.some(c =>
      c.directives.includes('script-src') && c.directives.includes('default-src')
    )).toBe(true)
  })

  test('应检测 upgrade-insecure-requests 与 block-all-mixed-content', () => {
    const policy = 'upgrade-insecure-requests; block-all-mixed-content'
    const parsed = parseDirectives(policy)
    const conflicts = detectConflicts(parsed)
    expect(conflicts.conflicts.some(c =>
      c.directives.includes('upgrade-insecure-requests') && c.directives.includes('block-all-mixed-content')
    )).toBe(true)
  })

  test('应检测 \'none\' 与其他源的冲突', () => {
    const policy = "script-src 'none' example.com"
    const parsed = parseDirectives(policy)
    const conflicts = detectConflicts(parsed)
    expect(conflicts.conflicts.some(c =>
      c.directives.includes('script-src')
    )).toBe(true)
  })

  test('应检测 \'unsafe-inline\' 与 hash/nonce 共存', () => {
    const policy = "script-src 'unsafe-inline' 'sha256-abc123'"
    const parsed = parseDirectives(policy)
    const conflicts = detectConflicts(parsed)
    expect(conflicts.count).toBeGreaterThan(0)
  })
})

describe('安全检查 (checkSecurityIssues)', () => {
  test('应警告缺少 script 控制', () => {
    const policy = "img-src 'self'"
    const parsed = parseDirectives(policy)
    const issues = checkSecurityIssues(parsed)
    expect(issues.issues.some(i => i.type === 'missing-script-control')).toBe(true)
  })

  test('应警告缺少 object-src', () => {
    const policy = "default-src 'self'"
    const parsed = parseDirectives(policy)
    const issues = checkSecurityIssues(parsed)
    expect(issues.issues.some(i => i.type === 'missing-object-control')).toBe(true)
  })

  test('应警告 unsafe-inline 没有 hash/nonce', () => {
    const policy = "script-src 'self' 'unsafe-inline'"
    const parsed = parseDirectives(policy)
    const issues = checkSecurityIssues(parsed)
    expect(issues.issues.some(i => i.type === 'unsafe-inline-script')).toBe(true)
  })

  test('不应警告有 hash/nonce 时的 unsafe-inline', () => {
    const policy = "script-src 'self' 'unsafe-inline' 'sha256-abc123'"
    const parsed = parseDirectives(policy)
    const issues = checkSecurityIssues(parsed)
    expect(issues.issues.some(i => i.type === 'unsafe-inline-script')).toBe(false)
  })

  test('应警告 unsafe-eval', () => {
    const policy = "script-src 'self' 'unsafe-eval'"
    const parsed = parseDirectives(policy)
    const issues = checkSecurityIssues(parsed)
    expect(issues.issues.some(i => i.type === 'unsafe-eval')).toBe(true)
  })
})

describe('策略对比 (comparePolicies)', () => {
  test('应识别共有指令', () => {
    const policyA = "default-src 'self'; script-src 'self'"
    const policyB = "default-src 'none'; img-src 'self'"
    const result = comparePolicies(policyA, policyB)
    expect(result.common).toContain('default-src')
    expect(result.onlyInA).toContain('script-src')
    expect(result.onlyInB).toContain('img-src')
  })
})

describe('报告端点提取 (extractReportingEndpoints)', () => {
  test('应提取 report-uri', () => {
    const policy = 'report-uri /csp-report https://example.com/report'
    const parsed = parseDirectives(policy)
    const endpoints = extractReportingEndpoints(parsed)
    expect(endpoints.reportUri.length).toBe(2)
  })

  test('应提取 report-to', () => {
    const policy = 'report-to csp-endpoint'
    const parsed = parseDirectives(policy)
    const endpoints = extractReportingEndpoints(parsed)
    expect(endpoints.reportTo.length).toBe(1)
  })
})

describe('示例报告生成 (generateSampleViolationReport)', () => {
  test('应生成符合规范的报告结构', () => {
    const report = generateSampleViolationReport()
    expect(report).toHaveProperty('csp-report')
    expect(report['csp-report']).toHaveProperty('document-uri')
    expect(report['csp-report']).toHaveProperty('violated-directive')
    expect(report['csp-report']).toHaveProperty('effective-directive')
    expect(report['csp-report']).toHaveProperty('blocked-uri')
  })

  test('应使用自定义参数', () => {
    const report = generateSampleViolationReport({
      documentUri: 'https://test.com/page',
      blockedUri: 'https://evil.com/script.js',
      violatedDirective: 'script-src',
    })
    expect(report['csp-report']['document-uri']).toBe('https://test.com/page')
    expect(report['csp-report']['blocked-uri']).toBe('https://evil.com/script.js')
    expect(report['csp-report']['violated-directive']).toBe('script-src')
  })
})

describe('Reporting API 对比信息', () => {
  test('应返回对比信息', () => {
    const comparison = getReportingApiVsLegacyComparison()
    expect(comparison).toHaveProperty('reportUri')
    expect(comparison).toHaveProperty('reportTo')
    expect(comparison).toHaveProperty('differences')
    expect(comparison.reportUri.deprecated).toBe(true)
    expect(comparison.reportTo.deprecated).toBe(false)
  })
})

describe('JSON 格式化 (prettyPrintJson)', () => {
  test('应格式化 JSON 输出', () => {
    const obj = { key: 'value', num: 123 }
    const result = prettyPrintJson(obj, 2)
    expect(result).toBe('{\n  "key": "value",\n  "num": 123\n}')
  })
})
