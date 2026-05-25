import { describe, test, expect, beforeEach, vi } from 'vitest'
import {
  getCurrentTimeSeconds,
  validateExp,
  validateNbf,
  validateIss,
  validateAud,
  buildDefaultRules,
  validateRules,
  validateClaims,
} from '../logic/claimsValidator.js'
import { ERROR_CODES } from '../logic/errors.js'

describe('claimsValidator', () => {
  describe('getCurrentTimeSeconds', () => {
    test('应该返回当前时间的 Unix 时间戳（秒）', () => {
      const now = Math.floor(Date.now() / 1000)
      const result = getCurrentTimeSeconds()
      expect(result).toBeGreaterThanOrEqual(now - 1)
      expect(result).toBeLessThanOrEqual(now + 1)
    })
  })

  describe('validateExp', () => {
    test('无 exp 声明应该返回 valid', () => {
      const result = validateExp({}, 0, 1000)
      expect(result.valid).toBe(true)
      expect(result.hasClaim).toBe(false)
      expect(result.claim).toBe('exp')
    })

    test('未过期的 token 应该返回 valid', () => {
      const currentTime = 1000
      const payload = { exp: 2000 }
      const result = validateExp(payload, 0, currentTime)
      expect(result.valid).toBe(true)
      expect(result.hasClaim).toBe(true)
      expect(result.value).toBe(2000)
      expect(result.currentTime).toBe(1000)
    })

    test('已过期的 token 应该返回 invalid', () => {
      const currentTime = 2000
      const payload = { exp: 1000 }
      const result = validateExp(payload, 0, currentTime)
      expect(result.valid).toBe(false)
      expect(result.hasClaim).toBe(true)
      expect(result.error.errorCode).toBe(ERROR_CODES.TOKEN_EXPIRED)
    })

    test('clock skew 应该延迟过期判定', () => {
      const currentTime = 1000
      const payload = { exp: 900 }
      const result = validateExp(payload, 200, currentTime)
      expect(result.valid).toBe(true)
      expect(result.adjustedTime).toBe(800)
    })

    test('超过 clock skew 的过期应该返回 invalid', () => {
      const currentTime = 1000
      const payload = { exp: 700 }
      const result = validateExp(payload, 200, currentTime)
      expect(result.valid).toBe(false)
      expect(result.adjustedTime).toBe(800)
    })

    test('exp 等于当前时间应该返回 invalid', () => {
      const currentTime = 1000
      const payload = { exp: 1000 }
      const result = validateExp(payload, 0, currentTime)
      expect(result.valid).toBe(false)
    })
  })

  describe('validateNbf', () => {
    test('无 nbf 声明应该返回 valid', () => {
      const result = validateNbf({}, 0, 1000)
      expect(result.valid).toBe(true)
      expect(result.hasClaim).toBe(false)
    })

    test('已生效的 token 应该返回 valid', () => {
      const currentTime = 2000
      const payload = { nbf: 1000 }
      const result = validateNbf(payload, 0, currentTime)
      expect(result.valid).toBe(true)
      expect(result.hasClaim).toBe(true)
      expect(result.value).toBe(1000)
    })

    test('未生效的 token 应该返回 invalid', () => {
      const currentTime = 1000
      const payload = { nbf: 2000 }
      const result = validateNbf(payload, 0, currentTime)
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.TOKEN_NOT_YET_VALID)
    })

    test('clock skew 应该提前生效判定', () => {
      const currentTime = 1000
      const payload = { nbf: 1100 }
      const result = validateNbf(payload, 200, currentTime)
      expect(result.valid).toBe(true)
      expect(result.adjustedTime).toBe(1200)
    })

    test('超过 clock skew 的未生效应该返回 invalid', () => {
      const currentTime = 1000
      const payload = { nbf: 1300 }
      const result = validateNbf(payload, 200, currentTime)
      expect(result.valid).toBe(false)
      expect(result.adjustedTime).toBe(1200)
    })

    test('nbf 等于当前时间应该返回 valid', () => {
      const currentTime = 1000
      const payload = { nbf: 1000 }
      const result = validateNbf(payload, 0, currentTime)
      expect(result.valid).toBe(true)
    })
  })

  describe('validateIss', () => {
    test('未配置期望 iss 应该返回 valid', () => {
      const result = validateIss({ iss: 'any-issuer' }, '')
      expect(result.valid).toBe(true)
      expect(result.checked).toBe(false)
    })

    test('iss 匹配应该返回 valid', () => {
      const result = validateIss({ iss: 'https://example.com' }, 'https://example.com')
      expect(result.valid).toBe(true)
      expect(result.checked).toBe(true)
      expect(result.value).toBe('https://example.com')
    })

    test('iss 不匹配应该返回 invalid', () => {
      const result = validateIss({ iss: 'https://wrong.com' }, 'https://example.com')
      expect(result.valid).toBe(false)
      expect(result.checked).toBe(true)
      expect(result.error.errorCode).toBe(ERROR_CODES.ISSUER_MISMATCH)
    })

    test('缺失 iss 应该返回 invalid', () => {
      const result = validateIss({}, 'https://example.com')
      expect(result.valid).toBe(false)
      expect(result.checked).toBe(true)
      expect(result.hasClaim).toBe(false)
    })
  })

  describe('validateAud', () => {
    test('未配置期望 aud 应该返回 valid', () => {
      const result = validateAud({ aud: 'any-audience' }, '')
      expect(result.valid).toBe(true)
      expect(result.checked).toBe(false)
    })

    test('aud 字符串匹配应该返回 valid', () => {
      const result = validateAud({ aud: 'my-api' }, 'my-api')
      expect(result.valid).toBe(true)
      expect(result.checked).toBe(true)
    })

    test('aud 数组包含匹配值应该返回 valid', () => {
      const result = validateAud({ aud: ['api1', 'api2', 'api3'] }, 'api2')
      expect(result.valid).toBe(true)
      expect(result.checked).toBe(true)
    })

    test('aud 不匹配应该返回 invalid', () => {
      const result = validateAud({ aud: 'wrong-api' }, 'my-api')
      expect(result.valid).toBe(false)
      expect(result.checked).toBe(true)
      expect(result.error.errorCode).toBe(ERROR_CODES.AUDIENCE_MISMATCH)
    })

    test('缺失 aud 应该返回 invalid', () => {
      const result = validateAud({}, 'my-api')
      expect(result.valid).toBe(false)
      expect(result.checked).toBe(true)
      expect(result.hasClaim).toBe(false)
    })

    test('期望 aud 数组任一匹配应该返回 valid', () => {
      const result = validateAud({ aud: 'api2' }, ['api1', 'api2'])
      expect(result.valid).toBe(true)
    })
  })

  describe('buildDefaultRules', () => {
    test('应该返回默认规则配置', () => {
      const rules = buildDefaultRules()
      expect(rules.validateExp).toBe(true)
      expect(rules.validateNbf).toBe(true)
      expect(rules.validateIss).toBe(false)
      expect(rules.validateAud).toBe(false)
      expect(rules.clockSkewSeconds).toBe(0)
      expect(rules.expectedIss).toBe('')
      expect(rules.expectedAud).toBe('')
    })
  })

  describe('validateRules', () => {
    test('null 规则应该返回 invalid', () => {
      const result = validateRules(null)
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_CLAIM_RULES)
    })

    test('有效的规则应该返回 valid', () => {
      const result = validateRules({ clockSkewSeconds: 60 })
      expect(result.valid).toBe(true)
    })

    test('clock skew 小于 0 应该返回 invalid', () => {
      const result = validateRules({ clockSkewSeconds: -1 })
      expect(result.valid).toBe(false)
    })

    test('clock skew 大于 3600 应该返回 invalid', () => {
      const result = validateRules({ clockSkewSeconds: 3601 })
      expect(result.valid).toBe(false)
    })

    test('clock skew 为 0 应该返回 valid', () => {
      const result = validateRules({ clockSkewSeconds: 0 })
      expect(result.valid).toBe(true)
    })

    test('clock skew 为 3600 应该返回 valid', () => {
      const result = validateRules({ clockSkewSeconds: 3600 })
      expect(result.valid).toBe(true)
    })
  })

  describe('validateClaims', () => {
    test('无效规则应该返回错误', () => {
      const result = validateClaims({}, null)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_CLAIM_RULES)
    })

    test('默认规则应该验证 exp 和 nbf', () => {
      const currentTime = 1000
      const payload = { exp: 2000, nbf: 500 }
      const rules = buildDefaultRules()
      const result = validateClaims(payload, rules, currentTime)
      expect(result.success).toBe(true)
      expect(result.allValid).toBe(true)
      expect(result.results.length).toBe(2)
      expect(result.failedClaims).toEqual([])
    })

    test('应该返回所有失败的 claims', () => {
      const currentTime = 1000
      const payload = { exp: 500, nbf: 2000 }
      const rules = buildDefaultRules()
      const result = validateClaims(payload, rules, currentTime)
      expect(result.success).toBe(true)
      expect(result.allValid).toBe(false)
      expect(result.failedClaims).toEqual(['exp', 'nbf'])
      expect(result.errors.length).toBe(2)
    })

    test('启用 iss 验证应该检查 iss', () => {
      const currentTime = 1000
      const payload = { exp: 2000, nbf: 500, iss: 'https://example.com' }
      const rules = {
        ...buildDefaultRules(),
        validateIss: true,
        expectedIss: 'https://example.com',
      }
      const result = validateClaims(payload, rules, currentTime)
      expect(result.allValid).toBe(true)
      expect(result.results.length).toBe(3)
    })

    test('启用 aud 验证应该检查 aud', () => {
      const currentTime = 1000
      const payload = { exp: 2000, nbf: 500, aud: 'my-api' }
      const rules = {
        ...buildDefaultRules(),
        validateAud: true,
        expectedAud: 'my-api',
      }
      const result = validateClaims(payload, rules, currentTime)
      expect(result.allValid).toBe(true)
      expect(result.results.length).toBe(3)
    })

    test('混合验证结果应该正确聚合', () => {
      const currentTime = 1000
      const payload = {
        exp: 500,
        nbf: 500,
        iss: 'https://example.com',
        aud: 'wrong-api',
      }
      const rules = {
        ...buildDefaultRules(),
        validateIss: true,
        expectedIss: 'https://example.com',
        validateAud: true,
        expectedAud: 'my-api',
      }
      const result = validateClaims(payload, rules, currentTime)
      expect(result.allValid).toBe(false)
      expect(result.failedClaims).toContain('exp')
      expect(result.failedClaims).toContain('aud')
      expect(result.failedClaims).not.toContain('nbf')
      expect(result.failedClaims).not.toContain('iss')
    })
  })
})
