import { describe, test, expect, beforeEach } from 'vitest'
import {
  PKCE_CHARSET,
  MIN_VERIFIER_LENGTH,
  MAX_VERIFIER_LENGTH,
  generateCodeVerifier,
  isValidCodeVerifier,
  base64UrlEncode,
  generateCodeChallengeS256,
  generateCodeChallengePlain,
  generateCodeChallenge,
} from '../logic/pkce.js'

describe('PKCE 常量', () => {
  test('PKCE_CHARSET 包含正确的字符集', () => {
    expect(PKCE_CHARSET).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~')
  })

  test('MIN_VERIFIER_LENGTH 为 43', () => {
    expect(MIN_VERIFIER_LENGTH).toBe(43)
  })

  test('MAX_VERIFIER_LENGTH 为 128', () => {
    expect(MAX_VERIFIER_LENGTH).toBe(128)
  })
})

describe('generateCodeVerifier', () => {
  test('生成的 code_verifier 长度在有效范围内', () => {
    const verifier = generateCodeVerifier()
    expect(verifier.length).toBeGreaterThanOrEqual(MIN_VERIFIER_LENGTH)
    expect(verifier.length).toBeLessThanOrEqual(MAX_VERIFIER_LENGTH)
  })

  test('生成的 code_verifier 使用正确的字符集', () => {
    const verifier = generateCodeVerifier()
    for (const char of verifier) {
      expect(PKCE_CHARSET).toContain(char)
    }
  })

  test('可以指定长度生成 code_verifier', () => {
    const verifier = generateCodeVerifier(64)
    expect(verifier.length).toBe(64)
  })

  test('指定长度小于最小值时使用最小值', () => {
    const verifier = generateCodeVerifier(10)
    expect(verifier.length).toBe(MIN_VERIFIER_LENGTH)
  })

  test('指定长度大于最大值时使用最大值', () => {
    const verifier = generateCodeVerifier(200)
    expect(verifier.length).toBe(MAX_VERIFIER_LENGTH)
  })

  test('多次生成的 code_verifier 不相同', () => {
    const verifier1 = generateCodeVerifier()
    const verifier2 = generateCodeVerifier()
    expect(verifier1).not.toBe(verifier2)
  })
})

describe('isValidCodeVerifier', () => {
  test('返回 false 对于 null', () => {
    expect(isValidCodeVerifier(null)).toBe(false)
  })

  test('返回 false 对于 undefined', () => {
    expect(isValidCodeVerifier(undefined)).toBe(false)
  })

  test('返回 false 对于数字', () => {
    expect(isValidCodeVerifier(12345)).toBe(false)
  })

  test('返回 false 对于太短的字符串', () => {
    const shortVerifier = 'a'.repeat(42)
    expect(isValidCodeVerifier(shortVerifier)).toBe(false)
  })

  test('返回 false 对于太长的字符串', () => {
    const longVerifier = 'a'.repeat(129)
    expect(isValidCodeVerifier(longVerifier)).toBe(false)
  })

  test('返回 false 对于包含无效字符的字符串', () => {
    const invalidVerifier = 'a'.repeat(43) + '!'
    expect(isValidCodeVerifier(invalidVerifier)).toBe(false)
  })

  test('返回 true 对于刚好 43 字符的有效字符串', () => {
    const validVerifier = 'a'.repeat(43)
    expect(isValidCodeVerifier(validVerifier)).toBe(true)
  })

  test('返回 true 对于刚好 128 字符的有效字符串', () => {
    const validVerifier = 'a'.repeat(128)
    expect(isValidCodeVerifier(validVerifier)).toBe(true)
  })

  test('返回 true 对于包含所有有效字符的字符串', () => {
    const validVerifier = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    expect(isValidCodeVerifier(validVerifier)).toBe(true)
  })
})

describe('base64UrlEncode', () => {
  test('正确编码空数组', () => {
    const result = base64UrlEncode(new Uint8Array([]))
    expect(result).toBe('')
  })

  test('正确编码简单字节数组', () => {
    const result = base64UrlEncode(new Uint8Array([0x66, 0x6f, 0x6f]))
    expect(result).toBe('Zm9v')
  })

  test('正确转换 + 为 -', () => {
    const result = base64UrlEncode(new Uint8Array([0xfb]))
    expect(result).toBe('-w')
  })

  test('正确转换 / 为 _', () => {
    const result = base64UrlEncode(new Uint8Array([0xff]))
    expect(result).toBe('_w')
  })

  test('移除末尾的 =', () => {
    const result = base64UrlEncode(new Uint8Array([0x66, 0x6f]))
    expect(result).toBe('Zm8')
  })
})

describe('generateCodeChallengeS256', () => {
  test('正确计算 S256 challenge', async () => {
    const verifier = 'test-verifier-string'
    const challenge = await generateCodeChallengeS256(verifier)
    expect(typeof challenge).toBe('string')
    expect(challenge.length).toBeGreaterThan(0)
  })

  test('相同的 verifier 产生相同的 challenge', async () => {
    const verifier = 'test-verifier-string'
    const challenge1 = await generateCodeChallengeS256(verifier)
    const challenge2 = await generateCodeChallengeS256(verifier)
    expect(challenge1).toBe(challenge2)
  })

  test('不同的 verifier 产生不同的 challenge', async () => {
    const challenge1 = await generateCodeChallengeS256('verifier1')
    const challenge2 = await generateCodeChallengeS256('verifier2')
    expect(challenge1).not.toBe(challenge2)
  })

  test('challenge 不包含 + / = 字符', async () => {
    const verifier = 'test-verifier-string'
    const challenge = await generateCodeChallengeS256(verifier)
    expect(challenge).not.toContain('+')
    expect(challenge).not.toContain('/')
    expect(challenge).not.toContain('=')
  })
})

describe('generateCodeChallengePlain', () => {
  test('直接返回 verifier', () => {
    const verifier = 'test-verifier'
    expect(generateCodeChallengePlain(verifier)).toBe(verifier)
  })
})

describe('generateCodeChallenge', () => {
  test('默认使用 S256 方法', async () => {
    const verifier = 'test-verifier'
    const result = await generateCodeChallenge(verifier)
    expect(result.method).toBe('S256')
    expect(result.challenge).not.toBe(verifier)
  })

  test('使用 plain 方法时返回原字符串', async () => {
    const verifier = 'test-verifier'
    const result = await generateCodeChallenge(verifier, 'plain')
    expect(result.method).toBe('plain')
    expect(result.challenge).toBe(verifier)
  })
})
