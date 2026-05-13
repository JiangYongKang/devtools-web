import {
  SEARCH_MODES,
  MAX_BATCH_ITEMS,
  MAX_FUZZY_RESULTS,
  CURRENT_TABLE_VERSION,
  EXAMPLES,
  MATCH_STATES,
  CATEGORY_LABELS,
} from './constants.js'
import {
  ERROR_CODES,
  createError,
  getErrorMessage,
} from './errors.js'
import { getTableByVersion } from './mimeData.js'
import {
  normalizeExtension,
  normalizeMime,
  buildExtensionIndex,
  buildMimeIndex,
  lookupByExtension,
  lookupByMime,
  getRecommendedExtensionForMime,
  parseBatchInput,
  loadOverrides,
  saveOverrides,
  addOverride,
  removeOverride,
  getTableInfo,
} from './core.js'
import {
  inferMimeTypeFromBytes,
  readFileHeader,
  getExtensionFromFilename,
  compareWithExtension,
  bytesToHexString,
} from './magicNumbers.js'

function processExtensionsLookup(input, options = {}) {
  const {
    tableVersion = CURRENT_TABLE_VERSION,
    overrides = [],
    fuzzy = false,
    fuzzyMode = 'substring',
    categories = null,
    maxResults = MAX_FUZZY_RESULTS,
  } = options

  const items = parseBatchInput(input)
  if (items.length === 0) {
    return {
      success: false,
      error: createError(ERROR_CODES.EMPTY_INPUT),
      results: [],
    }
  }

  if (items.length > MAX_BATCH_ITEMS) {
    return {
      success: false,
      error: createError(
        ERROR_CODES.OVERFLOW,
        `批量查询数量超过上限 (${MAX_BATCH_ITEMS})`
      ),
      results: [],
    }
  }

  const table = getTableByVersion(tableVersion)
  const extIndex = buildExtensionIndex(table, overrides)
  const mimeIndex = buildMimeIndex(table, overrides)

  const results = items.map((item) => {
    const lookup = lookupByExtension(item, extIndex, {
      fuzzy,
      fuzzyMode,
      categories,
      maxResults,
    })

    return {
      query: item,
      normalized: normalizeExtension(item),
      success: lookup.success,
      error: lookup.error,
      results: lookup.results,
      isFuzzy: lookup.isFuzzy,
      hitCount: lookup.results.length,
      hasHit: lookup.results.length > 0,
    }
  })

  const hitCount = results.filter((r) => r.hasHit).length
  const missCount = results.length - hitCount

  return {
    success: true,
    mode: SEARCH_MODES.EXTENSION_TO_MIME,
    totalItems: results.length,
    hitCount,
    missCount,
    results,
    tableVersion,
    isFuzzy: fuzzy,
    fuzzyMode,
    categories,
  }
}

function processMimeLookup(input, options = {}) {
  const {
    tableVersion = CURRENT_TABLE_VERSION,
    overrides = [],
    fuzzy = false,
    fuzzyMode = 'substring',
    categories = null,
    maxResults = MAX_FUZZY_RESULTS,
  } = options

  const items = parseBatchInput(input)
  if (items.length === 0) {
    return {
      success: false,
      error: createError(ERROR_CODES.EMPTY_INPUT),
      results: [],
    }
  }

  if (items.length > MAX_BATCH_ITEMS) {
    return {
      success: false,
      error: createError(
        ERROR_CODES.OVERFLOW,
        `批量查询数量超过上限 (${MAX_BATCH_ITEMS})`
      ),
      results: [],
    }
  }

  const table = getTableByVersion(tableVersion)
  const extIndex = buildExtensionIndex(table, overrides)
  const mimeIndex = buildMimeIndex(table, overrides)

  const results = items.map((item) => {
    const lookup = lookupByMime(item, mimeIndex, {
      fuzzy,
      fuzzyMode,
      categories,
      maxResults,
    })

    const recommendedExt = getRecommendedExtensionForMime(item, mimeIndex)

    return {
      query: item,
      normalized: normalizeMime(item),
      success: lookup.success,
      error: lookup.error,
      results: lookup.results,
      isFuzzy: lookup.isFuzzy,
      hitCount: lookup.results.length,
      hasHit: lookup.results.length > 0,
      recommendedExtension: recommendedExt
        ? {
            extension: recommendedExt.extension,
            isRecommended: recommendedExt.isRecommended,
            priority: recommendedExt.priority,
          }
        : null,
    }
  })

  const hitCount = results.filter((r) => r.hasHit).length
  const missCount = results.length - hitCount

  return {
    success: true,
    mode: SEARCH_MODES.MIME_TO_EXTENSION,
    totalItems: results.length,
    hitCount,
    missCount,
    results,
    tableVersion,
    isFuzzy: fuzzy,
    fuzzyMode,
    categories,
  }
}

async function processFileHeader(file, options = {}) {
  const {
    tableVersion = CURRENT_TABLE_VERSION,
    overrides = [],
    maxBytes,
  } = options

  const table = getTableByVersion(tableVersion)
  const extIndex = buildExtensionIndex(table, overrides)
  const mimeIndex = buildMimeIndex(table, overrides)

  const readResult = await readFileHeader(file, maxBytes)

  if (!readResult.success) {
    return {
      success: false,
      error: readResult.error,
      mode: SEARCH_MODES.FILE_HEADER,
    }
  }

  const inferResult = inferMimeTypeFromBytes(readResult.bytes)

  const extension = getExtensionFromFilename(readResult.fileName)
  const comparison = compareWithExtension(
    inferResult.matches,
    extension,
    extIndex,
    mimeIndex
  )

  return {
    success: true,
    mode: SEARCH_MODES.FILE_HEADER,
    fileInfo: {
      name: readResult.fileName,
      size: readResult.fileSize,
      extension,
      headerBytes: readResult.bytesRead,
      hexPreview: bytesToHexString(readResult.bytes, 32),
    },
    inferredMatches: inferResult.matches,
    comparison,
    matchState: comparison.matchState,
    matchStateLabel: {
      [MATCH_STATES.MATCH]: '一致',
      [MATCH_STATES.CONFLICT]: '冲突',
      [MATCH_STATES.UNKNOWN]: '未知',
    }[comparison.matchState] || '未知',
    explanation: comparison.explanation,
    tableVersion,
  }
}

