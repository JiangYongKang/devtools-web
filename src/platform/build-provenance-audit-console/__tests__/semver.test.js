import { describe, it, expect } from 'vitest'
import {
  parseSemVer,
  compareSemVer,
  isValidSemVer,
  isGreater,
  isLess,
  isEqual
} from '../logic/semver.js'
import { SemVerError } from '../logic/errors.js'

describe('SemVer 解析函数', () => {
  describe('parseSemVer', () => {
    it('应该正确解析标准语义化版本号', () => {
      const result = parseSemVer('1.2.3')
      expect(result.major).toBe(1)
      expect(result.minor).toBe(2)
      expect(result.patch).toBe(3)
      expect(result.prerelease).toBe(null)
    })

    it('应该正确解析带 v 前缀的版本号', () => {
      const result = parseSemVer('v2.5.10')
      expect(result.major).toBe(2)
      expect(result.minor).toBe(5)
      expect(result.patch).toBe(10)
    })

    it('应该正确解析带预发布版本的版本号', () => {
      const result = parseSemVer('1.0.0-beta.1')
      expect(result.major).toBe(1)
      expect(result.minor).toBe(0)
      expect(result.patch).toBe(0)
      expect(result.prerelease).toBe('-beta.1')
    })

    it('无效格式应该抛出 SemVerError', () => {
      expect(() => parseSemVer('invalid')).toThrow(SemVerError)
      expect(() => parseSemVer('1.2')).toThrow(SemVerError)
      expect(() => parseSemVer('')).toThrow(SemVerError)
      expect(() => parseSemVer(null)).toThrow(SemVerError)
    })
  })

  describe('isValidSemVer', () => {
    it('有效版本号应该返回 true', () => {
      expect(isValidSemVer('1.0.0')).toBe(true)
      expect(isValidSemVer('v2.5.10')).toBe(true)
      expect(isValidSemVer('1.0.0-beta')).toBe(true)
    })

    it('无效版本号应该返回 false', () => {
      expect(isValidSemVer('invalid')).toBe(false)
      expect(isValidSemVer('1.2')).toBe(false)
      expect(isValidSemVer('')).toBe(false)
    })
  })

  describe('compareSemVer', () => {
    it('主版本号不同时应该正确比较', () => {
      expect(compareSemVer('2.0.0', '1.0.0')).toBeGreaterThan(0)
      expect(compareSemVer('1.0.0', '2.0.0')).toBeLessThan(0)
    })

    it('次版本号不同时应该正确比较', () => {
      expect(compareSemVer('1.2.0', '1.1.0')).toBeGreaterThan(0)
      expect(compareSemVer('1.1.0', '1.2.0')).toBeLessThan(0)
    })

    it('修订号不同时应该正确比较', () => {
      expect(compareSemVer('1.0.2', '1.0.1')).toBeGreaterThan(0)
      expect(compareSemVer('1.0.1', '1.0.2')).toBeLessThan(0)
    })

    it('相同版本号应该返回 0', () => {
      expect(compareSemVer('1.2.3', '1.2.3')).toBe(0)
    })

    it('预发布版本应该低于正式版本', () => {
      expect(compareSemVer('1.0.0-beta', '1.0.0')).toBeLessThan(0)
    })
  })

  describe('辅助比较函数', () => {
    it('isGreater 应该正确判断', () => {
      expect(isGreater('2.0.0', '1.0.0')).toBe(true)
      expect(isGreater('1.0.0', '2.0.0')).toBe(false)
    })

    it('isLess 应该正确判断', () => {
      expect(isLess('1.0.0', '2.0.0')).toBe(true)
      expect(isLess('2.0.0', '1.0.0')).toBe(false)
    })

    it('isEqual 应该正确判断', () => {
      expect(isEqual('1.2.3', '1.2.3')).toBe(true)
      expect(isEqual('1.2.3', '1.2.4')).toBe(false)
    })
  })
})
