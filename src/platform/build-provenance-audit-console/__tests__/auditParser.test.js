import { describe, it, expect } from 'vitest'
import {
  parseAuditJson,
  extractVulnerabilities,
  groupByPackage,
  sortBySeverity,
  getAuditSummary,
  getSeverityByScore
} from '../logic/auditParser.js'
import demoAudit from '../logic/fixtures/demoAudit.json'

describe('安全审计解析函数', () => {
  const auditJsonString = JSON.stringify(demoAudit)

  describe('parseAuditJson', () => {
    it('应该正确解析有效的 audit JSON', () => {
      const result = parseAuditJson(auditJsonString)
      expect(result.vulnerabilities).toBeDefined()
      expect(result.vulnerabilities.lodash).toBeDefined()
    })

    it('无效 JSON 应该抛出 ParseError', () => {
      expect(() => parseAuditJson('invalid json')).toThrow()
      expect(() => parseAuditJson('{}')).toThrow()
    })
  })

  describe('extractVulnerabilities', () => {
    it('应该正确提取所有漏洞', () => {
      const vulnerabilities = extractVulnerabilities(demoAudit)
      expect(Array.isArray(vulnerabilities)).toBe(true)
      expect(vulnerabilities.length).toBe(4)
    })

    it('提取的漏洞应该包含必要字段', () => {
      const vulnerabilities = extractVulnerabilities(demoAudit)
      const lodashVuln = vulnerabilities.find(v => v.packageName === 'lodash')
      expect(lodashVuln).toBeDefined()
      expect(lodashVuln.title).toBeDefined()
      expect(lodashVuln.severity).toBeDefined()
      expect(lodashVuln.cvssScore).toBeDefined()
    })
  })

  describe('groupByPackage', () => {
    it('应该按包名正确分组漏洞', () => {
      const vulnerabilities = extractVulnerabilities(demoAudit)
      const grouped = groupByPackage(vulnerabilities)
      
      expect(grouped.length).toBe(3)
      
      const lodashGroup = grouped.find(g => g.packageName === 'lodash')
      expect(lodashGroup).toBeDefined()
      expect(lodashGroup.vulnerabilities.length).toBe(2)
    })

    it('应该正确统计各严重级别数量', () => {
      const vulnerabilities = extractVulnerabilities(demoAudit)
      const grouped = groupByPackage(vulnerabilities)
      
      const lodashGroup = grouped.find(g => g.packageName === 'lodash')
      expect(lodashGroup.severityCounts.critical).toBe(1)
      expect(lodashGroup.severityCounts.high).toBe(1)
    })

    it('应该正确设置最高风险级别', () => {
      const vulnerabilities = extractVulnerabilities(demoAudit)
      const grouped = groupByPackage(vulnerabilities)
      
      const lodashGroup = grouped.find(g => g.packageName === 'lodash')
      expect(lodashGroup.maxSeverity).toBe('critical')
    })
  })

  describe('sortBySeverity', () => {
    it('应该按严重程度从高到低排序', () => {
      const vulnerabilities = extractVulnerabilities(demoAudit)
      const sorted = sortBySeverity(vulnerabilities)
      
      expect(sorted[0].severity.toLowerCase()).toBe('critical')
      expect(sorted[1].severity.toLowerCase()).toBe('high')
      expect(sorted[2].severity.toLowerCase()).toBe('medium')
      expect(sorted[3].severity.toLowerCase()).toBe('low')
    })
  })

  describe('getAuditSummary', () => {
    it('应该返回完整的审计摘要', () => {
      const summary = getAuditSummary(demoAudit)
      
      expect(summary.counts.total).toBe(4)
      expect(summary.counts.critical).toBe(1)
      expect(summary.counts.high).toBe(1)
      expect(summary.counts.medium).toBe(1)
      expect(summary.counts.low).toBe(1)
      expect(summary.affectedPackagesCount).toBe(3)
    })
  })

  describe('getSeverityByScore', () => {
    it('应该根据分数返回正确的严重级别', () => {
      expect(getSeverityByScore(9.8).label).toBe('严重')
      expect(getSeverityByScore(7.5).label).toBe('高危')
      expect(getSeverityByScore(6.1).label).toBe('中危')
      expect(getSeverityByScore(3.1).label).toBe('低危')
      expect(getSeverityByScore(0).label).toBe('无风险')
    })
  })
})
