import { describe, test, expect } from 'vitest'
import {
  ALGORITHM_CONFIGS,
  getAlgorithmInfo,
  isValidAlgorithm,
  isValidKeySize,
  isValidCurve,
} from '../logic/keyGenerator.js'

describe('keyGenerator - 密钥生成', () => {
  describe('ALGORITHM_CONFIGS', () => {
    test('包含所有支持的算法配置', () => {
      expect(ALGORITHM_CONFIGS.RSA).toBeDefined()
      expect(ALGORITHM_CONFIGS.RSA_OAEP).toBeDefined()
      expect(ALGORITHM_CONFIGS.EC).toBeDefined()
      expect(ALGORITHM_CONFIGS.ECDH).toBeDefined()
      expect(ALGORITHM_CONFIGS.Ed25519).toBeDefined()
    })

    test('RSA 配置正确', () => {
      expect(ALGORITHM_CONFIGS.RSA.name).toBe('RSASSA-PKCS1-v1_5')
      expect(ALGORITHM_CONFIGS.RSA.keySizes).toContain(2048)
      expect(ALGORITHM_CONFIGS.RSA.keySizes).toContain(4096)
      expect(ALGORITHM_CONFIGS.RSA.defaultKeySize).toBe(2048)
      expect(ALGORITHM_CONFIGS.RSA.usage).toContain('sign')
      expect(ALGORITHM_CONFIGS.RSA.usage).toContain('verify')
    })

    test('RSA_OAEP 配置正确', () => {
      expect(ALGORITHM_CONFIGS.RSA_OAEP.name).toBe('RSA-OAEP')
      expect(ALGORITHM_CONFIGS.RSA_OAEP.usage).toContain('encrypt')
      expect(ALGORITHM_CONFIGS.RSA_OAEP.usage).toContain('decrypt')
    })

    test('EC 配置正确', () => {
      expect(ALGORITHM_CONFIGS.EC.name).toBe('ECDSA')
      expect(ALGORITHM_CONFIGS.EC.curves).toContain('P-256')
      expect(ALGORITHM_CONFIGS.EC.curves).toContain('P-384')
      expect(ALGORITHM_CONFIGS.EC.defaultCurve).toBe('P-256')
    })

    test('ECDH 配置正确', () => {
      expect(ALGORITHM_CONFIGS.ECDH.name).toBe('ECDH')
      expect(ALGORITHM_CONFIGS.ECDH.curves).toContain('P-256')
      expect(ALGORITHM_CONFIGS.ECDH.curves).toContain('P-384')
    })

    test('Ed25519 配置正确', () => {
      expect(ALGORITHM_CONFIGS.Ed25519.name).toBe('Ed25519')
      expect(ALGORITHM_CONFIGS.Ed25519.usage).toContain('sign')
      expect(ALGORITHM_CONFIGS.Ed25519.usage).toContain('verify')
    })
  })

  describe('getAlgorithmInfo', () => {
    test('返回已知算法返回配置信息', () => {
      const info = getAlgorithmInfo('RSA')
      expect(info).toBeDefined()
      expect(info.name).toBe('RSASSA-PKCS1-v1_5')
    })

    test('未知算法返回 null', () => {
      const info = getAlgorithmInfo('UNKNOWN')
      expect(info).toBeNull()
    })
  })

  describe('isValidAlgorithm', () => {
    test('有效算法返回 true', () => {
      expect(isValidAlgorithm('RSA')).toBe(true)
      expect(isValidAlgorithm('EC')).toBe(true)
      expect(isValidAlgorithm('RSA_OAEP')).toBe(true)
      expect(isValidAlgorithm('ECDH')).toBe(true)
      expect(isValidAlgorithm('Ed25519')).toBe(true)
    })

    test('无效算法返回 false', () => {
      expect(isValidAlgorithm('UNKNOWN')).toBe(false)
      expect(isValidAlgorithm('')).toBe(false)
      expect(isValidAlgorithm(null)).toBe(false)
    })
  })

  describe('isValidKeySize', () => {
    test('RSA 有效密钥长度返回 true', () => {
      expect(isValidKeySize('RSA', 2048)).toBe(true)
      expect(isValidKeySize('RSA', 4096)).toBe(true)
    })

    test('RSA 无效密钥长度返回 false', () => {
      expect(isValidKeySize('RSA', 1024)).toBe(false)
      expect(isValidKeySize('RSA', 512)).toBe(false)
    })

    test('非 RSA 算法返回 false', () => {
      expect(isValidKeySize('EC', 2048)).toBe(false)
      expect(isValidKeySize('UNKNOWN', 2048)).toBe(false)
    })
  })

  describe('isValidCurve', () => {
    test('EC 有效曲线返回 true', () => {
      expect(isValidCurve('EC', 'P-256')).toBe(true)
      expect(isValidCurve('EC', 'P-384')).toBe(true)
      expect(isValidCurve('ECDH', 'P-256')).toBe(true)
    })

    test('EC 无效曲线返回 false', () => {
      expect(isValidCurve('EC', 'P-521')).toBe(false)
      expect(isValidCurve('EC', 'invalid')).toBe(false)
    })

    test('非 EC 算法返回 false', () => {
      expect(isValidCurve('RSA', 'P-256')).toBe(false)
      expect(isValidCurve('UNKNOWN', 'P-256')).toBe(false)
    })
  })
})
