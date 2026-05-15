import { describe, expect, test } from 'vitest'
import {
  PROVIDERS,
  ENCODINGS,
  EXAMPLES,
  MAX_BODY_SIZE_BYTES,
  TRUNCATE_PREVIEW_LENGTH,
  STEP_TYPES,
  ERROR_CODES,
} from '../logic/index.js'

describe('常量定义测试', () => {
  describe('PROVIDERS', () => {
    test('应该包含所有签名提供商', () => {
      expect(PROVIDERS.HMAC_SHA256).toBe('hmac-sha256')
      expect(PROVIDERS.STRIPE_V1).toBe('stripe-v1')
      expect(PROVIDERS.GITHUB_SHA256).toBe('github-sha256')
      expect(Object.keys(PROVIDERS).length).toBe(3)
    })
  })

  describe('ENCODINGS', () => {
    test('应该包含所有编码类型', () => {
      expect(ENCODINGS.HEX).toBe('hex')
      expect(ENCODINGS.BASE64).toBe('base64')
      expect(Object.keys(ENCODINGS).length).toBe(2)
    })
  })

  describe('EXAMPLES', () => {
    test('每个提供商应该有示例数据', () => {
      expect(EXAMPLES).toHaveProperty('hmac-sha256')
      expect(EXAMPLES).toHaveProperty('stripe-v1')
      expect(EXAMPLES).toHaveProperty('github-sha256')
    })

    test('示例数据应该包含必要字段', () => {
      const stripeExample = EXAMPLES['stripe-v1']
      expect(stripeExample).toHaveProperty('label')
      expect(stripeExample).toHaveProperty('body')
      expect(stripeExample).toHaveProperty('secret')
      expect(stripeExample).toHaveProperty('timestamp')
      expect(stripeExample).toHaveProperty('signatureHeader')

      const githubExample = EXAMPLES['github-sha256']
      expect(githubExample).toHaveProperty('label')
      expect(githubExample).toHaveProperty('body')
      expect(githubExample).toHaveProperty('secret')
      expect(githubExample).toHaveProperty('signatureHeader')

      const hmacExample = EXAMPLES['hmac-sha256']
      expect(hmacExample).toHaveProperty('label')
      expect(hmacExample).toHaveProperty('body')
      expect(hmacExample).toHaveProperty('secret')
      expect(hmacExample).toHaveProperty('signatureHeader')
    })
  })

  describe('MAX_BODY_SIZE_BYTES', () => {
    test('应该是正确的数值', () => {
      expect(MAX_BODY_SIZE_BYTES).toBe(512 * 1024)
      expect(typeof MAX_BODY_SIZE_BYTES).toBe('number')
    })
  })

  describe('TRUNCATE_PREVIEW_LENGTH', () => {
    test('应该是正确的数值', () => {
      expect(TRUNCATE_PREVIEW_LENGTH).toBe(100)
      expect(typeof TRUNCATE_PREVIEW_LENGTH).toBe('number')
    })
  })

  describe('STEP_TYPES', () => {
    test('应该包含所有步骤类型', () => {
      expect(STEP_TYPES.RAW_BODY).toBe('raw-body')
      expect(STEP_TYPES.BODY_BYTES).toBe('body-bytes')
      expect(STEP_TYPES.TIMESTAMP).toBe('timestamp')
      expect(STEP_TYPES.SIGNING_STRING).toBe('signing-string')
      expect(STEP_TYPES.HMAC_CALCULATION).toBe('hmac-calculation')
      expect(STEP_TYPES.FINAL_SIGNATURE).toBe('final-signature')
      expect(Object.keys(STEP_TYPES).length).toBe(6)
    })
  })

  describe('ERROR_CODES', () => {
    test('应该包含所有错误代码', () => {
      expect(ERROR_CODES.BODY_TOO_LARGE).toBe('BODY_TOO_LARGE')
      expect(ERROR_CODES.MISSING_SECRET).toBe('MISSING_SECRET')
      expect(ERROR_CODES.MISSING_TIMESTAMP).toBe('MISSING_TIMESTAMP')
      expect(ERROR_CODES.INVALID_PROVIDER).toBe('INVALID_PROVIDER')
      expect(ERROR_CODES.CRYPTO_NOT_SUPPORTED).toBe('CRYPTO_NOT_SUPPORTED')
      expect(Object.keys(ERROR_CODES).length).toBe(5)
    })
  })
})
