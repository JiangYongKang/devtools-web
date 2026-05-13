import {
  ERROR_CODES,
  MAX_SAFE_INPUT_SIZE,
  MAX_LINE_COUNT,
  MAX_LINE_LENGTH,
  LARGE_LIST_THRESHOLD,
  createError,
} from './errors.js'
import {
  DELIMITER_OPTIONS,
  SORT_ORDER,
  TIEBREAKER_OPTIONS,
  COMMENT_PREFIX,
  PRERELEASE_KEYWORDS,
} from './constants.js'
import {
  parseVersion,
  compareVersions,
} from './semver.js'
import {
  parseRange,
  satisfiesRange,
  findMaxInRange,
  findMinInRange,
} from './ranges.js'

function splitByDelimiter(input, delimiterKey) {
  const delimOpt = DELIMITER_OPTIONS.find((d) => d.value === delimiterKey)
  const regex = delimOpt ? delimOpt.regex : /[\r\n]+/
  return String(input || '').split(regex)
}

function validateInputSize(input) {
  if (input == null) {
    return {
      errorCode: ERROR_CODES.EMPTY_INPUT,
      error: createError(ERROR_CODES.EMPTY_INPUT),
    }
  }

  const text = String(input)

  if (text.length > MAX_SAFE_INPUT_SIZE) {
    return {
      errorCode: ERROR_CODES.INPUT_TOO_LARGE,
      error: createError(ERROR_CODES.INPUT_TOO_LARGE, {
        actualBytes: text.length,
        maxBytes: MAX_SAFE_INPUT_SIZE,
      }),
    }
  }

  return null
}

function parseLines(input, options = {}) {
  const { delimiter = 'newline', filterComments = true, filterEmpty = true } = options

  const sizeError = validateInputSize(input)
  if (sizeError) {
    return {
      success: false,
      errorCode: sizeError.errorCode,
      error: sizeError.error,
      lines: [],
    }
  }

  const text = String(input || '')
  const rawLines = splitByDelimiter(text, delimiter)

  if (rawLines.length > MAX_LINE_COUNT) {
    return {
      success: false,
      errorCode: ERROR_CODES.TOO_MANY_LINES,
      error: createError(ERROR_CODES.TOO_MANY_LINES, {
        actual: rawLines.length,
        max: MAX_LINE_COUNT,
      }),
      lines: [],
    }
  }

  const results = []
  let insertOrder = 0

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i]

    if (rawLine.length > MAX_LINE_LENGTH) {
      return {
        success: false,
        errorCode: ERROR_CODES.LINE_TOO_LONG,
        error: createError(ERROR_CODES.LINE_TOO_LONG, {
          lineNumber: i + 1,
          actualLength: rawLine.length,
          maxLength: MAX_LINE_LENGTH,
        }),
        lines: results,
      }
    }

    const trimmed = rawLine.trim()

    if (filterEmpty && trimmed === '') {
      continue
    }

    if (filterComments && trimmed.startsWith(COMMENT_PREFIX)) {
      continue
    }

    const parsed = parseVersion(trimmed)

    results.push({
      originalIndex: i,
      insertOrder: insertOrder++,
      raw: rawLine,
      trimmed,
      parsed,
    })
  }

  return {
    success: true,
    errorCode: null,
    error: null,
    lines: results,
  }
}

