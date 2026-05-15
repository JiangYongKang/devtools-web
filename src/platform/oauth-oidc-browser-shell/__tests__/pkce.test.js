import {
  generateCodeVerifier,
  validateCodeVerifier,
  generateCodeChallenge,
  verifyCodeChallenge,
  generateRandomString,
} from '../logic/pkce'
import { PKCE } from '../logic/constants'

describe('PKCE 模块测试', () => {
  describe('generateRandomString', () => {
    it('应该生成指定长度的随机字符串', () => {
      const length = 32
      const result = generateRandomString(length)
      expect(result).toHaveLength(length)
    })

    it('应该只包含 PKCE 允许的字符', () => {
      const result = generateRandomString(64)
      const validChars = /^[A-Za-z0-9\-._~]+$/
      expect(validChars.test(result)).toBe(true)
    })

    it('每次调用应该生成不同的字符串', () => {
      const result1 = generateRandomString(32)
      const result2 = generateRandomString(32)
      expect(result1).not.toBe(result2)
    })
  })

  describe('generateCodeVerifier', () => {
    it('应该生成符合 RFC 7636 规范的 code_verifier', () => {
      const verifier = generateCodeVerifier()
      expect(verifier.length).toBeGreaterThanOrEqual(PKCE.CODE_VERIFIER_MIN_LENGTH)
      expect(verifier.length).toBeLessThanOrEqual(PKCE.CODE_VERIFIER_MAX_LENGTH)
      const validChars = /^[A-Za-z0-9\-._~]+$/
      expect(validChars.test(verifier)).toBe(true)
    })

    it('每次调用应该生成不同的 code_verifier', () => {
      const verifier1 = generateCodeVerifier()
      const verifier2 = generateCodeVerifier()
      expect(verifier1).not.toBe(verifier2)
    })
  })

  describe('validateCodeVerifier', () => {
    it('应该验证有效的 code_verifier', () => {
      const validVerifier = generateCodeVerifier()
      const result = validateCodeVerifier(validVerifier)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('应该拒绝长度过短的 code_verifier', () => {
      const shortVerifier = 'short'
      const result = validateCodeVerifier(shortVerifier)
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('应该拒绝长度过长的 code_verifier', () => {
      const longVerifier = 'a'.repeat(129)
      const result = validateCodeVerifier(longVerifier)
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('应该拒绝包含非法字符的 code_verifier', () => {
      const invalidVerifier = 'invalid!@#$%'
      const result = validateCodeVerifier(invalidVerifier)
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('应该拒绝空值', () => {
      const result1 = validateCodeVerifier('')
      const result2 = validateCodeVerifier(null)
      const result3 = validateCodeVerifier(undefined)
      expect(result1.valid).toBe(false)
      expect(result2.valid).toBe(false)
      expect(result3.valid).toBe(false)
    })
  })

  describe('generateCodeChallenge', () => {
    it('应该生成有效的 code_challenge (S256)', async () => {
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)
      expect(challenge).toBeDefined()
      expect(typeof challenge).toBe('string')
      expect(challenge.length).toBeGreaterThan(0)
      const base64UrlPattern = /^[A-Za-z0-9\-_]+$/
      expect(base64UrlPattern.test(challenge)).toBe(true)
    })

    it('相同的 code_verifier 应该生成相同的 code_challenge', async () => {
      const verifier = generateCodeVerifier()
      const challenge1 = await generateCodeChallenge(verifier)
      const challenge2 = await generateCodeChallenge(verifier)
      expect(challenge1).toBe(challenge2)
    })

    it('不同的 code_verifier 应该生成不同的 code_challenge', async () => {
      const verifier1 = generateCodeVerifier()
      const verifier2 = generateCodeVerifier()
      const challenge1 = await generateCodeChallenge(verifier1)
      const challenge2 = await generateCodeChallenge(verifier2)
      expect(challenge1).not.toBe(challenge2)
    })

    it('对于无效的 code_verifier 应该抛出错误', async () => {
      await expect(generateCodeChallenge('short')).rejects.toThrow()
    })
  })

  describe('verifyCodeChallenge', () => {
    it('应该验证正确的 code_verifier 和 code_challenge 配对', async () => {
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)
      const isValid = await verifyCodeChallenge(verifier, challenge)
      expect(isValid).toBe(true)
    })

    it('应该拒绝不正确的配对', async () => {
      const verifier1 = generateCodeVerifier()
      const verifier2 = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier1)
      const isValid = await verifyCodeChallenge(verifier2, challenge)
      expect(isValid).toBe(false)
    })
  })

  describe('RFC 7636 示例向量验证', () => {
    it('应该使用标准测试向量验证', async () => {
      const testVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
      const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
      const challenge = await generateCodeChallenge(testVerifier)
      expect(challenge).toBe(expectedChallenge)
    })
  })
})