function exportOverrides(overrides) {
  return JSON.stringify(overrides, null, 2)
}

function importOverrides(jsonString) {
  try {
    const parsed = JSON.parse(jsonString)
    if (!Array.isArray(parsed)) {
      return {
        success: false,
        error: createError(ERROR_CODES.INVALID_FORMAT, '导入数据必须是数组'),
      }
    }
    const valid = parsed.filter(
      (item) =>
        item &&
        typeof item === 'object' &&
        item.extension &&
        item.mime
    )
    return {
      success: true,
      overrides: valid,
      totalImported: valid.length,
      totalInvalid: parsed.length - valid.length,
    }
  } catch {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_FORMAT, 'JSON 解析失败'),
    }
  }
}

function downloadCsvFromResults(result, options = {}) {
  const { mode = null } = options

  if (!result || !result.results) {
    return null
  }

  let rows = []
  let headers = []

  if (mode === SEARCH_MODES.EXTENSION_TO_MIME || result.mode === SEARCH_MODES.EXTENSION_TO_MIME) {
    headers = ['Query', 'Normalized', 'MIME', 'Category', 'Priority', 'IsRecommended', 'Source']
    rows = result.results.flatMap((item) => {
      if (item.results.length === 0) {
        return [[item.query, item.normalized, '(not found)', '', '', '', '']]
      }
      return item.results.map((entry) => [
        item.query,
        item.normalized,
        entry.mime,
        CATEGORY_LABELS[entry.category] || entry.category,
        String(entry.priority || ''),
        entry.isRecommended ? 'Y' : 'N',
        entry.source || 'builtin',
      ])
    })
  } else if (mode === SEARCH_MODES.MIME_TO_EXTENSION || result.mode === SEARCH_MODES.MIME_TO_EXTENSION) {
    headers = ['Query', 'Normalized', 'Extension', 'Category', 'Priority', 'IsRecommended', 'Source']
    rows = result.results.flatMap((item) => {
      if (item.results.length === 0) {
        return [[item.query, item.normalized, '(not found)', '', '', '', '']]
      }
      return item.results.map((entry) => [
        item.query,
        item.normalized,
        entry.extension,
        CATEGORY_LABELS[entry.category] || entry.category,
        String(entry.priority || ''),
        entry.isRecommended ? 'Y' : 'N',
        entry.source || 'builtin',
      ])
    })
  } else {
    return null
  }

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        const str = String(cell || '')
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"'
        }
        return str
      }).join(',')
    ),
  ].join('\n')

  return csvContent
}

function exportTsvFromResults(result, options = {}) {
  const { mode = null } = options

  if (!result || !result.results) {
    return null
  }

  let rows = []
  let headers = []

  if (mode === SEARCH_MODES.EXTENSION_TO_MIME || result.mode === SEARCH_MODES.EXTENSION_TO_MIME) {
    headers = ['Query', 'Normalized', 'MIME', 'Category', 'Priority', 'IsRecommended', 'Source']
    rows = result.results.flatMap((item) => {
      if (item.results.length === 0) {
        return [[item.query, item.normalized, '(not found)', '', '', '', '']]
      }
      return item.results.map((entry) => [
        item.query,
        item.normalized,
        entry.mime,
        CATEGORY_LABELS[entry.category] || entry.category,
        String(entry.priority || ''),
        entry.isRecommended ? 'Y' : 'N',
        entry.source || 'builtin',
      ])
    })
  } else if (mode === SEARCH_MODES.MIME_TO_EXTENSION || result.mode === SEARCH_MODES.MIME_TO_EXTENSION) {
    headers = ['Query', 'Normalized', 'Extension', 'Category', 'Priority', 'IsRecommended', 'Source']
    rows = result.results.flatMap((item) => {
      if (item.results.length === 0) {
        return [[item.query, item.normalized, '(not found)', '', '', '', '']]
      }
      return item.results.map((entry) => [
        item.query,
        item.normalized,
        entry.extension,
        CATEGORY_LABELS[entry.category] || entry.category,
        String(entry.priority || ''),
        entry.isRecommended ? 'Y' : 'N',
        entry.source || 'builtin',
      ])
    })
  } else {
    return null
  }

  const tsvContent = [
    headers.join('\t'),
    ...rows.map((row) => row.map((cell) => String(cell || '')).join('\t')),
  ].join('\n')

  return tsvContent
}

function debounce(fn, delay) {
  let timerId = null
  return (...args) => {
    if (timerId) {
      clearTimeout(timerId)
    }
    timerId = setTimeout(() => fn(...args), delay)
  }
}

export {
  EXAMPLES,
  SEARCH_MODES,
  MATCH_STATES,
  ERROR_CODES,
  CURRENT_TABLE_VERSION,
  CATEGORY_LABELS,
  getErrorMessage,
  getTableInfo,
  processExtensionsLookup,
  processMimeLookup,
  processFileHeader,
  loadOverrides,
  saveOverrides,
  addOverride,
  removeOverride,
  exportOverrides,
  importOverrides,
  downloadCsvFromResults,
  exportTsvFromResults,
  debounce,
  normalizeExtension,
  normalizeMime,
  bytesToHexString,
}
