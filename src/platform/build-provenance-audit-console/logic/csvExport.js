import { CSV_HEADERS } from './constants.js'

/**
 * 转义 CSV 字段值
 * 处理包含逗号、引号、换行符的特殊情况
 * @param {*} value - 待转义的字段值
 * @returns {string} 转义后的字符串
 */
export function escapeCsvValue(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * 将数据数组转换为 CSV 格式字符串
 * @param {Array<Array>} rows - 二维数组，每行是一个数据数组
 * @param {Array<string>} headers - 表头数组
 * @returns {string} CSV 格式字符串
 */
export function arrayToCsv(rows, headers) {
  const headerRow = headers.map(escapeCsvValue).join(',')
  const dataRows = rows.map(row => 
    row.map(cell => escapeCsvValue(cell)).join(',')
  )
  return [headerRow, ...dataRows].join('\n')
}

/**
 * 将漏洞数据转换为 CSV 格式
 * @param {Array<Object>} vulnerabilities - 漏洞信息数组
 * @returns {string} CSV 格式字符串
 */
export function vulnerabilitiesToCsv(vulnerabilities) {
  const rows = vulnerabilities.map(vuln => [
    vuln.packageName,
    vuln.version,
    vuln.title,
    vuln.cvssScore,
    vuln.severity,
    Array.isArray(vuln.cve) ? vuln.cve.join(';') : vuln.cve,
    Array.isArray(vuln.fixedVersions) ? vuln.fixedVersions.join(';') : vuln.fixedVersions
  ])
  
  return arrayToCsv(rows, CSV_HEADERS.AUDIT)
}

/**
 * 将许可证数据转换为 CSV 格式
 * @param {Array<Object>} licenses - 许可证信息数组
 * @returns {string} CSV 格式字符串
 */
export function licensesToCsv(licenses) {
  const rows = licenses.map(license => [
    license.packageName,
    license.version,
    license.license,
    license.isAllowlisted ? '是' : '否',
    license.author || ''
  ])
  
  return arrayToCsv(rows, CSV_HEADERS.LICENSES)
}

/**
 * 触发浏览器下载 CSV 文件
 * @param {string} csvContent - CSV 文件内容
 * @param {string} filename - 下载文件名
 */
export function downloadCsv(csvContent, filename) {
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