function sortLines(lines, options = {}) {
  const {
    order = SORT_ORDER.ASC,
    includeBuild = false,
    tiebreaker = 'insertion',
    deduplicate = false,
  } = options

  const sorted = [...lines]
  const orderSign = order === SORT_ORDER.DESC ? -1 : 1

  sorted.sort((a, b) => {
    const aValid = a.parsed.valid
    const bValid = b.parsed.valid

    if (aValid && !bValid) return -1
    if (!aValid && bValid) return 1
    if (!aValid && !bValid) {
      if (tiebreaker === 'lexicographic') {
        const cmp = a.raw.localeCompare(b.raw)
        if (cmp !== 0) return orderSign * cmp
      }
      return orderSign * (a.insertOrder - b.insertOrder)
    }

    const cmp = compareVersions(a.parsed, b.parsed, { includeBuild })
    if (cmp !== 0) {
      return orderSign * cmp
    }

    if (tiebreaker === 'lexicographic') {
      const lex = a.raw.localeCompare(b.raw)
      if (lex !== 0) return orderSign * lex
    }

    return orderSign * (a.insertOrder - b.insertOrder)
  })

  if (deduplicate) {
    const seen = new Set()
    const deduplicated = []

    for (const line of sorted) {
      if (!line.parsed.valid) {
        deduplicated.push(line)
        continue
      }

      const key = includeBuild ? line.parsed.normalized : line.parsed.normalized.split('+')[0]
      if (!seen.has(key)) {
        seen.add(key)
        deduplicated.push(line)
      }
    }

    return deduplicated
  }

  return sorted
}

function processInput(rawParams) {
  const {
    input,
    delimiter = 'newline',
    filterComments = true,
    filterEmpty = true,
    order = SORT_ORDER.ASC,
    sortKey = 'strict',
    tiebreaker = 'insertion',
    deduplicate = false,
    validateOnly = false,
  } = rawParams

  const includeBuild = sortKey === 'withBuild'

  const parseResult = parseLines(input, { delimiter, filterComments, filterEmpty })

  if (!parseResult.success) {
    return {
      success: false,
      errorCode: parseResult.errorCode,
      error: parseResult.error,
      result: null,
    }
  }

  const lines = parseResult.lines

  if (lines.length === 0) {
    return {
      success: true,
      errorCode: null,
      result: {
        original: [],
        sorted: [],
        validated: [],
        stats: {
          total: 0,
          valid: 0,
          invalid: 0,
          unique: 0,
        },
        isLargeList: false,
      },
    }
  }

  const stats = {
    total: lines.length,
    valid: lines.filter((l) => l.parsed.valid).length,
    invalid: lines.filter((l) => !l.parsed.valid).length,
  }

  let sorted = lines
  let uniqueCount = stats.valid

  if (!validateOnly) {
    sorted = sortLines(lines, {
      order,
      includeBuild,
      tiebreaker,
      deduplicate,
    })

    if (deduplicate) {
      uniqueCount = sorted.filter((l) => l.parsed.valid).length
    }
  }

  stats.unique = uniqueCount

  const hasInvalid = stats.invalid > 0

  return {
    success: !hasInvalid || validateOnly,
    errorCode: hasInvalid && !validateOnly ? ERROR_CODES.MIXED_INVALID_LINES : null,
    error: hasInvalid && !validateOnly
      ? createError(ERROR_CODES.MIXED_INVALID_LINES, { count: stats.invalid })
      : null,
    result: {
      original: lines.map((l, idx) => ({ ...l, originalPosition: idx })),
      sorted: sorted.map((l, idx) => {
        const originalPos = lines.findIndex((ol) => ol.insertOrder === l.insertOrder)
        return { ...l, originalPosition: originalPos, sortedPosition: idx }
      }),
      validated: lines,
      stats,
      isLargeList: lines.length >= LARGE_LIST_THRESHOLD,
      hasInvalid,
    },
  }
}

