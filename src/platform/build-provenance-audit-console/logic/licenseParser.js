import { ParseError, errorMessages } from './errors.js'
import { LICENSE_ALLOWLIST } from './constants.js'

/**
 * 解析许可证检查工具的 JSON 输出
 * @param {string} jsonString - 许可证检查工具输出的 JSON 字符串
 * @returns {Object} 解析后的许可证数据对象
 * @throws {ParseError} 当 JSON 格式无效时抛出
 */
export function parseLicensesJson(jsonString) {
  try {
    const data = JSON.parse(jsonString)
    return data
  } catch {
    throw new ParseError(errorMessages.INVALID_LICENSES_JSON)
  }
}

/**
 * 从许可证数据中提取所有包的许可证信息
 * 自动标记每个许可证是否在白名单内
 * @param {Object|Array} licensesData - 解析后的许可证数据
 * @returns {Array<Object>} 许可证信息数组，包含包名、版本、许可证类型等
 */
export function extractLicenses(licensesData) {
  const licenses = []
  
  if (Array.isArray(licensesData)) {
    licensesData.forEach(pkg => {
      licenses.push({
        packageName: pkg.name || pkg.packageName,
        version: pkg.version,
        license: pkg.licenses || pkg.license || 'Unknown',
        author: pkg.author || pkg.publisher,
        path: pkg.path,
        repository: pkg.repository
      })
    })
  } else if (typeof licensesData === 'object') {
    for (const [pkgName, pkgInfo] of Object.entries(licensesData)) {
      if (pkgInfo && typeof pkgInfo === 'object') {
        licenses.push({
          packageName: pkgName,
          version: pkgInfo.version,
          license: pkgInfo.licenses || pkgInfo.license || 'Unknown',
          author: pkgInfo.author || pkgInfo.publisher,
          path: pkgInfo.path,
          repository: pkgInfo.repository
        })
      }
    }
  }
  
  return licenses.map(license => ({
    ...license,
    isAllowlisted: isLicenseAllowlisted(license.license)
  }))
}

/**
 * 规范化许可证名称字符串
 * 移除括号、替换 AND/OR 分隔符等
 * @param {string} license - 原始许可证字符串
 * @returns {string} 规范化后的许可证名称
 */
export function normalizeLicense(license) {
  if (!license) return 'Unknown'
  
  let normalized = String(license).trim()
  
  normalized = normalized.replace(/^\((.*?)\)$/, '$1')
  normalized = normalized.replace(/\s+(AND|OR)\s+/gi, ';')
  normalized = normalized.trim()
  
  return normalized
}

/**
 * 检查许可证是否在白名单中
 * 对于多许可证组合，需要全部许可证都在白名单中
 * @param {string} license - 许可证名称字符串
 * @returns {boolean} 许可证是否合规
 */
export function isLicenseAllowlisted(license) {
  if (!license) return false
  
  const normalized = normalizeLicense(license)
  
  if (LICENSE_ALLOWLIST.includes(normalized)) {
    return true
  }
  
  const parts = normalized.split(/[;&]/).map(p => p.trim())
  return parts.every(part => LICENSE_ALLOWLIST.includes(part))
}

/**
 * 检测所有不在白名单中的冲突许可证
 * @param {Array<Object>} licenses - 许可证信息数组
 * @returns {Array<Object>} 冲突的许可证数组
 */
export function detectLicenseConflicts(licenses) {
  return licenses.filter(license => !license.isAllowlisted)
}

/**
 * 按许可证类型对依赖包进行分组统计
 * @param {Array<Object>} licenses - 许可证信息数组
 * @returns {Array<Object>} 按许可证类型分组的数组，每组包含数量统计
 */
export function groupLicensesByType(licenses) {
  const grouped = {}
  
  licenses.forEach(license => {
    const key = license.license
    if (!grouped[key]) {
      grouped[key] = {
        license: key,
        packages: [],
        count: 0,
        isAllowlisted: license.isAllowlisted
      }
    }
    grouped[key].packages.push(license)
    grouped[key].count++
  })
  
  return Object.values(grouped).sort((a, b) => b.count - a.count)
}

/**
 * 生成完整的许可证检查摘要报告
 * 包含合规数量、冲突数量、类型统计等
 * @param {Object|Array} licensesData - 解析后的许可证数据
 * @returns {Object} 许可证检查摘要对象
 */
export function getLicenseSummary(licensesData) {
  const licenses = extractLicenses(licensesData)
  const conflicts = detectLicenseConflicts(licenses)
  const grouped = groupLicensesByType(licenses)
  
  return {
    totalPackages: licenses.length,
    allowlistedCount: licenses.filter(l => l.isAllowlisted).length,
    conflictCount: conflicts.length,
    conflicts,
    licenses,
    groupedByType: grouped
  }
}
