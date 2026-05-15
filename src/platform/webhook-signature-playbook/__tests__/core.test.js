import { describe, expect, test } from 'vitest'
import {
  PROVIDERS,
  STEP_TYPES,
  MAX_BODY_SIZE_BYTES,
  countUtf8Bytes,
  truncatePreview,
  formatBytesPreview,
  minifyJson,
  buildWebhookSignatureSteps,
  buildHmacSha256Steps,
  buildStripeV1Steps,
  buildGithubSha256Steps,
  isWebCryptoSupported,
} from '../logic/index.js'

describe('Webhook 签名逻辑模块测试', () => {
  describe('countUtf8Bytes', () => {
    test('应该正确计算 ASCII 字符串字节数', () => {
      expect(countUtf8Bytes('hello')).toBe(5)
      expect(countUtf8Bytes('')).toBe(0)
      expect(countUtf8Bytes('{"test": true}')).toBe(14)
    })

    test('应该正确计算中文字符串字节数', () => {
      expect(countUtf8Bytes('你好')).toBe(6)
      expect(countUtf8Bytes('测试中文')).toBe(12)
    })

    test('应该正确计算混合字符串字节数', () => {
      expect(countUtf8Bytes('hello 世界')).toBe(12)
    })
  })

  describe('truncatePreview', () => {
    test('短字符串不应截断', () => {
      const result = truncatePreview('short', 100)
      expect(result.value).toBe('short')
      expect(result.truncated).toBe(false)
    })

    test('长字符串应截断', () => {
      const longStr = 'a'.repeat(200)
      const result = truncatePreview(longStr, 100)
      expect(result.value).toBe('a'.repeat(100) + '...')
      expect(result.truncated).toBe(true)
      expect(result.originalLength).toBe(200)
    })

    test('使用默认截断长度', () => {
      const longStr = 'a'.repeat(200)
      const result = truncatePreview(longStr)
      expect(result.value.length).toBeGreaterThan(100)
      expect(result.truncated).toBe(true)
    })
  })

  describe('formatBytesPreview', () => {
    test('应该正确格式化短字节数组', () => {
      const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
      const result = formatBytesPreview(bytes, 10)
      expect(result.value).toBe('48 65 6c 6c 6f')
      expect(result.truncated).toBe(false)
      expect(result.totalBytes).toBe(5)
    })

    test('应该正确截断长字节数组', () => {
      const bytes = new Uint8Array(Array.from({ length: 50 }, (_, i) => i))
      const result = formatBytesPreview(bytes, 10)
      expect(result.value).toContain('...')
      expect(result.truncated).toBe(true)
      expect(result.totalBytes).toBe(50)
      expect(result.shownBytes).toBe(10)
    })
  })

  describe('minifyJson', () => {
    test('应该正确压缩格式化 JSON', () => {
      const formatted = `{
        "name": "test",
        "value": 123
      }`
      const minified = minifyJson(formatted)
      expect(minified).toBe('{"name":"test","value":123}')
    })

    test('无效 JSON 应返回原值', () => {
      const invalidJson = 'not valid json'
      expect(minifyJson(invalidJson)).toBe(invalidJson)
    })

    test('空字符串应返回空字符串', () => {
      expect(minifyJson('')).toBe('')
    })
  })

  describe('buildHmacSha256Steps', () => {
    test('应该生成正确的步骤', () => {
      const parts = {
        body: '{"test": true}',
        secret: 'test-secret',
      }
      const steps = buildHmacSha256Steps(parts)

      expect(steps.length).toBe(5)
      expect(steps[0].type).toBe(STEP_TYPES.RAW_BODY)
      expect(steps[1].type).toBe(STEP_TYPES.BODY_BYTES)
      expect(steps[2].type).toBe(STEP_TYPES.SIGNING_STRING)
      expect(steps[3].type).toBe(STEP_TYPES.HMAC_CALCULATION)
      expect(steps[4].type).toBe(STEP_TYPES.FINAL_SIGNATURE)

      expect(steps[0].fullValue).toBe(parts.body)
      expect(steps[1].byteCount).toBe(14)
    })
  })

  describe('buildStripeV1Steps', () => {
    test('应该生成正确的步骤（包含时间戳）', () => {
      const parts = {
        body: '{"test": true}',
        secret: 'test-secret',
        timestamp: '1620000000',
      }
      const steps = buildStripeV1Steps(parts)

      expect(steps.length).toBe(6)
      expect(steps[0].type).toBe(STEP_TYPES.TIMESTAMP)
      expect(steps[1].type).toBe(STEP_TYPES.RAW_BODY)
      expect(steps[2].type).toBe(STEP_TYPES.BODY_BYTES)
      expect(steps[3].type).toBe(STEP_TYPES.SIGNING_STRING)
      expect(steps[4].type).toBe(STEP_TYPES.HMAC_CALCULATION)
      expect(steps[5].type).toBe(STEP_TYPES.FINAL_SIGNATURE)

      expect(steps[0].fullValue).toBe(parts.timestamp)
      expect(steps[3].fullValue).toBe(`${parts.timestamp}.${parts.body}`)
    })
  })

  describe('buildGithubSha256Steps', () => {
    test('应该生成正确的步骤', () => {
      const parts = {
        body: '{"action": "push"}',
        secret: 'test-secret',
      }
      const steps = buildGithubSha256Steps(parts)

      expect(steps.length).toBe(5)
      expect(steps[0].type).toBe(STEP_TYPES.RAW_BODY)
      expect(steps[1].type).toBe(STEP_TYPES.BODY_BYTES)
      expect(steps[2].type).toBe(STEP_TYPES.SIGNING_STRING)
      expect(steps[3].type).toBe(STEP_TYPES.HMAC_CALCULATION)
      expect(steps[4].type).toBe(STEP_TYPES.FINAL_SIGNATURE)
    })
  })

  describe('buildWebhookSignatureSteps', () => {
    test('应该为 HMAC_SHA256 生成正确步骤', () => {
      const steps = buildWebhookSignatureSteps(PROVIDERS.HMAC_SHA256, {
        body: 'test',
        secret: 'secret',
      })
      expect(steps.length).toBe(5)
    })

    test('应该为 STRIPE_V1 生成正确步骤', () => {
      const steps = buildWebhookSignatureSteps(PROVIDERS.STRIPE_V1, {
        body: 'test',
        secret: 'secret',
        timestamp: '1234567890',
      })
      expect(steps.length).toBe(6)
    })

    test('应该为 GITHUB_SHA256 生成正确步骤', () => {
      const steps = buildWebhookSignatureSteps(PROVIDERS.GITHUB_SHA256, {
        body: 'test',
        secret: 'secret',
      })
      expect(steps.length).toBe(5)
    })

    test('缺少密钥应抛出错误', () => {
      expect(() => {
        buildWebhookSignatureSteps(PROVIDERS.HMAC_SHA256, {
          body: 'test',
          secret: '',
        })
      }).toThrow()
    })

    test('Stripe 缺少时间戳应抛出错误', () => {
      expect(() => {
        buildWebhookSignatureSteps(PROVIDERS.STRIPE_V1, {
          body: 'test',
          secret: 'secret',
          timestamp: '',
        })
      }).toThrow()
    })

    test('无效 provider 应抛出错误', () => {
      expect(() => {
        buildWebhookSignatureSteps('invalid-provider', {
          body: 'test',
          secret: 'secret',
        })
      }).toThrow()
    })

    test('超大 Body 应抛出错误', () => {
      const largeBody = 'a'.repeat(MAX_BODY_SIZE_BYTES + 1)
      expect(() => {
        buildWebhookSignatureSteps(PROVIDERS.HMAC_SHA256, {
          body: largeBody,
          secret: 'secret',
        })
      }).toThrow()
    })

    test('空 Body 应正常工作', () => {
      const steps = buildWebhookSignatureSteps(PROVIDERS.HMAC_SHA256, {
        body: '',
        secret: 'secret',
      })
      expect(steps.length).toBe(5)
      expect(steps[0].fullValue).toBe('')
    })
  })

  describe('isWebCryptoSupported', () => {
    test('应该返回布尔值', () => {
      const result = isWebCryptoSupported()
      expect(typeof result).toBe('boolean')
    })
  })
})
