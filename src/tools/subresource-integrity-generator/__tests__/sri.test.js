import { describe, test, expect, beforeAll } from 'vitest'
import {
  SUPPORTED_ALGORITHMS,
  computeHash,
  computeIntegrity,
  computeAllAlgorithms,
  buildIntegrityAttribute,
  getCrossoriginRecommendation,
  parseIntegrityString,
  verifyIntegrity,
  buildManifestEntry,
  generateManifestJSON,
  formatBytes,
  formatDuration,
} from '../logic/sri.js'

const W3C_TEST_CASES = [
  {
    content: 'alert("Hello, world.");',
    sha256: '95/2P1j1ZySEaTPvS2vdbldPcGJYZRvEeWm0x0qZqcQ=',
    sha384: 'rwE6Iuo1Y5spnMVUH6Cdjh+wWToU3cZPwiI1th7Wm1MINXGD4PlaByYDRdaBLn0e',
  },
  {
    content: '',
    sha256: '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
    sha384: 'OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb',
  },
  {
    content: 'test',
    sha256: 'n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg=',
  },
]

beforeAll(() => {
  if (typeof crypto === 'undefined') {
    global.crypto = require('crypto').webcrypto
  }
  if (typeof btoa === 'undefined') {
    global.btoa = (str) => Buffer.from(str, 'binary').toString('base64')
  }
  if (typeof atob === 'undefined') {
    global.atob = (str) => Buffer.from(str, 'base64').toString('binary')
  }
  if (typeof TextEncoder === 'undefined') {
    global.TextEncoder = require('util').TextEncoder
  }
  if (typeof performance === 'undefined') {
    global.performance = { now: () => Date.now() }
  }
})

describe('SUPPORTED_ALGORITHMS', () => {
  test('应该包含所有支持的算法', () => {
    expect(SUPPORTED_ALGORITHMS).toContain('sha256')
    expect(SUPPORTED_ALGORITHMS).toContain('sha384')
    expect(SUPPORTED_ALGORITHMS).toContain('sha512')
  })
})

describe('computeHash', () => {
  test('应该计算正确的 SHA-256 哈希值', async () => {
    const hash = await computeHash(W3C_TEST_CASES[0].content, 'sha256')
    expect(hash).toBe(W3C_TEST_CASES[0].sha256)
  })

  test('应该计算正确的 SHA-384 哈希值', async () => {
    const hash = await computeHash(W3C_TEST_CASES[0].content, 'sha384')
    expect(hash).toBe(W3C_TEST_CASES[0].sha384)
  })

  test('应该计算空字符串的哈希值', async () => {
    const hash = await computeHash('', 'sha256')
    expect(hash).toBe(W3C_TEST_CASES[1].sha256)
  })

  test('不支持的算法应该抛出错误', async () => {
    await expect(computeHash('test', 'md5')).rejects.toThrow('不支持的算法')
  })
})

describe('computeIntegrity', () => {
  test('应该返回正确的 integrity 字符串格式', async () => {
    const integrity = await computeIntegrity(W3C_TEST_CASES[0].content, 'sha256')
    expect(integrity).toBe(`sha256-${W3C_TEST_CASES[0].sha256}`)
  })

  test('应该包含算法前缀', async () => {
    const integrity = await computeIntegrity('test', 'sha512')
    expect(integrity).toMatch(/^sha512-/)
  })
})

describe('computeAllAlgorithms', () => {
  test('应该返回所有三种算法的结果', async () => {
    const results = await computeAllAlgorithms(W3C_TEST_CASES[0].content)

    expect(results.sha256).toBeDefined()
    expect(results.sha384).toBeDefined()
    expect(results.sha512).toBeDefined()

    expect(results.sha256.integrity).toBe(`sha256-${W3C_TEST_CASES[0].sha256}`)
    expect(results.sha256.duration).toBeGreaterThanOrEqual(0)
  })
})

describe('buildIntegrityAttribute', () => {
  test('应该构建正确的 HTML 属性', () => {
    const result = buildIntegrityAttribute('sha256-abc123')
    expect(result).toBe('integrity="sha256-abc123"')
  })
})

