import {
  MODE,
  QUERY_HASH_POLICY,
  WARNING_LEVEL,
  MAX_SEGMENTS_PER_GROUP,
  MAX_SINGLE_SEGMENT_LENGTH,
  MAX_TOTAL_LENGTH,
  DEFAULT_SCHEME_PORTS,
  DANGEROUS_SCHEMES,
  WINDOWS_RESERVED_NAMES,
} from './constants.js'
import { ERROR_CODES, createError, createWarning } from './errors.js'

const URL_SCHEME_REGEX = /^([a-zA-Z][a-zA-Z0-9+\-.]*:)/
const WINDOWS_DRIVE_REGEX = /^[A-Za-z]:/
const UNC_REGEX = /^(\\\\|\/\/)/

function isWindowsDriveScheme(segment) {
  if (!WINDOWS_DRIVE_REGEX.test(segment)) return false
  const afterColon = segment.substring(2)
  return afterColon.length === 0 || afterColon.startsWith('\\') || afterColon.startsWith('/')
}

function detectMode(segments) {
  for (const segment of segments) {
    if (!segment) continue
    if (UNC_REGEX.test(segment)) return MODE.WINDOWS_ONLY
    if (isWindowsDriveScheme(segment)) return MODE.WINDOWS_ONLY
    if (segment.includes('\\')) return MODE.WINDOWS_ONLY
    if (URL_SCHEME_REGEX.test(segment)) return MODE.URL_ONLY
    if (segment.startsWith('/')) return MODE.POSIX_ONLY
  }
  return MODE.POSIX_ONLY
}

function normalizePercentEncoding(str) {
  try {
    return str.replace(/%[0-9a-fA-F]{2}/g, (match) => {
      const hex = match.substring(1).toUpperCase()
      if (hex === '2B') return '+'
      return '%' + hex
    }).replace(/\+/g, '%20')
  } catch {
    return str
  }
}

function encodeUrlSegment(segment) {
  try {
    return encodeURIComponent(segment)
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A')
  } catch {
    return segment
  }
}

