import { CONFLICT_RULES, STANDARD_DIRECTIVES } from './constants.js'

function detectConflicts(parsedPolicy) {
  const conflicts = []
  const directiveNames = Object.keys(parsedPolicy.directives)

  for (const rule of CONFLICT_RULES) {
    const foundDirectives = rule.directives.filter(d => directiveNames.includes(d))

    if (rule.type === 'coverage' && foundDirectives.length >= 2) {
      conflicts.push({
        type: rule.type,
        severity: rule.severity,
        directives: foundDirectives,
        message: rule.message,
      })
    }

    if (rule.type === 'mutex' && foundDirectives.length >= 2) {
      conflicts.push({
        type: rule.type,
        severity: rule.severity,
        directives: foundDirectives,
        message: rule.message,
      })
    }

    if (rule.type === 'replacement' && foundDirectives.length >= 2) {
      conflicts.push({
        type: rule.type,
        severity: rule.severity,
        directives: foundDirectives,
        message: rule.message,
      })
    }
  }

  for (const [directiveName, directiveData] of Object.entries(parsedPolicy.directives)) {
    const directiveInfo = STANDARD_DIRECTIVES[directiveName]

    if (!directiveInfo) {
      continue
    }

    if (directiveName.endsWith('-src') || directiveName === 'default-src') {
      const hasNone = directiveData.sources.some(s => s.raw === "'none'")
      const hasOtherSources = directiveData.sources.some(s => s.raw !== "'none'")

      if (hasNone && hasOtherSources) {
        conflicts.push({
          type: 'source-conflict',
          severity: 'warning',
          directives: [directiveName],
          message: `${directiveName} 同时包含 'none' 和其他源，'none' 会被忽略`,
        })
      }

      const hasUnsafeInline = directiveData.sources.some(s => s.raw === "'unsafe-inline'")
      const hasHashOrNonce = directiveData.sources.some(
        s => s.parsed.type === 'hash' || s.parsed.type === 'nonce'
      )

      if (hasUnsafeInline && hasHashOrNonce) {
        conflicts.push({
          type: 'source-conflict',
          severity: 'info',
          directives: [directiveName],
          message: `${directiveName} 同时包含 'unsafe-inline' 和 hash/nonce，现代浏览器中 'unsafe-inline' 会被忽略`,
        })
      }

      const hasStrictDynamic = directiveData.sources.some(s => s.raw === "'strict-dynamic'")
      const hasSelfOrHosts = directiveData.sources.some(s =>
        s.raw === "'self'" || s.parsed.type === 'host' || s.parsed.type === 'scheme'
      )

      if (hasStrictDynamic && hasSelfOrHosts) {
        conflicts.push({
          type: 'source-conflict',
          severity: 'info',
          directives: [directiveName],
          message: `${directiveName} 包含 'strict-dynamic' 时，'self' 和主机源会在现代浏览器中被忽略`,
        })
      }
    }
  }

  return {
    conflicts,
    count: conflicts.length,
    bySeverity: {
      error: conflicts.filter(c => c.severity === 'error').length,
      warning: conflicts.filter(c => c.severity === 'warning').length,
      info: conflicts.filter(c => c.severity === 'info').length,
    },
  }
}

function checkSecurityIssues(parsedPolicy) {
  const issues = []
  const { directives } = parsedPolicy

  if (!directives['script-src'] && !directives['default-src']) {
    issues.push({
      type: 'missing-script-control',
      severity: 'error',
      message: '缺少 script-src 或 default-src 指令，脚本加载不受限制',
    })
  }

  if (directives['script-src']) {
    const hasUnsafeInline = directives['script-src'].sources.some(s => s.raw === "'unsafe-inline'")
    const hasUnsafeEval = directives['script-src'].sources.some(s => s.raw === "'unsafe-eval'")
    const hasHashOrNonce = directives['script-src'].sources.some(
      s => s.parsed.type === 'hash' || s.parsed.type === 'nonce'
    )

    if (hasUnsafeInline && !hasHashOrNonce) {
      issues.push({
        type: 'unsafe-inline-script',
        severity: 'warning',
        message: 'script-src 使用了 \'unsafe-inline\' 而没有 hash/nonce，存在 XSS 风险',
      })
    }

    if (hasUnsafeEval) {
      issues.push({
        type: 'unsafe-eval',
        severity: 'warning',
        message: 'script-src 使用了 \'unsafe-eval\'，存在代码注入风险',
      })
    }
  }

  if (!directives['object-src']) {
    issues.push({
      type: 'missing-object-control',
      severity: 'warning',
      message: '缺少 object-src 指令，插件加载不受限制，建议设置为 \'none\'',
    })
  } else {
    const isNone = directives['object-src'].sources.some(s => s.raw === "'none'")
    if (!isNone) {
      issues.push({
        type: 'loose-object-control',
        severity: 'info',
        message: 'object-src 未设置为 \'none\'，建议禁用插件以减少攻击面',
      })
    }
  }

  if (!directives['base-uri']) {
    issues.push({
      type: 'missing-base-uri',
      severity: 'warning',
      message: '缺少 base-uri 指令，可能被滥用修改基础 URL',
    })
  }

  if (!directives['form-action']) {
    issues.push({
      type: 'missing-form-action',
      severity: 'info',
      message: '缺少 form-action 指令，表单提交不受限制',
    })
  }

  if (!directives['frame-ancestors']) {
    issues.push({
      type: 'missing-frame-ancestors',
      severity: 'info',
      message: '缺少 frame-ancestors 指令，页面可能被嵌入到恶意网站中',
    })
  }

  if (!directives['report-uri'] && !directives['report-to']) {
    issues.push({
      type: 'missing-reporting',
      severity: 'info',
      message: '缺少 report-uri 或 report-to 指令，无法接收违规报告',
    })
  }

  return {
    issues,
    count: issues.length,
    bySeverity: {
      error: issues.filter(i => i.severity === 'error').length,
      warning: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
    },
  }
}

export {
  detectConflicts,
  checkSecurityIssues,
}
