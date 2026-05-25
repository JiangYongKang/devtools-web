import { describe, test, expect, beforeEach, vi } from 'vitest'
import {
  parseJwks,
  getKeySummary,
  findMatchingKey,
  selectBestKey,
  jwkToCryptoKey,
} from '../logic/jwks.js'
import { ERROR_CODES } from '../logic/errors.js'

describe('jwks', () => {
  describe('parseJwks', () => {
    test('null 输入应该返回错误', () => {
      const result = parseJwks(null)
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.NULL_INPUT)
    })

    test('空字符串应该返回错误', () => {
      const result = parseJwks('')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.EMPTY_VALUE)
    })

    test('无效 JSON 应该返回错误', () => {
      const result = parseJwks('{invalid json}')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_JSON)
    })

    test('应该解析完整的 JWKS 对象', () => {
      const jwks = JSON.stringify({
        keys: [
          { kty: 'RSA', kid: 'key-1', alg: 'RS256' },
          { kty: 'EC', kid: 'key-2', alg: 'ES256' },
        ],
      })
      const result = parseJwks(jwks)
      expect(result.success).toBe(true)
      expect(result.keyCount).toBe(2)
      expect(result.keys.length).toBe(2)
      expect(result.keys[0].kid).toBe('key-1')
      expect(result.keys[1].kid).toBe('key-2')
    })

    test('应该解析密钥数组', () => {
      const jwks = JSON.stringify([
        { kty: 'RSA', kid: 'key-1' },
        { kty: 'EC', kid: 'key-2' },
      ])
      const result = parseJwks(jwks)
      expect(result.success).toBe(true)
      expect(result.keyCount).toBe(2)
    })

    test('应该解析单个 JWK 对象', () => {
      const jwk = JSON.stringify({ kty: 'RSA', kid: 'key-1', alg: 'RS256' })
      const result = parseJwks(jwk)
      expect(result.success).toBe(true)
      expect(result.keyCount).toBe(1)
      expect(result.keys[0].kid).toBe('key-1')
    })

    test('无效格式应该返回错误', () => {
      const result = parseJwks('{"foo": "bar"}')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_JWKS_FORMAT)
    })
  })

  describe('getKeySummary', () => {
    test('应该生成 RSA 密钥摘要', () => {
      const jwk = {
        kty: 'RSA',
        kid: 'rsa-key-1',
        alg: 'RS256',
        use: 'sig',
        n: 'very-long-modulus-value-here',
        e: 'AQAB',
      }
      const summary = getKeySummary(jwk)
      expect(summary.kid).toBe('rsa-key-1')
      expect(summary.kty).toBe('RSA')
      expect(summary.alg).toBe('RS256')
      expect(summary.use).toBe('sig')
      expect(summary.n).toBeDefined()
      expect(summary.e).toBe('AQAB')
      expect(summary.fingerprint).toContain('RSA')
    })

    test('应该生成 EC 密钥摘要', () => {
      const jwk = {
        kty: 'EC',
        kid: 'ec-key-1',
        crv: 'P-256',
        x: 'x-coordinate-value',
        y: 'y-coordinate-value',
      }
      const summary = getKeySummary(jwk)
      expect(summary.kty).toBe('EC')
      expect(summary.crv).toBe('P-256')
      expect(summary.x).toBeDefined()
      expect(summary.y).toBeDefined()
      expect(summary.fingerprint).toContain('EC')
    })

    test('应该生成 OKP 密钥摘要', () => {
      const jwk = {
        kty: 'OKP',
        kid: 'okp-key-1',
        crv: 'Ed25519',
        x: 'x-coordinate-value',
      }
      const summary = getKeySummary(jwk)
      expect(summary.kty).toBe('OKP')
      expect(summary.crv).toBe('Ed25519')
      expect(summary.fingerprint).toContain('OKP')
    })

    test('应该处理无 kid 的密钥', () => {
      const jwk = { kty: 'RSA' }
      const summary = getKeySummary(jwk)
      expect(summary.kid).toBe('(无 kid)')
    })

    test('应该处理未知类型密钥', () => {
      const jwk = { kty: 'UNKNOWN' }
      const summary = getKeySummary(jwk)
      expect(summary.fingerprint).toContain('UNKNOWN')
      expect(summary.fingerprint).toContain('未知类型')
    })
  })

  describe('findMatchingKey', () => {
    const keys = [
      { kty: 'RSA', kid: 'key-1', alg: 'RS256' },
      { kty: 'RSA', kid: 'key-2', alg: 'RS256' },
      { kty: 'EC', kid: 'key-3', alg: 'ES256' },
      { kty: 'RSA', kid: 'key-4' },
    ]

    test('应该找到 kid 和 alg 都匹配的密钥', () => {
      const result = findMatchingKey(keys, 'RS256', 'key-1')
      expect(result.exactMatch).not.toBeNull()
      expect(result.exactMatch.key.kid).toBe('key-1')
      expect(result.exactMatch.index).toBe(0)
    })

    test('应该找到仅 kid 匹配的密钥', () => {
      const result = findMatchingKey(keys, 'ES256', 'key-1')
      expect(result.exactMatch).toBeNull()
      expect(result.kidMatch).not.toBeNull()
      expect(result.kidMatch.key.kid).toBe('key-1')
    })

    test('应该找到仅 alg 匹配的密钥', () => {
      const result = findMatchingKey(keys, 'ES256', 'unknown-kid')
      expect(result.exactMatch).toBeNull()
      expect(result.kidMatch).toBeNull()
      expect(result.algMatch).not.toBeNull()
      expect(result.algMatch.key.alg).toBe('ES256')
    })

    test('无 alg 的密钥也应该匹配', () => {
      const result = findMatchingKey(keys, 'RS256', 'key-4')
      expect(result.exactMatch).not.toBeNull()
      expect(result.exactMatch.key.kid).toBe('key-4')
    })

    test('应该返回所有可用密钥列表', () => {
      const result = findMatchingKey(keys, 'RS256', 'key-1')
      expect(result.availableKeys.length).toBe(4)
      expect(result.availableKeys[0].kid).toBe('key-1')
    })

    test('无匹配时所有匹配都为 null', () => {
      const noHsKeys = [
        { kty: 'RSA', kid: 'key-1', alg: 'RS256' },
        { kty: 'EC', kid: 'key-2', alg: 'ES256' },
      ]
      const result = findMatchingKey(noHsKeys, 'HS256', 'unknown-kid')
      expect(result.exactMatch).toBeNull()
      expect(result.kidMatch).toBeNull()
      expect(result.algMatch).toBeNull()
    })
  })

  describe('selectBestKey', () => {
    test('应该优先选择 exactMatch', () => {
      const matchResults = {
        exactMatch: { index: 0, key: { kid: 'exact' }, summary: {} },
        kidMatch: { index: 1, key: { kid: 'kid' }, summary: {} },
        algMatch: { index: 2, key: { kid: 'alg' }, summary: {} },
        availableKeys: [],
      }
      const result = selectBestKey(matchResults)
      expect(result.success).toBe(true)
      expect(result.matchType).toBe('exact')
      expect(result.key.kid).toBe('exact')
    })

    test('无 exactMatch 时选择 kidMatch', () => {
      const matchResults = {
        exactMatch: null,
        kidMatch: { index: 1, key: { kid: 'kid' }, summary: {} },
        algMatch: { index: 2, key: { kid: 'alg' }, summary: {} },
        availableKeys: [],
      }
      const result = selectBestKey(matchResults)
      expect(result.success).toBe(true)
      expect(result.matchType).toBe('kid')
      expect(result.warning).toBeDefined()
    })

    test('无 kidMatch 时选择 algMatch', () => {
      const matchResults = {
        exactMatch: null,
        kidMatch: null,
        algMatch: { index: 2, key: { kid: 'alg' }, summary: {} },
        availableKeys: [],
      }
      const result = selectBestKey(matchResults)
      expect(result.success).toBe(true)
      expect(result.matchType).toBe('alg')
      expect(result.warning).toBeDefined()
    })

    test('无匹配时返回错误', () => {
      const matchResults = {
        exactMatch: null,
        kidMatch: null,
        algMatch: null,
        availableKeys: [{ kid: 'key-1' }, { kid: 'key-2' }],
      }
      const result = selectBestKey(matchResults)
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.NO_MATCHING_KEY)
      expect(result.availableKeys.length).toBe(2)
    })
  })

  describe('jwkToCryptoKey', () => {
    test('应该为 HS256 生成正确的算法配置', () => {
      const jwk = { kty: 'oct' }
      const result = jwkToCryptoKey(jwk, 'HS256')
      expect(result.success).toBe(true)
      expect(result.subtleAlg.name).toBe('HMAC')
      expect(result.subtleAlg.hash.name).toBe('SHA-256')
      expect(result.usages).toEqual(['verify'])
    })

    test('应该为 RS256 生成正确的算法配置', () => {
      const jwk = { kty: 'RSA' }
      const result = jwkToCryptoKey(jwk, 'RS256')
      expect(result.success).toBe(true)
      expect(result.subtleAlg.name).toBe('RSASSA-PKCS1-v1_5')
      expect(result.subtleAlg.hash.name).toBe('SHA-256')
    })

    test('应该为 ES256 生成正确的算法配置', () => {
      const jwk = { kty: 'EC', crv: 'P-256' }
      const result = jwkToCryptoKey(jwk, 'ES256')
      expect(result.success).toBe(true)
      expect(result.subtleAlg.name).toBe('ECDSA')
      expect(result.subtleAlg.namedCurve).toBe('P-256')
    })

    test('不支持的算法应该返回错误', () => {
      const jwk = { kty: 'RSA' }
      const result = jwkToCryptoKey(jwk, 'UNKNOWN')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.UNSUPPORTED_ALGORITHM)
    })
  })
})