function decodeUrlSegment(segment) {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

function parseUrlSegment(segment) {
  const schemeMatch = segment.match(URL_SCHEME_REGEX)
  if (!schemeMatch) return null

  const scheme = schemeMatch[1].toLowerCase()
  const rest = segment.substring(scheme.length)

  const hashIndex = rest.indexOf('#')
  const queryIndex = rest.indexOf('?')

  let authority = rest
  let query = ''
  let hash = ''

  if (hashIndex !== -1) {
    hash = rest.substring(hashIndex)
    authority = rest.substring(0, hashIndex)
  }

  if (queryIndex !== -1 && queryIndex < (hashIndex === -1 ? rest.length : hashIndex)) {
    query = rest.substring(queryIndex, hashIndex === -1 ? undefined : hashIndex)
    authority = rest.substring(0, queryIndex)
  }

  return {
    scheme,
    authority: authority.startsWith('//') ? authority : '//' + authority,
    query,
    hash,
  }
}

function collapseSlashes(str) {
  return str.replace(/([^:])\/{2,}/g, '$1/')
}

function buildUrlFromParts(parsed, pathSegments, options) {
  const { stripDefaultPort, queryHashPolicy, normalizePercentEncoding: normalizeEnc, collapseRepeated } = options

  let result = parsed.scheme + parsed.authority

  const defaultPort = DEFAULT_SCHEME_PORTS[parsed.scheme.toLowerCase()]
  if (stripDefaultPort && defaultPort) {
    result = result.replace(new RegExp(`:${defaultPort}(?=/|$|\\?)`), '')
  }

  if (pathSegments.length > 0) {
    const encodedSegments = pathSegments.map((s, idx) => {
      if (idx === 0 && s.startsWith('/')) {
        const decoded = decodeUrlSegment(s.substring(1))
        return '/' + encodeUrlSegment(decoded)
      }
      const decoded = decodeUrlSegment(s)
      return encodeUrlSegment(decoded)
    })

    let path = encodedSegments.join('/')
    if (path && !path.startsWith('/')) {
      path = '/' + path
    }
    result += path
  }

  if (collapseRepeated) {
    result = collapseSlashes(result)
  }

  if (queryHashPolicy === QUERY_HASH_POLICY.PRESERVE || queryHashPolicy === QUERY_HASH_POLICY.MERGE_LAST) {
    result += parsed.query
    result += parsed.hash
  }

  if (normalizeEnc) {
    result = normalizePercentEncoding(result)
  }

  return result
}

function joinPathSegments(segments, separator, options) {
  const { resolveDotDot, collapseRepeated, preserveTrailingSlash, forceAbsoluteRoot } = options

  let hasTrailingSlash = segments.length > 0 && segments[segments.length - 1].endsWith(separator)

  let parts = []
  for (const segment of segments) {
    if (!segment) continue
    const splitParts = segment.split(new RegExp(`[\\\\/]`)).filter(p => p !== '')
    parts = parts.concat(splitParts)
  }

  const warnings = []

  if (resolveDotDot) {
    const stack = []
    let traversalDetected = false

    for (const part of parts) {
      if (part === '..') {
        if (stack.length > 0) {
          stack.pop()
        } else {
          traversalDetected = true
        }
      } else if (part !== '.') {
        stack.push(part)
      }
    }

    if (traversalDetected) {
      warnings.push(createWarning(
        ERROR_CODES.TRAVERSAL_DETECTED,
        { message: '解析后发现路径穿越痕迹' },
        WARNING_LEVEL.WARNING
      ))
    }

    parts = stack
  }

  let result = ''

  if (forceAbsoluteRoot) {
    result = separator
  }

  if (collapseRepeated) {
    result += parts.filter(p => p !== '').join(separator)
  } else {
    result += parts.join(separator)
  }

  if (preserveTrailingSlash && hasTrailingSlash && result && !result.endsWith(separator)) {
    result += separator
  }

  return { result, warnings }
}

function hasTraversalSegment(segment) {
  if (segment === '..') return true
  if (segment.startsWith('..\\') || segment.startsWith('../')) return true
  if (segment.endsWith('\\..') || segment.endsWith('/..')) return true
  if (segment.includes('\\..\\') || segment.includes('/../')) return true
  return false
}

function joinWindowsPath(segments, options) {
  const { rejectWindowsReserved, forceAbsoluteRoot, rejectTraversal } = options
  const warnings = []

  if (rejectTraversal) {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      if (hasTraversalSegment(seg)) {
        warnings.push(createError(
          ERROR_CODES.TRAVERSAL_DETECTED,
          { segment: seg, index: i },
          WARNING_LEVEL.ERROR
        ))
      }
    }
  }

  let prefix = ''
  let remainingSegments = [...segments]

  if (segments.length > 0 && UNC_REGEX.test(segments[0])) {
    const first = segments[0]
    if (first.length > 2 && first[2] !== '\\' && first[2] !== '/') {
      warnings.push(createWarning(
        ERROR_CODES.SUSPICIOUS_UNC_PREFIX,
        { segment: first },
        WARNING_LEVEL.WARNING
      ))
    }

    const firstNormalized = first.replace(/\//g, '\\')
    const uncMatch = firstNormalized.match(/^(\\\\)([^\\]+)(?:\\([^\\]+))?(.*)$/)
    
    if (uncMatch) {
      const [, , server, share, rest] = uncMatch
      prefix = `\\\\${server}`
      if (share) {
        prefix += `\\${share}`
      }
      remainingSegments = [rest.substring(1), ...segments.slice(1)]
    } else {
      prefix = '\\\\'
      remainingSegments = [first.substring(2), ...segments.slice(1)]
    }
  } else if (segments.length > 0 && WINDOWS_DRIVE_REGEX.test(segments[0])) {
    const first = segments[0]
    const driveLetter = first[0].toUpperCase()
    if (driveLetter !== first[0]) {
      warnings.push(createWarning(
        ERROR_CODES.SUSPICIOUS_DRIVE_LETTER,
        { original: first[0], normalized: driveLetter },
        WARNING_LEVEL.INFO
      ))
    }
    prefix = `${driveLetter}:\\`
    remainingSegments = [first.substring(2), ...segments.slice(1)]
  } else if (forceAbsoluteRoot) {
    prefix = 'C:\\'
  }

  const filteredSegments = remainingSegments.filter(s => s && s.length > 0)

  if (rejectWindowsReserved) {
    for (const segment of filteredSegments) {
      const parts = segment.split(/[\\/]/)
      for (const part of parts) {
        const baseName = part.split('.')[0].toUpperCase()
        if (WINDOWS_RESERVED_NAMES.has(baseName)) {
          warnings.push(createError(
            ERROR_CODES.WINDOWS_RESERVED_NAME,
            { segment: part, reservedName: baseName },
            WARNING_LEVEL.ERROR
          ))
        }
      }
    }
  }

  const { result, warnings: pathWarnings } = joinPathSegments(filteredSegments, '\\', options)

  let finalResult = prefix
  if (result) {
    if (prefix && !prefix.endsWith('\\') && !result.startsWith('\\')) {
      finalResult += '\\'
    }
    finalResult += result
  }

  return { result: finalResult, warnings: [...warnings, ...pathWarnings] }
}

function joinPosixPath(segments, options) {
  const warnings = []
  const { rejectTraversal } = options

  if (rejectTraversal) {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      if (hasTraversalSegment(seg)) {
        warnings.push(createError(
          ERROR_CODES.TRAVERSAL_DETECTED,
          { segment: seg, index: i },
          WARNING_LEVEL.ERROR
        ))
      }
    }
  }

  let prefix = ''
  let remainingSegments = [...segments]

  if (segments.length > 0 && segments[0].startsWith('/')) {
    prefix = '/'
    remainingSegments = [segments[0].substring(1), ...segments.slice(1)]
  } else if (options.forceAbsoluteRoot) {
    prefix = '/'
  }

  const filteredSegments = remainingSegments.filter(s => s && s.length > 0)
  const { result, warnings: pathWarnings } = joinPathSegments(filteredSegments, '/', options)

  const finalResult = prefix + result

  return { result: finalResult, warnings: [...warnings, ...pathWarnings] }
}

