import { ParseError, errorMessages } from './errors.js'
import { CVSS_SEVERITY } from './constants.js'

/**
 * 根据 CVSS 分数获取对应的严重程度信息
 * @param {number} score - CVSS 基础分数
 * @returns {Object} 包含颜色和标签的严重程度对象
 */
export function getSeverityByScore(score) {
  if (score >= CVSS_SEVERITY.CRITICAL.threshold) return CVSS_SEVERITY.CRITICAL
  if (score >= CVSS_SEVERITY.HIGH.threshold) return CVSS_SEVERITY.HIGH
  if (score >= CVSS_SEVERITY.MEDIUM.threshold) return CVSS_SEVERITY.MEDIUM
  if (score >= CVSS_SEVERITY.LOW.threshold) return CVSS_SEVERITY.LOW
  return CVSS_SEVERITY.NONE
}

/**
 * 解析 npm audit JSON 字符串并验证格式
 * @param {string} jsonString - npm audit 输出的 JSON 字符串
 * @returns {Object} 解析后的 audit 数据对象
 * @throws {ParseError} 当 JSON 格式无效或缺少必要字段时抛出
 */
export function parseAuditJson(jsonString) {
  try {
    const data = JSON.parse(jsonString)
    
    if (!data.vulnerabilities && !data.advisories) {
      throw new ParseError(errorMessages.INVALID_AUDIT_JSON)
    }
    
    return data
  } catch (e) {
    if (e instanceof ParseError) throw e
    throw new ParseError(errorMessages.INVALID_AUDIT_JSON)
  }
}

/**
 * 从 audit 数据中提取所有漏洞信息
 * @param {Object} auditData - 解析后的 audit 数据对象
 * @returns {Array<Object>} 漏洞信息数组，包含包名、标题、严重程度等
 */
export function extractVulnerabilities(auditData) {
  const vulnerabilities = []
  
  if (auditData.vulnerabilities) {
    for (const [pkgName, vulns] of Object.entries(auditData.vulnerabilities)) {
      if (Array.isArray(vulns)) {
        vulns.forEach(vuln => {
          vulnerabilities.push({
            packageName: pkgName,
            title: vuln.title || vuln.title,
            severity: vuln.severity,
            cvssScore: vuln.cvss?.score || 0,
            cve: vuln.cve || [],
            fixedVersions: vuln.fix_available || vuln.fixedVersions || [],
            version: vuln.range || vuln.version || '*',
            via: vuln.via || []
          })
        })
      }
    }
  }
  
  if (auditData.advisories) {
    for (const [id, advisory] of Object.entries(auditData.advisories)) {
      vulnerabilities.push({
        packageName: advisory.module_name,
        title: advisory.title,
        severity: advisory.severity,
        cvssScore: advisory.cvss?.score || 0,
        cve: advisory.cves || [],
        fixedVersions: advisory.patched_versions || [],
        version: advisory.vulnerable_versions || '*',
        id
      })
    }
  }
  
  return vulnerabilities
}

/**
 * 按包名对漏洞进行分组聚合
 * @param {Array<Object>} vulnerabilities - 漏洞信息数组
 * @returns {Array<Object>} 按包分组后的漏洞数组，每组包含严重级别统计和最高风险级别
 */
export function groupByPackage(vulnerabilities) {
  const grouped = {}
  
  vulnerabilities.forEach(vuln => {
    const key = vuln.packageName
    if (!grouped[key]) {
      grouped[key] = {
        packageName: vuln.packageName,
        vulnerabilities: [],
        severityCounts: { critical: 0, high: 0, medium: 0, low: 0 },
        maxSeverity: null
      }
    }
    
    grouped[key].vulnerabilities.push(vuln)
    
    const severity = vuln.severity?.toLowerCase()
    if (severity && grouped[key].severityCounts[severity] !== undefined) {
      grouped[key].severityCounts[severity]++
    }
  })
  
  for (const pkg of Object.values(grouped)) {
    if (pkg.severityCounts.critical > 0) pkg.maxSeverity = 'critical'
    else if (pkg.severityCounts.high > 0) pkg.maxSeverity = 'high'
    else if (pkg.severityCounts.medium > 0) pkg.maxSeverity = 'medium'
    else if (pkg.severityCounts.low > 0) pkg.maxSeverity = 'low'
    else pkg.maxSeverity = 'none'
  }
  
  return Object.values(grouped)
}

/**
 * 按严重程度对漏洞进行降序排序
 * 严重程度相同时按 CVSS 分数降序排序
 * @param {Array<Object>} vulnerabilities - 漏洞信息数组
 * @returns {Array<Object>} 排序后的漏洞数组
 */
export function sortBySeverity(vulnerabilities) {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 }
  
  return [...vulnerabilities].sort((a, b) => {
    const severityA = a.severity?.toLowerCase() || 'none'
    const severityB = b.severity?.toLowerCase() || 'none'
    const orderA = severityOrder[severityA] ?? 4
    const orderB = severityOrder[severityB] ?? 4
    
    if (orderA !== orderB) {
      return orderA - orderB
    }
    return b.cvssScore - a.cvssScore
  })
}

/**
 * 生成完整的审计摘要报告
 * 包含各严重级别数量统计、按包分组信息
 * @param {Object} auditData - 解析后的 audit 数据对象
 * @returns {Object} 审计摘要对象
 */
export function getAuditSummary(auditData) {
  const vulnerabilities = extractVulnerabilities(auditData)
  const grouped = groupByPackage(vulnerabilities)
  
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: vulnerabilities.length
  }
  
  vulnerabilities.forEach(vuln => {
    const severity = vuln.severity?.toLowerCase()
    if (severity && counts[severity] !== undefined) {
      counts[severity]++
    }
  })
  
  return {
    counts,
    vulnerabilities: sortBySeverity(vulnerabilities),
    groupedPackages: grouped,
    affectedPackagesCount: grouped.length
  }
}