describe('getCrossoriginRecommendation', () => {
  test('应该返回推荐的 crossorigin 值', () => {
    const result = getCrossoriginRecommendation('sha256-abc123')
    expect(result.recommended).toBe('anonymous')
    expect(typeof result.reason).toBe('string')
  })

  test('空输入也应该返回推荐值', () => {
    const result = getCrossoriginRecommendation('')
    expect(result.recommended).toBe('anonymous')
  })
})

describe('parseIntegrityString', () => {
  test('应该正确解析独立的 integrity 字符串', () => {
    const result = parseIntegrityString('sha256-qznLcsROx4GACP2dm0UCKCzCG+HiZ1guq6ZZDob/Tng=')
    expect(result.valid).toBe(true)
    expect(result.algorithm).toBe('sha256')
    expect(result.hash).toBe('qznLcsROx4GACP2dm0UCKCzCG+HiZ1guq6ZZDob/Tng=')
    expect(result.fullIntegrity).toBe('sha256-qznLcsROx4GACP2dm0UCKCzCG+HiZ1guq6ZZDob/Tng=')
  })

  test('应该正确解析 HTML 属性格式', () => {
    const result = parseIntegrityString('integrity="sha256-abc123"')
    expect(result.valid).toBe(true)
    expect(result.algorithm).toBe('sha256')
    expect(result.hash).toBe('abc123')
  })

  test('应该正确解析带单引号的 HTML 属性', () => {
    const result = parseIntegrityString("integrity='sha384-xyz789'")
    expect(result.valid).toBe(true)
    expect(result.algorithm).toBe('sha384')
    expect(result.hash).toBe('xyz789')
  })

  test('无效格式应该返回错误', () => {
    const result = parseIntegrityString('invalid-string')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  test('空输入应该返回错误', () => {
    const result = parseIntegrityString('')
    expect(result.valid).toBe(false)
  })

  test('不支持的算法应该返回错误', () => {
    const result = parseIntegrityString('md5-abc123')
    expect(result.valid).toBe(false)
  })
})

describe('verifyIntegrity', () => {
  test('匹配的 integrity 应该返回 true', async () => {
    const content = W3C_TEST_CASES[0].content
    const integrity = `sha256-${W3C_TEST_CASES[0].sha256}`
    const result = await verifyIntegrity(content, integrity)

    expect(result.match).toBe(true)
    expect(result.expected).toBe(integrity)
    expect(result.actual).toBe(integrity)
  })

  test('不匹配的 integrity 应该返回 false', async () => {
    const result = await verifyIntegrity('different content', 'sha256-abc123')

    expect(result.match).toBe(false)
    expect(result.expected).toBe('sha256-abc123')
    expect(result.actual).not.toBe('sha256-abc123')
  })

  test('无效的 integrity 字符串应该返回错误', async () => {
    const result = await verifyIntegrity('test', 'invalid')

    expect(result.match).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('buildManifestEntry', () => {
  test('应该构建正确的 manifest 条目', () => {
    const entry = buildManifestEntry('/js/app.js', 'sha256', 'sha256-abc123')
    expect(entry).toEqual({
      path: '/js/app.js',
      algorithm: 'sha256',
      integrity: 'sha256-abc123',
    })
  })
})

describe('generateManifestJSON', () => {
  test('应该生成有效的 JSON 格式', () => {
    const entries = [
      { path: '/js/app.js', algorithm: 'sha256', integrity: 'sha256-abc123' },
      { path: '/css/style.css', algorithm: 'sha384', integrity: 'sha384-xyz789' },
    ]

    const json = generateManifestJSON(entries)
    const parsed = JSON.parse(json)

    expect(parsed.version).toBe('1.0')
    expect(parsed.generatedAt).toBeDefined()
    expect(parsed.resources.length).toBe(2)
    expect(parsed.resources[0].path).toBe('/js/app.js')
  })
})

describe('formatBytes', () => {
  test('应该格式化字节数为可读格式', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1023)).toMatch(/B$/)
    expect(formatBytes(1024)).toMatch(/KB$/)
    expect(formatBytes(1024 * 1024)).toMatch(/MB$/)
  })
})

describe('formatDuration', () => {
  test('应该格式化毫秒为可读格式', () => {
    expect(formatDuration(0.5)).toContain('μs')
    expect(formatDuration(500)).toContain('ms')
    expect(formatDuration(1500)).toContain('s')
  })
})