function joinUrl(segments, options) {
  const warnings = []
  const { queryHashPolicy, rejectDangerousSchemes, allowFileScheme, rejectTraversal } = options

  if (segments.length === 0) {
    return { result: '', warnings: [] }
  }

  const firstSegment = segments[0]
  const parsedUrl = parseUrlSegment(firstSegment)

  if (!parsedUrl) {
    warnings.push(createError(ERROR_CODES.INVALID_URL, { segment: firstSegment }))
    return { result: '', warnings }
  }

  const schemeLower = parsedUrl.scheme.toLowerCase()
  if (rejectDangerousSchemes) {
    if (DANGEROUS_SCHEMES.has(schemeLower)) {
      if (schemeLower === 'file:' && allowFileScheme) {
        warnings.push(createWarning(
          ERROR_CODES.DANGEROUS_SCHEME,
          { scheme: schemeLower, message: '已允许 file: scheme，但请注意安全风险' },
          WARNING_LEVEL.WARNING
        ))
      } else {
        warnings.push(createError(
          ERROR_CODES.DANGEROUS_SCHEME,
          { scheme: schemeLower },
          WARNING_LEVEL.CRITICAL
        ))
        return { result: '', warnings }
      }
    }
  }

  const pathSegments = segments.slice(1)

  if (rejectTraversal) {
    for (const seg of pathSegments) {
      if (hasTraversalSegment(seg)) {
        warnings.push(createError(
          ERROR_CODES.TRAVERSAL_DETECTED,
          { segment: seg },
          WARNING_LEVEL.ERROR
        ))
        return { result: '', warnings }
      }
    }
  }

  let query = parsedUrl.query
  let hash = parsedUrl.hash

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i]
    const qIdx = seg.indexOf('?')
    const hIdx = seg.indexOf('#')

    if (queryHashPolicy === QUERY_HASH_POLICY.MERGE_LAST) {
      if (hIdx !== -1) {
        hash = seg.substring(hIdx)
        segments[i] = seg.substring(0, hIdx)
      }
      if (qIdx !== -1 && (hIdx === -1 || qIdx < hIdx)) {
        query = seg.substring(qIdx, hIdx === -1 ? undefined : hIdx)
        segments[i] = seg.substring(0, qIdx)
      }
    }
  }

  const updatedParsedUrl = { ...parsedUrl, query, hash }
  const result = buildUrlFromParts(updatedParsedUrl, pathSegments, options)

  return { result, warnings }
}

function validateSegments(segments, options = {}) {
  const warnings = []
  const errors = []

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (seg == null || seg === '') {
      warnings.push(createWarning(
        ERROR_CODES.EMPTY_SEGMENT,
        { index: i },
        WARNING_LEVEL.INFO
      ))
    } else if (typeof seg === 'string' && seg.trim().length === 0) {
      warnings.push(createWarning(
        ERROR_CODES.WHITESPACE_ONLY,
        { index: i },
        WARNING_LEVEL.INFO
      ))
    }
  }

  if (segments.length > MAX_SEGMENTS_PER_GROUP) {
    errors.push(createError(ERROR_CODES.TOO_MANY_SEGMENTS, {
      count: segments.length,
      max: MAX_SEGMENTS_PER_GROUP,
    }))
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (seg && seg.length > MAX_SINGLE_SEGMENT_LENGTH) {
      errors.push(createError(ERROR_CODES.SEGMENT_TOO_LONG, {
        index: i,
        length: seg.length,
        max: MAX_SINGLE_SEGMENT_LENGTH,
      }))
    }
  }

  const totalLength = segments.reduce((sum, s) => sum + (s ? s.length : 0), 0)
  if (totalLength > MAX_TOTAL_LENGTH) {
    errors.push(createError(ERROR_CODES.TOTAL_TOO_LONG, {
      length: totalLength,
      max: MAX_TOTAL_LENGTH,
    }))
  }

  return { warnings, errors }
}

