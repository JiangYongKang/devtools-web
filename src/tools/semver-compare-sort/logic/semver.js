import { ERROR_CODES, MAX_SAFE_INTEGER, createError } from './errors.js'
import { PRERELEASE_KEYWORD_PRIORITY } from './constants.js'

const SEMVER_REGEX = /^[vV]?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+((?:[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)))?$/

function parseVersion(versionStr) {
  if (versionStr == null || versionStr === '') {
    return {
      valid: false,
      errorCode: ERROR_CODES.EMPTY_VERSION_SEGMENT,
      error: createError(ERROR_CODES.EMPTY_VERSION_SEGMENT, { position: 'version' }),
    }
  }

  const trimmed = String(versionStr).trim()

  if (trimmed === '') {
    return {
      valid: false,
      errorCode: ERROR_CODES.EMPTY_VERSION_SEGMENT,
      error: createError(ERROR_CODES.EMPTY_VERSION_SEGMENT, { position: 'version' }),
    }
  }

  const match = SEMVER_REGEX.exec(trimmed)

  if (!match) {
    return {
      valid: false,
      errorCode: ERROR_CODES.INVALID_SEMVER,
      error: createError(ERROR_CODES.INVALID_SEMVER, { input: trimmed }),
    }
  }

  const [, majorStr, minorStr, patchStr, prereleaseStr, buildStr] = match

  const major = parseInt(majorStr, 10)
  const minor = parseInt(minorStr, 10)
  const patch = parseInt(patchStr, 10)

  if (major > MAX_SAFE_INTEGER || minor > MAX_SAFE_INTEGER || patch > MAX_SAFE_INTEGER) {
    return {
      valid: false,
      errorCode: ERROR_CODES.VERSION_NUMBER_TOO_LARGE,
      error: createError(ERROR_CODES.VERSION_NUMBER_TOO_LARGE, {
        max: MAX_SAFE_INTEGER,
        values: { major, minor, patch },
      }),
    }
  }

  let prerelease = null
  let prereleaseTokens = []
  if (prereleaseStr != null) {
    prerelease = prereleaseStr
    prereleaseTokens = prereleaseStr.split('.').map((token) => {
      const isNumeric = /^\d+$/.test(token)
      if (isNumeric) {
        const num = parseInt(token, 10)
        if (num > MAX_SAFE_INTEGER) {
          return { type: 'numeric', value: token, overflow: true }
        }
        return { type: 'numeric', value: num }
      }
      return { type: 'alpha', value: token }
    })
  }

  let build = null
  let buildTokens = []
  if (buildStr != null) {
    build = buildStr
    buildTokens = buildStr.split('.')
  }

  const normalized = `${major}.${minor}.${patch}` +
    (prerelease ? `-${prerelease}` : '') +
    (build ? `+${build}` : '')

  return {
    valid: true,
    original: trimmed,
    major,
    minor,
    patch,
    prerelease,
    prereleaseTokens,
    build,
    buildTokens,
    normalized,
    hasV: trimmed.startsWith('v') || trimmed.startsWith('V'),
  }
}

function compareIdentifiers(a, b) {
  const aIsNum = a.type === 'numeric' && !a.overflow
  const bIsNum = b.type === 'numeric' && !b.overflow

  if (aIsNum && bIsNum) {
    if (a.value < b.value) return -1
    if (a.value > b.value) return 1
    return 0
  }

  if (aIsNum) return -1
  if (bIsNum) return 1

  if (a.value < b.value) return -1
  if (a.value > b.value) return 1
  return 0
}

function getKeywordPriority(token) {
  if (token.type !== 'alpha') return null
  const lower = token.value.toLowerCase()
  if (PRERELEASE_KEYWORD_PRIORITY.hasOwnProperty(lower)) {
    return PRERELEASE_KEYWORD_PRIORITY[lower]
  }
  return null
}

function comparePrerelease(aTokens, bTokens) {
  if (aTokens.length === 0 && bTokens.length === 0) return 0
  if (aTokens.length === 0) return 1
  if (bTokens.length === 0) return -1

  const len = Math.max(aTokens.length, bTokens.length)

  for (let i = 0; i < len; i++) {
    const aTok = aTokens[i]
    const bTok = bTokens[i]

    if (aTok == null) return -1
    if (bTok == null) return 1

    const aPriority = getKeywordPriority(aTok)
    const bPriority = getKeywordPriority(bTok)

    if (aPriority != null && bPriority != null) {
      if (aPriority < bPriority) return -1
      if (aPriority > bPriority) return 1
    }

    const cmp = compareIdentifiers(aTok, bTok)
    if (cmp !== 0) return cmp
  }

  return 0
}

function compareBuild(aTokens, bTokens) {
  const len = Math.max(aTokens.length, bTokens.length)

  for (let i = 0; i < len; i++) {
    const aTok = aTokens[i]
    const bTok = bTokens[i]

    if (aTok == null) return -1
    if (bTok == null) return 1

    const aIsNum = /^\d+$/.test(aTok)
    const bIsNum = /^\d+$/.test(bTok)

    if (aIsNum && bIsNum) {
      const aNum = parseInt(aTok, 10)
      const bNum = parseInt(bTok, 10)
      if (aNum < bNum) return -1
      if (aNum > bNum) return 1
    } else if (aIsNum) {
      return -1
    } else if (bIsNum) {
      return 1
    } else {
        if (aTok < bTok) return -1
        if (aTok > bTok) return 1
      }
  }

  return 0
}

function compareVersions(a, b, options = {}) {
  const { includeBuild = false } = options

  if (a == null || b == null) {
    throw new Error('Cannot compare null versions')
  }

  if (a.major !== b.major) {
    return a.major < b.major ? -1 : 1
  }
  if (a.minor !== b.minor) {
    return a.minor < b.minor ? -1 : 1
  }
  if (a.patch !== b.patch) {
    return a.patch < b.patch ? -1 : 1
  }

  const prereleaseCmp = comparePrerelease(a.prereleaseTokens, b.prereleaseTokens)
  if (prereleaseCmp !== 0) return prereleaseCmp

  if (includeBuild) {
    return compareBuild(a.buildTokens, b.buildTokens)
  }

  return 0
}

function isLessThan(a, b, options = {}) {
  return compareVersions(a, b, options) < 0
}

function isGreaterThan(a, b, options = {}) {
  return compareVersions(a, b, options) > 0
}

function isEqual(a, b, options = {}) {
  return compareVersions(a, b, options) === 0
}

export {
  SEMVER_REGEX,
  parseVersion,
  compareVersions,
  comparePrerelease,
  compareBuild,
  isLessThan,
  isGreaterThan,
  isEqual,
}
