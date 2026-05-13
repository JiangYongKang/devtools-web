import { PLATFORM, WINDOWS_RESERVED_NAMES, ERROR_CODES } from './constants.js'

const FORWARD_SLASH = '/'
const BACKSLASH = '\\'
const ALL_SEPARATORS_RE = /[\\/]/g

function detectPlatform(path, options) {
  if (options.strictPosix) return 'posix'
  if (options.platform === PLATFORM.POSIX) return 'posix'
  if (options.platform === PLATFORM.WINDOWS) return 'windows'

  const trimmed = path.trim()

  if (/^[a-zA-Z]:[\\/]/.test(trimmed)) return 'windows'
  if (/^\\\\/.test(trimmed)) return 'windows'
  if (/^\/\//.test(trimmed)) {
    return 'windows'
  }

  if (trimmed.startsWith('/')) return 'posix'
  if (trimmed.startsWith(BACKSLASH)) return 'windows'

  const hasBackslash = trimmed.includes(BACKSLASH)
  const hasForwardSlash = trimmed.includes(FORWARD_SLASH)

  if (hasBackslash && !hasForwardSlash) return 'windows'
  if (hasForwardSlash && !hasBackslash) return 'posix'

  return 'posix'
}

function getOutputSeparator(detectedPlatform, options) {
  if (options.platform === PLATFORM.POSIX || options.strictPosix) return FORWARD_SLASH
  if (options.platform === PLATFORM.WINDOWS) return BACKSLASH
  if (options.platform === PLATFORM.NEUTRAL) {
    return detectedPlatform === 'windows' ? BACKSLASH : FORWARD_SLASH
  }
  return FORWARD_SLASH
}

function normalizeDriveLetter(drive, shouldNormalize) {
  if (!drive) return drive
  if (!shouldNormalize) return drive
  return drive.toUpperCase()
}

function parseWindowsDrive(path) {
  const match = path.match(/^([a-zA-Z]):[\\/]?(.*)$/)
  if (match) {
    return {
      hasDrive: true,
      drive: match[1],
      remaining: match[2] || '',
    }
  }
  return { hasDrive: false, drive: null, remaining: path }
}

function parseUncPath(path) {
  const backslashUnc = /^\\\\([^\\/]+)[\\/]([^\\/]+)([\\/].*)?$/
  const forwardUnc = /^\/\/([^\\/]+)[\\/]([^\\/]+)([\\/].*)?$/

  let match = path.match(backslashUnc)
  if (!match) {
    match = path.match(forwardUnc)
  }

  if (match) {
    return {
      isUnc: true,
      server: match[1],
      share: match[2],
      remaining: match[3] || '',
    }
  }

  return { isUnc: false, server: null, share: null, remaining: path }
}

function splitToSegments(path, separator = FORWARD_SLASH) {
  const normalized = path.replace(ALL_SEPARATORS_RE, separator)
  return normalized.split(separator).filter((seg, idx, arr) => {
    if (idx === 0 && seg === '' && arr.length > 1) return true
    return seg !== ''
  })
}

function isWindowsReservedName(segment) {
  if (!segment) return false
  const upper = segment.toUpperCase()
  const base = upper.split('.')[0]
  return WINDOWS_RESERVED_NAMES.includes(base)
}

function hasTrailingDot(segment) {
  if (!segment) return false
  return segment.endsWith('.') && segment.length > 1
}

function isEmptySegment(segment) {
  return segment === ''
}

function resolveDots(segments, isAbsolute) {
  const result = []

  for (const seg of segments) {
    if (seg === '.' || seg === '') {
      continue
    } else if (seg === '..') {
      if (result.length > 0 && result[result.length - 1] !== '..') {
        result.pop()
      } else if (!isAbsolute) {
        result.push('..')
      }
    } else {
      result.push(seg)
    }
  }

  return result
}

function hasDangerousTraversal(segments) {
  return segments.includes('..')
}

function collapseEmptySegments(segments) {
  return segments.filter((seg, idx) => {
    if (idx === 0 && seg === '') return true
    return seg !== ''
  })
}

