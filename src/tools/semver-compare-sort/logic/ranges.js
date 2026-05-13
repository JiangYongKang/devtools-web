import { ERROR_CODES, createError } from './errors.js'
import { parseVersion, compareVersions } from './semver.js'

function cleanRangeVersion(rangeVersion) {
  const match = /^([\^~<>]=?|=)?\s*(.*)$/.exec(rangeVersion)
  return {
    operator: match[1] || '=',
    version: match[2] || rangeVersion,
  }
}

function parseRange(rangeStr) {
  if (rangeStr == null || rangeStr === '') {
    return {
      valid: false,
      errorCode: ERROR_CODES.INVALID_RANGE,
      error: createError(ERROR_CODES.INVALID_RANGE, { reason: 'empty' }),
    }
  }

  const trimmed = String(rangeStr).trim()

  if (trimmed === '') {
    return {
      valid: false,
      errorCode: ERROR_CODES.INVALID_RANGE,
      error: createError(ERROR_CODES.INVALID_RANGE, { reason: 'empty' }),
    }
  }

  const { operator, version: versionPart } = cleanRangeVersion(trimmed)
  const parsed = parseVersion(versionPart)

  if (!parsed.valid) {
    return {
      valid: false,
      errorCode: ERROR_CODES.INVALID_RANGE,
      error: createError(ERROR_CODES.INVALID_RANGE, {
        reason: 'invalid_version',
        innerError: parsed.error,
      }),
      operator,
    }
  }

  let minVersion = null
  let maxVersion = null
  let description = ''

  switch (operator) {
    case '^': {
      minVersion = parsed
      let newMajor = parsed.major
      let newMinor = parsed.minor
      let newPatch = parsed.patch

      if (parsed.major !== 0) {
        newMajor = parsed.major + 1
        newMinor = 0
        newPatch = 0
      } else if (parsed.minor !== 0) {
        newMinor = parsed.minor + 1
        newPatch = 0
      } else {
        newPatch = parsed.patch + 1
      }

      maxVersion = {
        ...parsed,
        major: newMajor,
        minor: newMinor,
        patch: newPatch,
        prerelease: null,
        prereleaseTokens: [],
        build: null,
        buildTokens: [],
      }
      description = `兼容范围：>= ${parsed.normalized} 且 < ${newMajor}.${newMinor}.${newPatch}`
      break
    }

    case '~': {
      minVersion = parsed
      const nextMinor = parsed.minor + 1
      maxVersion = {
        ...parsed,
        minor: nextMinor,
        patch: 0,
        prerelease: null,
        prereleaseTokens: [],
        build: null,
        buildTokens: [],
      }
      description = `补丁范围：>= ${parsed.normalized} 且 < ${parsed.major}.${nextMinor}.0`
      break
    }

    case '>': {
      minVersion = parsed
      maxVersion = null
      description = `严格大于：> ${parsed.normalized}`
      break
    }

    case '>=': {
      minVersion = parsed
      maxVersion = null
      description = `大于等于：>= ${parsed.normalized}`
      break
    }

    case '<': {
      minVersion = null
      maxVersion = parsed
      description = `严格小于：< ${parsed.normalized}`
      break
    }

    case '<=': {
      minVersion = null
      maxVersion = parsed
      description = `小于等于：<= ${parsed.normalized}`
      break
    }

    case '=':
    default: {
      minVersion = parsed
      maxVersion = { ...parsed }
      description = `精确匹配：= ${parsed.normalized}`
      break
    }
  }

  return {
    valid: true,
    original: trimmed,
    operator,
    minVersion,
    maxVersion,
    description,
    baseVersion: parsed,
  }
}

function satisfiesRange(version, range, options = {}) {
  if (!range.valid) {
    return {
      satisfies: false,
      reason: 'invalid_range',
    }
  }

  if (!version.valid) {
    return {
      satisfies: false,
      reason: 'invalid_version',
    }
  }

  const includeBuild = options.includeBuild || false

  if (range.minVersion != null) {
    const cmp = compareVersions(version, range.minVersion, { includeBuild })
    if (range.operator === '>') {
      if (cmp <= 0) {
        return {
          satisfies: false,
          reason: 'below_min_strict',
          comparison: cmp,
        }
      }
    } else {
      if (cmp < 0) {
        return {
          satisfies: false,
          reason: 'below_min',
          comparison: cmp,
        }
      }
    }
  }

  if (range.maxVersion != null) {
    const cmp = compareVersions(version, range.maxVersion, { includeBuild })
    if (range.operator === '=') {
      const minCmp = compareVersions(version, range.minVersion, { includeBuild })
      if (minCmp !== 0) {
        return {
          satisfies: false,
          reason: 'not_exact_match',
          comparison: minCmp,
        }
      }
    } else if (range.operator === '<') {
      if (cmp >= 0) {
        return {
          satisfies: false,
          reason: 'above_max_strict',
          comparison: cmp,
        }
      }
    } else if (range.operator === '<=') {
      if (cmp > 0) {
        return {
          satisfies: false,
          reason: 'above_max',
          comparison: cmp,
        }
      }
    } else if (range.operator === '^' || range.operator === '~') {
      if (cmp >= 0) {
        return {
          satisfies: false,
          reason: 'at_or_above_max',
          comparison: cmp,
        }
      }
    }
  }

  return {
    satisfies: true,
    reason: 'within_range',
  }
}

function findMaxInRange(versions, range, options = {}) {
  const includeBuild = options.includeBuild || false
  let maxValid = null

  for (const v of versions) {
    if (!v.valid) continue

    const result = satisfiesRange(v, range, { includeBuild })
    if (result.satisfies) {
      if (maxValid == null) {
        maxValid = v
      } else {
        const cmp = compareVersions(v, maxValid, { includeBuild })
        if (cmp > 0) {
          maxValid = v
        }
      }
    }
  }

  return maxValid
}

function findMinInRange(versions, range, options = {}) {
  const includeBuild = options.includeBuild || false
  let minValid = null

  for (const v of versions) {
    if (!v.valid) continue

    const result = satisfiesRange(v, range, { includeBuild })
    if (result.satisfies) {
      if (minValid == null) {
        minValid = v
      } else {
        const cmp = compareVersions(v, minValid, { includeBuild })
        if (cmp < 0) {
          minValid = v
        }
      }
    }
  }

  return minValid
}

export {
  cleanRangeVersion,
  parseRange,
  satisfiesRange,
  findMaxInRange,
  findMinInRange,
}
