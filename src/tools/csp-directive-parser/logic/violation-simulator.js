import { getEffectiveDirectiveForType } from './directive-parser.js'
import { isNonceSource, isHashSource } from './source-matcher.js'

function simulateResourceLoad(parsedPolicy, resourceType, resourceUrl, documentUrl) {
  const effective = getEffectiveDirectiveForType(parsedPolicy, resourceType)
  const { directive, sources } = effective

  const resourceUrlObj = new URL(resourceUrl, documentUrl)
  const documentUrlObj = new URL(documentUrl)

  let allowed = false
  let blockedBy = null
  let matchDetails = []

  for (const source of sources) {
    const match = checkSourceMatch(source, resourceUrlObj, documentUrlObj)
    matchDetails.push({ source, ...match })

    if (match.allowed) {
      allowed = true
      break
    }
  }

  if (!allowed) {
    blockedBy = directive
  }

  return {
    allowed,
    blockedBy,
    effectiveDirective: directive,
    violatedDirective: blockedBy || directive,
    resourceType,
    resourceUrl: resourceUrlObj.href,
    documentUrl: documentUrlObj.href,
    matchDetails,
    fromFallback: effective.fromFallback,
    implicit: effective.implicit,
  }
}

function checkSourceMatch(source, resourceUrlObj, documentUrlObj) {
  if (source === "'none'") {
    return { allowed: false, reason: "'none' 明确禁止所有源" }
  }

  if (source === "'self'") {
    const sameOrigin = resourceUrlObj.origin === documentUrlObj.origin
    return {
      allowed: sameOrigin,
      reason: sameOrigin ? '同源匹配' : '不同源',
    }
  }

  if (source.endsWith(':') && !source.includes('/')) {
    const schemeMatch = resourceUrlObj.protocol === source
    return {
      allowed: schemeMatch,
      reason: schemeMatch ? `协议 ${source} 匹配` : `协议 ${resourceUrlObj.protocol} 不匹配 ${source}`,
    }
  }

  if (isNonceSource(source) || isHashSource(source)) {
    return {
      allowed: false,
      reason: 'nonce/hash 需要在实际执行时验证，此模拟不支持',
      requiresRuntime: true,
    }
  }

  if (source.startsWith("'") && source.endsWith("'")) {
    return {
      allowed: false,
      reason: `特殊源 ${source} 不适用于资源加载检查`,
    }
  }

  const match = matchHostSource(source, resourceUrlObj)
  return match
}

function matchHostSource(pattern, resourceUrlObj) {
  let schemePattern = null
  let hostPattern = null
  let pathPattern = null

  const schemeMatch = /^([a-z][a-z0-9+\-.]*):\/\//.exec(pattern.toLowerCase())
  if (schemeMatch) {
    schemePattern = schemeMatch[1] + ':'
    const rest = pattern.slice(schemeMatch[0].length)
    const pathIndex = rest.indexOf('/')
    if (pathIndex >= 0) {
      hostPattern = rest.slice(0, pathIndex)
      pathPattern = rest.slice(pathIndex)
    } else {
      hostPattern = rest
    }
  } else {
    const pathIndex = pattern.indexOf('/')
    if (pathIndex >= 0) {
      hostPattern = pattern.slice(0, pathIndex)
      pathPattern = pattern.slice(pathIndex)
    } else {
      hostPattern = pattern
    }
  }

  if (schemePattern && resourceUrlObj.protocol !== schemePattern) {
    return {
      allowed: false,
      reason: `协议不匹配: 期望 ${schemePattern}, 实际 ${resourceUrlObj.protocol}`,
    }
  }

  if (hostPattern) {
    const [hostOnly, portPattern] = hostPattern.split(':')
    const [resourceHost, resourcePort] = resourceUrlObj.host.split(':')

    if (!matchesHostPattern(hostOnly, resourceHost)) {
      return {
        allowed: false,
        reason: `主机不匹配: 期望 ${hostOnly}, 实际 ${resourceHost}`,
      }
    }

    if (portPattern) {
      const actualPort = resourcePort || (resourceUrlObj.protocol === 'https:' ? '443' : '80')
      if (portPattern !== actualPort) {
        return {
          allowed: false,
          reason: `端口不匹配: 期望 ${portPattern}, 实际 ${actualPort}`,
        }
      }
    }
  }

  if (pathPattern) {
    if (!matchesPathPattern(pathPattern, resourceUrlObj.pathname)) {
      return {
        allowed: false,
        reason: `路径不匹配: 期望 ${pathPattern}, 实际 ${resourceUrlObj.pathname}`,
      }
    }
  }

  return { allowed: true, reason: '源匹配成功' }
}

function matchesHostPattern(pattern, host) {
  const patternLower = pattern.toLowerCase()
  const hostLower = host.toLowerCase()

  if (patternLower === '*') {
    return true
  }

  if (patternLower.startsWith('*.')) {
    const domain = patternLower.slice(2)
    return hostLower === domain || hostLower.endsWith('.' + domain)
  }

  return patternLower === hostLower
}

function matchesPathPattern(pattern, path) {
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -1)
    return path === prefix.slice(0, -1) || path.startsWith(prefix)
  }

  if (pattern.endsWith('/')) {
    return path === pattern.slice(0, -1) || path.startsWith(pattern)
  }

  return pattern === path
}

function simulateInlineScript(parsedPolicy, scriptContent, hasNonce = false, nonceValue = null) {
  const effective = getEffectiveDirectiveForType(parsedPolicy, 'script')
  const { directive, sources } = effective

  let allowed = false
  let reasons = []

  const hasUnsafeInline = sources.includes("'unsafe-inline'")
  const hasHashOrNonce = sources.some(s => isNonceSource(s) || isHashSource(s))

  if (hasUnsafeInline && !hasHashOrNonce) {
    allowed = true
    reasons.push("'unsafe-inline' 允许内联脚本")
  } else if (hasHashOrNonce) {
    if (hasNonce && nonceValue) {
      const matchingNonce = sources.find(s => s === `'nonce-${nonceValue}'`)
      if (matchingNonce) {
        allowed = true
        reasons.push(`nonce 匹配成功: ${nonceValue}`)
      } else {
        reasons.push('nonce 值不匹配')
      }
    } else {
      reasons.push('需要 nonce 或 hash 才能允许内联脚本')
    }
  } else {
    reasons.push('没有允许内联脚本的规则')
  }

  return {
    allowed,
    type: 'inline-script',
    effectiveDirective: directive,
    violatedDirective: allowed ? null : directive,
    reasons,
    contentSample: scriptContent.slice(0, 40) + (scriptContent.length > 40 ? '...' : ''),
  }
}

function generateViolationReport(simulationResult, isReportOnly = false) {
  const report = {
    'csp-report': {
      'document-uri': simulationResult.documentUrl,
      'referrer': '',
      'violated-directive': simulationResult.violatedDirective,
      'effective-directive': simulationResult.effectiveDirective,
      'original-policy': '',
      'disposition': isReportOnly ? 'report' : 'enforce',
      'blocked-uri': simulationResult.resourceUrl || 'inline',
      'line-number': simulationResult.lineNumber || 1,
      'column-number': simulationResult.columnNumber || 1,
      'source-file': simulationResult.documentUrl,
      'status-code': 200,
      'script-sample': simulationResult.contentSample || '',
    },
  }

  return report
}

export {
  simulateResourceLoad,
  simulateInlineScript,
  generateViolationReport,
  checkSourceMatch,
  matchHostSource,
  matchesHostPattern,
  matchesPathPattern,
}
