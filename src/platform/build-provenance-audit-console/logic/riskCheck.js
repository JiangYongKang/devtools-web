import { SOURCEMAP_LEAK_CHECKS } from './constants.js'

/**
 * 检查 Source Map 泄露风险
 * 根据配置项检查各种可能导致 Source Map 泄露的情况
 * @param {Object} config - 检查配置对象
 * @param {boolean} config.hasPublicMapFiles - public 目录是否包含 .map 文件
 * @param {boolean} config.hasInlineSourceMap - 是否使用 inline-source-map
 * @param {boolean} config.hasSourceMappingURL - 是否保留 sourceMappingURL 注释
 * @param {boolean} config.hasWideCORS - CORS 配置是否过宽
 * @param {string} config.buildConfig - 构建配置内容
 * @returns {Object} 风险检查结果
 */
export function checkSourceMapLeaks(config = {}) {
  const findings = []
  
  const buildConfig = config.buildConfig || ''
  const hasPublicMapFiles = config.hasPublicMapFiles || false
  const hasInlineSourceMap = config.hasInlineSourceMap || false
  const hasSourceMappingURL = config.hasSourceMappingURL || false
  const hasWideCORS = config.hasWideCORS || false
  
  if (hasPublicMapFiles) {
    findings.push(SOURCEMAP_LEAK_CHECKS.find(c => c.id === 'public-dir-exposure'))
  }
  
  if (hasSourceMappingURL) {
    findings.push(SOURCEMAP_LEAK_CHECKS.find(c => c.id === 'sourcemap-comment-leftover'))
  }
  
  if (hasInlineSourceMap) {
    findings.push(SOURCEMAP_LEAK_CHECKS.find(c => c.id === 'inline-sourcemap-production'))
  }
  
  if (hasWideCORS) {
    findings.push(SOURCEMAP_LEAK_CHECKS.find(c => c.id === 'sourcemap-cors-open'))
  }
  
  if (buildConfig.includes('inline-source-map') || buildConfig.includes('eval-source-map')) {
    findings.push(SOURCEMAP_LEAK_CHECKS.find(c => c.id === 'inline-sourcemap-production'))
  }
  
  return {
    findings: findings.filter(Boolean),
    riskLevel: findings.length > 0 ? 'high' : 'safe',
    totalChecks: SOURCEMAP_LEAK_CHECKS.length,
    passedChecks: SOURCEMAP_LEAK_CHECKS.length - findings.length
  }
}

/**
 * 解析 CycloneDX 格式的 SBOM XML 文件
 * 提取组件名称、版本、许可证等信息
 * @param {string} xmlString - CycloneDX XML 内容字符串
 * @returns {Object} 解析后的 SBOM 数据
 */
export function parseCycloneDX(xmlString) {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml')
  
  const components = xmlDoc.querySelectorAll('component')
  const packages = []
  
  components.forEach(comp => {
    const name = comp.querySelector('name')?.textContent || ''
    const version = comp.querySelector('version')?.textContent || ''
    const licenseEl = comp.querySelector('licenses license id')
    const license = licenseEl?.textContent || 'Unknown'
    const purl = comp.querySelector('purl')?.textContent || ''
    
    packages.push({
      name,
      version,
      license,
      purl,
      type: comp.getAttribute('type') || 'library'
    })
  })
  
  return {
    packages,
    totalComponents: packages.length,
    bomFormat: 'CycloneDX'
  }
}

/**
 * 生成演示用的风险检查配置
 * 用于开发环境或测试时的默认配置
 * @returns {Object} 演示配置对象
 */
export function generateDemoRiskCheck() {
  return {
    buildConfig: `
module.exports = {
  devtool: 'source-map',
  production: {
    devtool: 'hidden-source-map'
  }
}`,
    hasPublicMapFiles: false,
    hasInlineSourceMap: false,
    hasSourceMappingURL: true,
    hasWideCORS: false
  }
}

/**
 * 生成风险检查摘要报告
 * 统计各严重级别的风险数量
 * @param {Object} riskCheckResult - checkSourceMapLeaks 返回的结果
 * @returns {Object} 风险摘要对象
 */
export function getRiskSummary(riskCheckResult) {
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  }
  
  riskCheckResult.findings.forEach(finding => {
    const risk = finding.risk.toLowerCase()
    if (risk === '严重' || risk === 'critical') severityCounts.critical++
    else if (risk === '高危' || risk === 'high') severityCounts.high++
    else if (risk === '中危' || risk === 'medium') severityCounts.medium++
    else severityCounts.low++
  })
  
  return {
    ...riskCheckResult,
    severityCounts
  }
}
