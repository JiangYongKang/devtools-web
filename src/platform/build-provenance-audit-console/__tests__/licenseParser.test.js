import { describe, it, expect } from 'vitest'
import {
  parseLicensesJson,
  extractLicenses,
  normalizeLicense,
  isLicenseAllowlisted,
  detectLicenseConflicts,
  groupLicensesByType,
  getLicenseSummary
} from '../logic/licenseParser.js'
import demoLicenses from '../logic/fixtures/demoLicenses.json'

describe('许可证解析函数', () => {
  const licensesJsonString = JSON.stringify(demoLicenses)

  describe('parseLicensesJson', () => {
    it('应该正确解析有效的许可证 JSON', () => {
      const result = parseLicensesJson(licensesJsonString)
      expect(result.react).toBeDefined()
      expect(result.lodash).toBeDefined()
    })

    it('无效 JSON 应该抛出 ParseError', () => {
      expect(() => parseLicensesJson('invalid json')).toThrow()
    })
  })

  describe('extractLicenses', () => {
    it('应该正确提取所有许可证信息', () => {
      const licenses = extractLicenses(demoLicenses)
      expect(Array.isArray(licenses)).toBe(true)
      expect(licenses.length).toBe(7)
    })

    it('提取的许可证应该包含必要字段', () => {
      const licenses = extractLicenses(demoLicenses)
      const reactLicense = licenses.find(l => l.packageName === 'react')
      expect(reactLicense).toBeDefined()
      expect(reactLicense.version).toBe('18.2.0')
      expect(reactLicense.license).toBe('MIT')
    })

    it('应该正确设置 isAllowlisted 标志', () => {
      const licenses = extractLicenses(demoLicenses)
      const reactLicense = licenses.find(l => l.packageName === 'react')
      const commercialLicense = licenses.find(l => l.packageName === 'commercial-lib')
      
      expect(reactLicense.isAllowlisted).toBe(true)
      expect(commercialLicense.isAllowlisted).toBe(false)
    })
  })

  describe('normalizeLicense', () => {
    it('应该正确规范化许可证名称', () => {
      expect(normalizeLicense('MIT')).toBe('MIT')
      expect(normalizeLicense(' (MIT) ')).toBe('MIT')
      expect(normalizeLicense('MIT AND Apache-2.0')).toBe('MIT;Apache-2.0')
      expect(normalizeLicense(null)).toBe('Unknown')
      expect(normalizeLicense('')).toBe('Unknown')
    })
  })

  describe('isLicenseAllowlisted', () => {
    it('白名单中的许可证应该返回 true', () => {
      expect(isLicenseAllowlisted('MIT')).toBe(true)
      expect(isLicenseAllowlisted('Apache-2.0')).toBe(true)
      expect(isLicenseAllowlisted('BSD-3-Clause')).toBe(true)
    })

    it('不在白名单中的许可证应该返回 false', () => {
      expect(isLicenseAllowlisted('GPL-3.0')).toBe(false)
      expect(isLicenseAllowlisted('Proprietary')).toBe(false)
      expect(isLicenseAllowlisted(null)).toBe(false)
    })

    it('复合许可证全部在白名单时应该返回 true', () => {
      expect(isLicenseAllowlisted('MIT;Apache-2.0')).toBe(true)
    })

    it('复合许可证有一个不在白名单时应该返回 false', () => {
      expect(isLicenseAllowlisted('MIT;GPL-3.0')).toBe(false)
    })
  })

  describe('detectLicenseConflicts', () => {
    it('应该正确检测许可证冲突', () => {
      const licenses = extractLicenses(demoLicenses)
      const conflicts = detectLicenseConflicts(licenses)
      
      expect(conflicts.length).toBe(2)
      expect(conflicts.some(c => c.packageName === 'commercial-lib')).toBe(true)
      expect(conflicts.some(c => c.packageName === 'gpl-lib')).toBe(true)
    })
  })

  describe('groupLicensesByType', () => {
    it('应该按许可证类型正确分组', () => {
      const licenses = extractLicenses(demoLicenses)
      const grouped = groupLicensesByType(licenses)
      
      const mitGroup = grouped.find(g => g.license === 'MIT')
      expect(mitGroup).toBeDefined()
      expect(mitGroup.count).toBe(5)
      expect(mitGroup.isAllowlisted).toBe(true)
    })

    it('应该按数量从多到少排序', () => {
      const licenses = extractLicenses(demoLicenses)
      const grouped = groupLicensesByType(licenses)
      
      expect(grouped[0].count).toBeGreaterThanOrEqual(grouped[1].count)
    })
  })

  describe('getLicenseSummary', () => {
    it('应该返回完整的许可证摘要', () => {
      const summary = getLicenseSummary(demoLicenses)
      
      expect(summary.totalPackages).toBe(7)
      expect(summary.allowlistedCount).toBe(5)
      expect(summary.conflictCount).toBe(2)
      expect(summary.conflicts.length).toBe(2)
    })
  })
})