function processRangeCheck(lines, rangeStr, options = {}) {
  const includeBuild = options.includeBuild || false
  const range = parseRange(rangeStr)

  if (!range.valid) {
    return {
      success: false,
      errorCode: range.errorCode,
      error: range.error,
      result: null,
    }
  }

  const checked = lines.map((line, idx) => {
    const check = line.parsed.valid
      ? satisfiesRange(line.parsed, range, { includeBuild })
      : { satisfies: false, reason: 'invalid_version' }

    return {
      ...line,
      index: idx,
      satisfies: check.satisfies,
      satisfyReason: check.reason,
    }
  })

  const satisfied = checked.filter((c) => c.satisfies)

  const maxInRange = findMaxInRange(
    lines.map((l) => l.parsed),
    range,
    { includeBuild }
  )

  const minInRange = findMinInRange(
    lines.map((l) => l.parsed),
    range,
    { includeBuild }
  )

  const groups = {}
  for (const line of lines) {
    if (!line.parsed.valid) continue

    const majorKey = `${line.parsed.major}.x.x`
    if (!groups[majorKey]) {
      groups[majorKey] = []
    }
    groups[majorKey].push(line)
  }

  const majorGroups = Object.keys(groups)
    .sort()
    .map((key) => ({
      key,
      lines: sortLines(groups[key], { order: SORT_ORDER.ASC, includeBuild }),
    }))

  return {
    success: true,
    errorCode: null,
    error: null,
    result: {
      range,
      checked,
      stats: {
        total: lines.length,
        satisfied: satisfied.length,
        notSatisfied: lines.length - satisfied.length,
      },
      maxInRange,
      minInRange,
      majorGroups,
    },
  }
}

function generateTSV(lines, options = {}) {
  const { includeNormalized = true } = options

  const headers = [
    '序号',
    '原始输入',
    'Major',
    'Minor',
    'Patch',
    '先行版',
    '构建元数据',
    '状态',
  ]

  if (includeNormalized) {
    headers.push('规范化版本')
  }

  const rows = lines.map((line, idx) => {
    const row = [
      idx + 1,
      line.raw,
      line.parsed.valid ? line.parsed.major : '',
      line.parsed.valid ? line.parsed.minor : '',
      line.parsed.valid ? line.parsed.patch : '',
      line.parsed.valid && line.parsed.prerelease ? line.parsed.prerelease : '',
      line.parsed.valid && line.parsed.build ? line.parsed.build : '',
      line.parsed.valid ? '有效' : '无效',
    ]

    if (includeNormalized) {
      row.push(line.parsed.valid ? line.parsed.normalized : '')
    }

    return row
  })

  return [headers, ...rows].map((row) => row.join('\t')).join('\n')
}

function generateJSON(lines, options = {}) {
  const { includeNormalized = true, pretty = true } = options

  const data = lines.map((line) => ({
    raw: line.raw,
    valid: line.parsed.valid,
    ...(line.parsed.valid
      ? {
          major: line.parsed.major,
          minor: line.parsed.minor,
          patch: line.parsed.patch,
          prerelease: line.parsed.prerelease,
          build: line.parsed.build,
          ...(includeNormalized ? { normalized: line.parsed.normalized } : {}),
        }
      : { errorCode: line.parsed.errorCode }),
  }))

  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
}

function generateDiff(original, sorted) {
  const originalIndexMap = new Map()
  original.forEach((line, idx) => {
    originalIndexMap.set(line.insertOrder, idx)
  })

  const diffs = []
  for (let i = 0; i < sorted.length; i++) {
    const line = sorted[i]
    const originalIdx = originalIndexMap.get(line.insertOrder)
    diffs.push({
      raw: line.raw,
      originalPosition: originalIdx,
      sortedPosition: i,
      changed: originalIdx !== i,
      direction:
        originalIdx === i
          ? 'none'
          : originalIdx > i
          ? 'up'
          : 'down',
    })
  }

  return diffs
}

export {
  parseLines,
  sortLines,
  processInput,
  processRangeCheck,
  generateTSV,
  generateJSON,
  generateDiff,
  validateInputSize,
  parseVersion,
  compareVersions,
  parseRange,
  satisfiesRange,
  findMaxInRange,
  findMinInRange,
  MAX_SAFE_INPUT_SIZE,
  MAX_LINE_COUNT,
  MAX_LINE_LENGTH,
  LARGE_LIST_THRESHOLD,
  ERROR_CODES,
  SORT_ORDER,
  DELIMITER_OPTIONS,
  TIEBREAKER_OPTIONS,
  PRERELEASE_KEYWORDS,
  COMMENT_PREFIX,
}
