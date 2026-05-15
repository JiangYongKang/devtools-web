import { describe, expect, test, beforeEach } from 'vitest'
import {
  DOMAINS,
  SEVERITY,
  ERROR_CODES,
  DEFAULT_MAPPINGS,
  ENVIRONMENT_OVERRIDES,
  ENVIRONMENTS,
  createDefaultMappingEntry,
  getMappingKey,
  getMatchScore,
  mergeMappings,
  matchInput,
  findMatchingMapping,
  getLocalizedValue,
  createUnknownBusinessMapping,
  extractCauseChain,
  parseRetryAfter,
  buildMergedMappings,
  getTextForLocale,
  mapError,
} from '../logic/index.js'

describe('错误映射逻辑模块测试', () => {
  describe('getMappingKey', () => {
    test('应该正确生成映射键', () => {
      const match1 = { domain: DOMAINS.HTTP, httpStatus: 404, businessCode: 'NOT_FOUND' }
      expect(getMappingKey(match1)).toBe('http:404:NOT_FOUND')

      const match2 = { domain: DOMAINS.WS, httpStatus: null, businessCode: null }
      expect(getMappingKey(match2)).toBe('ws:null:null')

      const match3 = { domain: DOMAINS.CLIPBOARD, httpStatus: null, businessCode: 'PERMISSION' }
      expect(getMappingKey(match3)).toBe('clipboard:null:PERMISSION')
    })
  })

  describe('getMatchScore', () => {
    test('应该正确计算匹配分数', () => {
      const fullMatch = { domain: DOMAINS.HTTP, httpStatus: 404, businessCode: 'CODE' }
      expect(getMatchScore(fullMatch)).toBe(7)

      const domainAndBusiness = { domain: DOMAINS.HTTP, httpStatus: null, businessCode: 'CODE' }
      expect(getMatchScore(domainAndBusiness)).toBe(6)

      const domainOnly = { domain: DOMAINS.HTTP, httpStatus: null, businessCode: null }
      expect(getMatchScore(domainOnly)).toBe(4)
    })
  })

  describe('mergeMappings', () => {
    test('应该按正确顺序合并映射，后加载的优先级更高', () => {
      const defaultMapping = createDefaultMappingEntry({
        domain: DOMAINS.HTTP,
        httpStatus: 500,
        errorCode: 'DEFAULT_500',
        userTitle: { en: 'Default Server Error' },
        userDetail: { en: 'Default detail' },
        recoveryHints: { en: ['Retry'] },
        severity: SEVERITY.ERROR,
      })

      const envMapping = createDefaultMappingEntry({
        domain: DOMAINS.HTTP,
        httpStatus: 500,
        errorCode: 'ENV_500',
        userTitle: { en: 'Env Server Error' },
        userDetail: { en: 'Env detail' },
        recoveryHints: { en: ['Check logs'] },
        severity: SEVERITY.ERROR,
      })

      const merged = mergeMappings([defaultMapping], [envMapping])
      
      expect(merged.length).toBe(1)
      expect(merged[0].template.errorCode).toBe('ENV_500')
    })

    test('应该优先选择分数更高的匹配项', () => {
      const lowScore = createDefaultMappingEntry({
        domain: DOMAINS.HTTP,
        httpStatus: null,
        businessCode: null,
        errorCode: 'LOW',
        userTitle: { en: 'Low' },
        userDetail: { en: 'Low' },
        recoveryHints: { en: [] },
        severity: SEVERITY.INFO,
      })

      const highScore = createDefaultMappingEntry({
        domain: DOMAINS.HTTP,
        httpStatus: 500,
        businessCode: 'SPECIFIC',
        errorCode: 'HIGH',
        userTitle: { en: 'High' },
        userDetail: { en: 'High' },
        recoveryHints: { en: [] },
        severity: SEVERITY.INFO,
      })

      const merged = mergeMappings([lowScore], [highScore])
      
      expect(merged.length).toBe(2)
      expect(merged[0].template.errorCode).toBe('HIGH')
    })
  })

  describe('matchInput', () => {
    test('应该正确匹配输入', () => {
      const match = {
        domain: DOMAINS.HTTP,
        httpStatus: 404,
        businessCode: 'NOT_FOUND',
      }

      const matchingInput = {
        domain: DOMAINS.HTTP,
        httpStatus: 404,
        businessCode: 'NOT_FOUND',
      }

      const nonMatchingInput = {
        domain: DOMAINS.HTTP,
        httpStatus: 500,
        businessCode: 'NOT_FOUND',
      }

      expect(matchInput(match, matchingInput)).toBe(true)
      expect(matchInput(match, nonMatchingInput)).toBe(false)
    })

    test('应该正确处理空的匹配条件', () => {
      const match = {
        domain: DOMAINS.HTTP,
        httpStatus: null,
        businessCode: null,
      }

      const input = {
        domain: DOMAINS.HTTP,
        httpStatus: 404,
        businessCode: 'ANY_CODE',
      }

      expect(matchInput(match, input)).toBe(true)
    })
  })

  describe('getLocalizedValue', () => {
    test('应该正确获取本地化值', () => {
      const localized = {
        zh: '中文标题',
        en: 'English Title',
      }

      expect(getLocalizedValue(localized, 'zh')).toBe('中文标题')
      expect(getLocalizedValue(localized, 'en')).toBe('English Title')
      expect(getLocalizedValue(localized, 'fr', 'en')).toBe('English Title')
      expect(getLocalizedValue(null, 'zh')).toBe(null)
    })
  })

  describe('createUnknownBusinessMapping', () => {
    test('应该创建未知业务错误映射', () => {
      const originalCode = 'CUSTOM_CODE_123'
      const mapping = createUnknownBusinessMapping(originalCode, 'zh')

      expect(mapping.template.errorCode).toBe(ERROR_CODES.UNKNOWN_BUSINESS)
      expect(mapping.match.businessCode).toBe(originalCode)
      expect(mapping.template.userDetail.zh).toContain(originalCode)
    })
  })

  describe('extractCauseChain', () => {
    test('应该正确提取错误原因链', () => {
      const level3 = new Error('Level 3')
      const level2 = new Error('Level 2')
      level2.cause = level3
      const level1 = new Error('Level 1')
      level1.cause = level2

      const chain = extractCauseChain(level1)

      expect(chain.length).toBe(3)
      expect(chain[0].message).toBe('Level 1')
      expect(chain[1].message).toBe('Level 2')
      expect(chain[2].message).toBe('Level 3')
    })

    test('应该正确处理循环引用', () => {
      const error1 = new Error('Error 1')
      const error2 = new Error('Error 2')
      error1.cause = error2
      error2.cause = error1

      const chain = extractCauseChain(error1)

      expect(chain.some(item => item.circular)).toBe(true)
    })

    test('应该遵守最大深度限制', () => {
      let current = new Error('Root')
      const first = current
      
      for (let i = 0; i < 10; i++) {
        const next = new Error(`Level ${i}`)
        current.cause = next
        current = next
      }

      const chain = extractCauseChain(first, 3)
      expect(chain.length).toBeLessThanOrEqual(3)
    })
  })

  describe('parseRetryAfter', () => {
    test('应该正确解析秒数格式', () => {
      const headers = {
        get: (name) => name.toLowerCase() === 'retry-after' ? '30' : null,
      }

      const result = parseRetryAfter(headers)
      expect(result).toBe(30)
    })

    test('应该正确解析 HTTP-date 格式', () => {
      const futureDate = new Date(Date.now() + 60000).toUTCString()
      const headers = {
        'retry-after': futureDate,
      }

      const result = parseRetryAfter(headers)
      expect(result).toBeGreaterThanOrEqual(59)
      expect(result).toBeLessThanOrEqual(61)
    })

    test('应该在没有 Retry-After 头时返回 null', () => {
      const headers = {}
      const result = parseRetryAfter(headers)
      expect(result).toBe(null)
    })
  })

  describe('mapError', () => {
    test('应该正确映射已知错误', () => {
      const result = mapError({
        domain: DOMAINS.HTTP,
        httpStatus: 404,
        businessCode: null,
      }, {
        locale: 'zh',
        fallbackLocale: 'en',
      })

      expect(result.errorCode).toBe(ERROR_CODES.HTTP_404)
      expect(result.severity).toBe(SEVERITY.WARNING)
      expect(result.retryable).toBe(false)
      expect(result.userTitle).toBeTruthy()
      expect(result.userDetail).toBeTruthy()
      expect(Array.isArray(result.recoveryHints)).toBe(true)
    })

    test('应该正确处理未知业务码', () => {
      const unknownCode = 'UNKNOWN_BUSINESS_999'
      const result = mapError({
        domain: DOMAINS.HTTP,
        httpStatus: 200,
        businessCode: unknownCode,
      }, {
        locale: 'en',
        fallbackLocale: 'en',
      })

      expect(result.errorCode).toBe(ERROR_CODES.UNKNOWN_BUSINESS)
      expect(result.userDetail).toContain(unknownCode)
    })

    test('应该正确处理 locale 回退', () => {
      const result = mapError({
        domain: DOMAINS.HTTP,
        httpStatus: 404,
        businessCode: null,
      }, {
        locale: 'fr',
        fallbackLocale: 'en',
      })

      expect(result.userTitle).toBeTruthy()
      expect(typeof result.userTitle).toBe('string')
    })

    test('应该正确处理原因链', () => {
      const cause = new Error('Root cause')
      const result = mapError({
        domain: DOMAINS.HTTP,
        httpStatus: 500,
        businessCode: null,
      }, {
        locale: 'en',
        fallbackLocale: 'en',
        cause,
      })

      expect(Array.isArray(result.causeChain)).toBe(true)
      expect(result.causeChain.length).toBeGreaterThan(0)
    })
  })

  describe('buildMergedMappings', () => {
    test('应该构建正确的合并映射', () => {
      const mappings = buildMergedMappings({
        environment: ENVIRONMENTS.DEVELOPMENT,
      })

      expect(Array.isArray(mappings)).toBe(true)
      expect(mappings.length).toBeGreaterThan(0)
    })

    test('应该正确应用环境覆盖', () => {
      const devMappings = buildMergedMappings({
        environment: ENVIRONMENTS.DEVELOPMENT,
      })

      const prodMappings = buildMergedMappings({
        environment: ENVIRONMENTS.PRODUCTION,
      })

      const dev500 = devMappings.find(m => m.match.httpStatus === 500)
      const prod500 = prodMappings.find(m => m.match.httpStatus === 500)

      if (dev500 && prod500) {
        expect(dev500.template.userTitle.zh).not.toBe(prod500.template.userTitle.zh)
      }
    })
  })
})
