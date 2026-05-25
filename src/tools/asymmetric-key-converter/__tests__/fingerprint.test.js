import { describe, test, expect } from 'vitest'
import {
  FINGERPRINT_ALGORITHMS,
  openSSHFingerprintToHex,
  formatAsOpenSSH,
} from '../logic/fingerprint.js'

describe('fingerprint - 指纹计算', () => {
  describe('FINGERPRINT_ALGORITHMS', () => {
    test('包含所有支持的指纹算法', () => {
      expect(FINGERPRINT_ALGORITHMS.SHA256).toBe('SHA-256')
      expect(FINGERPRINT_ALGORITHMS.SHA1).toBe('SHA-1')
    })
  })

  describe('openSSHFingerprintToHex', () => {
    test('转换有效的 OpenSSH 指纹为 Hex', () => {
      const sshFp = 'SHA256:abc'
      const hex = openSSHFingerprintToHex(sshFp)
      expect(hex).toBeDefined()
      expect(typeof hex).toBe('string')
    })

    test('无效的 OpenSSH 指纹返回 null', () => {
      const invalidFp = 'MD5:abc'
      const hex = openSSHFingerprintToHex(invalidFp)
      expect(hex).toBeNull()
    })

    test('空字符串返回 null', () => {
      const hex = openSSHFingerprintToHex('')
      expect(hex).toBeNull()
    })
  })

  describe('formatAsOpenSSH', () => {
    test('格式化 Hex 为 OpenSSH 风格', () => {
      const hex = '69a8f1c7d3e2b4a5'
      const sshFormat = formatAsOpenSSH(hex)
      expect(sshFormat).toContain('SHA256:')
      expect(sshFormat.length).toBeGreaterThan(7)
    })

    test('往返转换保持一致', () => {
      const original = 'abcdef0123456789abcdef0123456789'
      const sshFormat = formatAsOpenSSH(original)
      const backToHex = openSSHFingerprintToHex(sshFormat)
      expect(backToHex).toBe(original)
    })
  })
})