function joinSafe(segments, options = {}) {
  const diagnostics = []
  const filteredSegments = segments.filter(s => s != null && s !== '')

  diagnostics.push({
    step: '输入验证',
    segments: [...segments],
    message: `共 ${segments.length} 个片段，${filteredSegments.length} 个非空`,
  })

  const validation = validateSegments(segments, options)
  const allIssues = [...validation.warnings, ...validation.errors]
  
  if (validation.errors.length > 0) {
    return {
      success: false,
      result: null,
      errors: validation.errors,
      warnings: validation.warnings,
      diagnostics: [
        ...diagnostics,
        { step: '验证失败', issues: allIssues, message: '存在验证错误，停止处理' },
      ],
    }
  }

  let effectiveMode = options.mode
  if (effectiveMode === MODE.AUTO_DETECT) {
    effectiveMode = detectMode(filteredSegments)
    diagnostics.push({
      step: '模式检测',
      detectedMode: effectiveMode,
      message: `自动检测为 ${effectiveMode} 模式`,
    })
  }

  if (options.diagnosticMode) {
    diagnostics.push({
      step: '模式确认',
      mode: effectiveMode,
      options: { ...options },
    })
  }

  let joinResult
  let joinDiagnostics = []

  try {
    switch (effectiveMode) {
      case MODE.URL_ONLY:
        joinDiagnostics.push({ step: 'URL 解析开始', input: filteredSegments[0] })
        joinResult = joinUrl(filteredSegments, options)
        joinDiagnostics.push({ step: 'URL 构建完成', result: joinResult.result })
        break

      case MODE.WINDOWS_ONLY:
        joinDiagnostics.push({ step: 'Windows 路径解析开始' })
        joinResult = joinWindowsPath(filteredSegments, options)
        joinDiagnostics.push({ step: 'Windows 路径构建完成', result: joinResult.result })
        break

      case MODE.POSIX_ONLY:
      default:
        joinDiagnostics.push({ step: 'POSIX 路径解析开始' })
        joinResult = joinPosixPath(filteredSegments, options)
        joinDiagnostics.push({ step: 'POSIX 路径构建完成', result: joinResult.result })
        break
    }
  } catch (err) {
    return {
      success: false,
      result: null,
      errors: [createError('INTERNAL_ERROR', { message: err.message })],
      warnings: [],
      diagnostics: [...diagnostics, ...joinDiagnostics, { step: '处理异常', error: err.message }],
    }
  }

  const allWarnings = [...validation.warnings, ...joinResult.warnings]
  const criticalErrors = allWarnings.filter(w => w.level === WARNING_LEVEL.CRITICAL)
  const errors = allWarnings.filter(w => w.level === WARNING_LEVEL.ERROR)

  if (criticalErrors.length > 0 || errors.length > 0) {
    return {
      success: false,
      result: joinResult.result,
      errors: [...criticalErrors, ...errors],
      warnings: allWarnings.filter(w => w.level !== WARNING_LEVEL.CRITICAL && w.level !== WARNING_LEVEL.ERROR),
      diagnostics: [...diagnostics, ...joinDiagnostics, {
        step: '安全检查不通过',
        issues: [...criticalErrors, ...errors],
        message: '存在安全问题，输出被拒绝',
      }],
    }
  }

  return {
    success: true,
    result: joinResult.result,
    errors: [],
    warnings: allWarnings,
    diagnostics: [...diagnostics, ...joinDiagnostics, {
      step: '完成',
      finalResult: joinResult.result,
      message: '处理成功',
    }],
  }
}

export {
  detectMode,
  normalizePercentEncoding,
  encodeUrlSegment,
  decodeUrlSegment,
  parseUrlSegment,
  joinSafe,
  joinUrl,
  joinWindowsPath,
  joinPosixPath,
  validateSegments,
}
