import { SCHEME_SOURCES, HASH_ALGORITHMS, SPECIAL_SOURCES } from './constants.js'

function isSpecialSource(source) {
  return SPECIAL_SOURCES.hasOwnProperty(source)
}

function isSchemeSource(source) {
  return SCHEME_SOURCES.includes(source.toLowerCase())
}

function isNonceSource(source) {
  return /^'nonce-[A-Za-z0-9+/=]+'$/.test(source)
}

function isHashSource(source) {
  const match = /^'((?:sha256|sha384|sha512)-[A-Za-z0-9+/=]+)'$/.exec(source)
  if (!match) return false
  const [, hashValue] = match
  const algorithm = hashValue.split('-')[0]
  return HASH_ALGORITHMS.includes(algorithm)
}

function parseNonce(source) {
  if (!isNonceSource(source)) return null
  return source.slice(7, -1)
}

function parseHash(source) {
  if (!isHashSource(source)) return null
  const hashValue = source.slice(1, -1)
  const [algorithm, value] = hashValue.split('-', 2)
  return { algorithm, value }
}

function parseSource(source) {
  const lowerSource = source.toLowerCase()

  if (isSpecialSource(source)) {
    return { type: 'special', value: source, description: SPECIAL_SOURCES[source]?.description }
  }

  if (isNonceSource(source)) {
    return { type: 'nonce', value: parseNonce(source), raw: source }
  }

  if (isHashSource(source)) {
    const hash = parseHash(source)
    return { type: 'hash', ...hash, raw: source }
  }

  if (isSchemeSource(source)) {
    return { type: 'scheme', value: source }
  }

  const schemeMatch = /^([a-z][a-z0-9+\-.]*):(?:\/\/)?/.exec(lowerSource)
  if (schemeMatch) {
    const scheme = schemeMatch[1] + ':'
    const rest = lowerSource.slice(schemeMatch[0].length)
    const hostPathMatch = /^([^/]+)?(?:\/(.*))?$/.exec(rest)
    const [, host = '', path = ''] = hostPathMatch || []

    return {
      type: 'host',
      scheme,
      host: host || null,
      path: path ? '/' + path : null,
      raw: source,
    }
  }

  const hostOnlyMatch = /^([^/]+)?(?:\/(.*))?$/.exec(source)
  const [, host = '', path = ''] = hostOnlyMatch || []

  return {
    type: 'host',
    scheme: null,
    host: host || null,
    path: path ? '/' + path : null,
    raw: source,
  }
}

function matchesWildcardHost(patternHost, targetHost) {
  if (patternHost === '*') return true

  if (patternHost.startsWith('*.')) {
    const domain = patternHost.slice(2)
    return targetHost === domain || targetHost.endsWith('.' + domain)
  }

  return patternHost === targetHost
}

function matchesHost(patternHost, targetHost, patternPort, targetPort) {
  if (!patternHost) return true

  const [patternHostOnly, patternPortStr] = patternHost.split(':')
  const [targetHostOnly, targetPortStr] = targetHost.split(':')

  const actualPatternPort = patternPort !== undefined ? patternPort : (patternPortStr ? parseInt(patternPortStr, 10) : undefined)
  const actualTargetPort = targetPort !== undefined ? targetPort : (targetPortStr ? parseInt(targetPortStr, 10) : undefined)

  if (actualPatternPort !== undefined) {
    if (actualTargetPort === undefined) {
      if (!(actualPatternPort === 80 || actualPatternPort === 443)) {
        return false
      }
    } else if (actualPatternPort !== actualTargetPort) {
      return false
    }
  }

  return matchesWildcardHost(patternHostOnly.toLowerCase(), targetHostOnly.toLowerCase())
}

function matchesPath(patternPath, targetPath) {
  if (!patternPath || patternPath === '/') return true
  if (!targetPath) return patternPath === '/'

  if (patternPath.endsWith('/*')) {
    const prefix = patternPath.slice(0, -1)
    return targetPath === prefix.slice(0, -1) || targetPath.startsWith(prefix)
  }

  if (patternPath.endsWith('/')) {
    return targetPath === patternPath.slice(0, -1) || targetPath.startsWith(patternPath)
  }

  return patternPath === targetPath
}

function matchesScheme(patternScheme, targetScheme) {
  if (!patternScheme) return true
  return patternScheme.toLowerCase() === targetScheme.toLowerCase()
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

function matchSourceExpression(pattern, targetUrl) {
  const parsedPattern = parseSource(pattern)
  const targetUrlObj = new URL(targetUrl)

  if (parsedPattern.type === 'special') {
    if (parsedPattern.value === "'self'") {
      return targetUrlObj.origin === new URL(targetUrl).origin
    }
    if (parsedPattern.value === "'none'") {
      return false
    }
    return false
  }

  if (parsedPattern.type === 'scheme') {
    return matchesScheme(parsedPattern.value, targetUrlObj.protocol)
  }

  if (parsedPattern.type === 'host') {
    if (!matchesScheme(parsedPattern.scheme, targetUrlObj.protocol)) {
      return false
    }
    if (!matchesHost(parsedPattern.host, targetUrlObj.host)) {
      return false
    }
    if (!matchesPath(parsedPattern.path, targetUrlObj.pathname)) {
      return false
    }
    return true
  }

  return false
}

function validateSourceSyntax(source) {
  const errors = []
  const warnings = []

  if (source.startsWith("'") && source.endsWith("'")) {
    if (isSpecialSource(source)) {
      return { valid: true, errors, warnings }
    }
    if (isNonceSource(source)) {
      const nonce = parseNonce(source)
      if (nonce.length < 16) {
        warnings.push('nonce 长度建议至少 128 位 (16 字节 base64)')
      }
      return { valid: true, errors, warnings }
    }
    if (isHashSource(source)) {
      return { valid: true, errors, warnings }
    }
    errors.push(`未知的特殊源: ${source}`)
    return { valid: false, errors, warnings }
  }

  if (source.endsWith(':') && !isSchemeSource(source)) {
    warnings.push(`可能是未知的协议源: ${source}`)
  }

  const parsed = parseSource(source)
  if (parsed.type === 'host' && parsed.host) {
    if (parsed.host.includes('*') && !parsed.host.startsWith('*.')) {
      errors.push('通配符只能用于子域名前缀，如 *.example.com')
      return { valid: false, errors, warnings }
    }
  }

  return { valid: true, errors, warnings }
}

export {
  isSpecialSource,
  isSchemeSource,
  isNonceSource,
  isHashSource,
  parseNonce,
  parseHash,
  parseSource,
  matchesWildcardHost,
  matchesHost,
  matchesPath,
  matchesScheme,
  matchesHostPattern,
  matchesPathPattern,
  matchSourceExpression,
  validateSourceSyntax,
}