function splitExtension(filename, multiDot = false) {
  if (!filename) return { basename: '', ext: '' }

  if (multiDot) {
    const firstDotIndex = filename.indexOf('.')
    if (firstDotIndex <= 0) {
      return { basename: filename, ext: '' }
    }
    return {
      basename: filename.slice(0, firstDotIndex),
      ext: filename.slice(firstDotIndex),
    }
  } else {
    const lastDotIndex = filename.lastIndexOf('.')
    if (lastDotIndex <= 0) {
      return { basename: filename, ext: '' }
    }
    return {
      basename: filename.slice(0, lastDotIndex),
      ext: filename.slice(lastDotIndex),
    }
  }
}

function diagnoseSegments(segments, platform) {
  const diagnostics = []

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]

    if (isEmptySegment(seg) && i > 0) {
      diagnostics.push({
        type: 'empty_segment',
        segmentIndex: i,
        message: `第 ${i + 1} 段为空段`,
      })
    }

    if (platform === 'windows' && isWindowsReservedName(seg)) {
      diagnostics.push({
        type: 'reserved_name',
        segmentIndex: i,
        segment: seg,
        message: `段 "${seg}" 包含 Windows 保留文件名`,
      })
    }

    if (hasTrailingDot(seg)) {
      diagnostics.push({
        type: 'trailing_dot',
        segmentIndex: i,
        segment: seg,
        message: `段 "${seg}" 包含尾随点`,
      })
    }
  }

  return diagnostics
}

function parseSinglePath(rawPath, options = {}) {
  const path = rawPath || ''
  const trimmed = path.trim()

  const detectedPlatform = detectPlatform(trimmed, options)
  const outputSeparator = getOutputSeparator(detectedPlatform, options)

  const uncInfo = parseUncPath(trimmed)
  const driveInfo = uncInfo.isUnc ? { hasDrive: false, drive: null } : parseWindowsDrive(trimmed)

  let isAbsolute = false
  let root = ''
  let segments = []
  let normalizedSegments = []

  if (uncInfo.isUnc) {
    isAbsolute = true
    root = `\\\\${uncInfo.server}\\${uncInfo.share}`
    segments = splitToSegments(uncInfo.remaining, FORWARD_SLASH)
    if (segments.length > 0 && segments[0] === '') {
      segments.shift()
    }
  } else if (driveInfo.hasDrive) {
    isAbsolute = true
    const normalizedDrive = normalizeDriveLetter(driveInfo.drive, options.normalizeDriveCase)
    root = `${normalizedDrive}:${outputSeparator}`
    segments = splitToSegments(driveInfo.remaining, FORWARD_SLASH)
    if (segments.length > 0 && segments[0] === '') {
      segments.shift()
    }
  } else {
    isAbsolute = trimmed.startsWith('/') || trimmed.startsWith('\\')
    segments = splitToSegments(trimmed, FORWARD_SLASH)

    if (isAbsolute) {
      root = outputSeparator
      if (segments.length > 0 && segments[0] === '') {
        segments.shift()
      }
    } else {
      root = ''
    }
  }

  normalizedSegments = [...segments]

  if (options.collapseSeparators) {
    normalizedSegments = collapseEmptySegments(normalizedSegments)
  }

  if (options.resolveDots) {
    normalizedSegments = resolveDots(normalizedSegments, isAbsolute)
  }

  const isDangerous = options.rejectDangerous && hasDangerousTraversal(normalizedSegments)

  const diagnostics = diagnoseSegments(segments, detectedPlatform)

  const hasForwardSlash = path.includes(FORWARD_SLASH)
  const hasBackslash = path.includes(BACKSLASH)
  const isMixedSeparators = hasForwardSlash && hasBackslash

  let normalizedPath = ''
  if (uncInfo.isUnc) {
    normalizedPath = root
    if (normalizedSegments.length > 0) {
      normalizedPath += outputSeparator + normalizedSegments.join(outputSeparator)
    }
  } else if (driveInfo.hasDrive) {
    normalizedPath = root
    if (normalizedSegments.length > 0) {
      normalizedPath += normalizedSegments.join(outputSeparator)
    }
  } else if (isAbsolute) {
    if (normalizedSegments.length === 0) {
      normalizedPath = root
    } else {
      normalizedPath = root + normalizedSegments.join(outputSeparator)
    }
  } else {
    normalizedPath = normalizedSegments.join(outputSeparator)
    if (normalizedPath === '' && normalizedSegments.length === 0) {
      normalizedPath = '.'
    }
  }

  const basename = normalizedSegments.length > 0
    ? normalizedSegments[normalizedSegments.length - 1]
    : (uncInfo.isUnc ? uncInfo.share : (driveInfo.hasDrive ? '' : ''))

  const extInfo = splitExtension(basename, options.multiDotExtension)

  return {
    rawPath: path,
    trimmed,
    detectedPlatform,
    outputSeparator,
    isUnc: uncInfo.isUnc,
    uncServer: uncInfo.server,
    uncShare: uncInfo.share,
    hasDrive: driveInfo.hasDrive,
    drive: driveInfo.drive,
    normalizedDrive: normalizeDriveLetter(driveInfo.drive, options.normalizeDriveCase),
    isAbsolute,
    root,
    segments,
    normalizedSegments,
    normalizedPath,
    basename: extInfo.basename,
    ext: extInfo.ext,
    fullBasename: basename,
    diagnostics,
    isMixedSeparators,
    hasForwardSlash,
    hasBackslash,
    isDangerous,
    errorCode: isDangerous ? ERROR_CODES.DANGEROUS_TRAVERSAL : null,
    errorMessage: isDangerous ? '危险的目录穿越：规范化后仍残留 .. 段' : null,
  }
}

function computeDiff(original, normalized) {
  if (original === normalized) {
    return { segments: [{ text: normalized, type: 'same' }] }
  }

  const m = original.length
  const n = normalized.length

  const dp = new Array(m + 1)
  for (let i = 0; i <= m; i++) {
    dp[i] = new Array(n + 1).fill(0)
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (original[i - 1] === normalized[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const operations = []
  let i = m
  let j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && original[i - 1] === normalized[j - 1]) {
      operations.push({ char: original[i - 1], type: 'same' })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      operations.push({ char: normalized[j - 1], type: 'added' })
      j--
    } else if (i > 0) {
      operations.push({ char: original[i - 1], type: 'removed' })
      i--
    }
  }

  operations.reverse()

  const diffSegments = []
  let currentText = ''
  let currentType = null

  for (const op of operations) {
    if (op.type === currentType) {
      currentText += op.char
    } else {
      if (currentType) {
        diffSegments.push({ text: currentText, type: currentType })
      }
      currentText = op.char
      currentType = op.type
    }
  }

  if (currentType) {
    diffSegments.push({ text: currentText, type: currentType })
  }

  return { segments: diffSegments }
}

function highlightSeparators(path) {
  const segments = []
  let current = ''

  for (const char of path) {
    if (char === FORWARD_SLASH || char === BACKSLASH) {
      if (current) {
        segments.push({ text: current, type: 'path' })
        current = ''
      }
      segments.push({
        text: char,
        type: char === FORWARD_SLASH ? 'separator-forward' : 'separator-backward',
      })
    } else {
      current += char
    }
  }

  if (current) {
    segments.push({ text: current, type: 'path' })
  }

  return segments
}

function joinPaths(basePath, subPath, options = {}) {
  if (!basePath) return subPath || ''
  if (!subPath) return basePath

  const baseInfo = parseSinglePath(basePath, options)

  const separator = baseInfo.outputSeparator
  let base = basePath.trim()
  let sub = subPath.trim()

  if (base.endsWith(FORWARD_SLASH) || base.endsWith(BACKSLASH)) {
    base = base.slice(0, -1)
  }

  if (sub.startsWith(FORWARD_SLASH) || sub.startsWith(BACKSLASH)) {
    sub = sub.slice(1)
  }

  const combined = base + separator + sub
  return parseSinglePath(combined, options)
}

export {
  parseSinglePath,
  computeDiff,
  highlightSeparators,
  joinPaths,
  splitToSegments,
  resolveDots,
  collapseEmptySegments,
  isWindowsReservedName,
  hasTrailingDot,
  isEmptySegment,
  splitExtension,
  parseWindowsDrive,
  parseUncPath,
  detectPlatform,
  hasDangerousTraversal,
  normalizeDriveLetter,
}
