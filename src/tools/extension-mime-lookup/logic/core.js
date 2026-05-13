import {
  STORAGE_KEY,
  MAX_FUZZY_RESULTS,
  ERROR_CODES,
  TABLE_VERSIONS,
  CURRENT_TABLE_VERSION,
  CATEGORIES,
} from './constants.js'
import { createError } from './errors.js'
import { getTableByVersion, getAllVersions } from './mimeData.js'

function normalizeExtension(ext) {
  if (ext == null) return ''
  let result = String(ext).trim()
  if (result.startsWith('.')) {
    result = result.slice(1)
  }
  return result.toLowerCase()
}

function normalizeMime(mime) {
  if (mime == null) return ''
  let result = String(mime).trim().toLowerCase()
  const semiIndex = result.indexOf(';')
  if (semiIndex !== -1) {
    result = result.slice(0, semiIndex).trim()
  }
  return result
}

function buildExtensionIndex(table, overrides = []) {
  const index = new Map()
  table.forEach((entry) => {
    const ext = normalizeExtension(entry.extension)
    if (!index.has(ext)) {
      index.set(ext, [])
    }
    index.get(ext).push({
      ...entry,
      source: 'builtin',
    })
  })
  overrides.forEach((entry) => {
    const ext = normalizeExtension(entry.extension)
    if (!index.has(ext)) {
      index.set(ext, [])
    }
    const normalizedMime = normalizeMime(entry.mime)
    const existingIdx = index.get(ext).findIndex(
      (e) => normalizeMime(e.mime) === normalizedMime
    )
    if (existingIdx !== -1) {
      index.get(ext)[existingIdx] = {
        ...entry,
        mime: normalizedMime,
        extension: ext,
        source: 'override',
        isOverride: true,
      }
    } else {
      index.get(ext).push({
        ...entry,
        mime: normalizedMime,
        extension: ext,
        source: 'override',
        isOverride: true,
      })
    }
  })
  index.forEach((entries, key) => {
    const sorted = [...entries].sort((a, b) => {
      if (a.isOverride && !b.isOverride) return -1
      if (!a.isOverride && b.isOverride) return 1
      if (a.isRecommended && !b.isRecommended) return -1
      if (!a.isRecommended && b.isRecommended) return 1
      if (b.priority !== a.priority) return b.priority - a.priority
      return (a.mime || '').localeCompare(b.mime || '')
    })
    index.set(key, sorted)
  })
  return index
}

function buildMimeIndex(table, overrides = []) {
  const index = new Map()
  table.forEach((entry) => {
    const mime = normalizeMime(entry.mime)
    if (!index.has(mime)) {
      index.set(mime, [])
    }
    index.get(mime).push({
      ...entry,
      source: 'builtin',
    })
  })
  overrides.forEach((entry) => {
    const mime = normalizeMime(entry.mime)
    if (!index.has(mime)) {
      index.set(mime, [])
    }
    const normalizedExt = normalizeExtension(entry.extension)
    const existingIdx = index.get(mime).findIndex(
      (e) => normalizeExtension(e.extension) === normalizedExt
    )
    if (existingIdx !== -1) {
      index.get(mime)[existingIdx] = {
        ...entry,
        mime: mime,
        extension: normalizedExt,
        source: 'override',
        isOverride: true,
      }
    } else {
      index.get(mime).push({
        ...entry,
        mime: mime,
        extension: normalizedExt,
        source: 'override',
        isOverride: true,
      })
    }
  })
  index.forEach((entries, key) => {
    const sorted = [...entries].sort((a, b) => {
      if (a.isOverride && !b.isOverride) return -1
      if (!a.isOverride && b.isOverride) return 1
      if (a.isRecommended && !b.isRecommended) return -1
      if (!a.isRecommended && b.isRecommended) return 1
      if (b.priority !== a.priority) return b.priority - a.priority
      return (a.extension || '').localeCompare(b.extension || '')
    })
    index.set(key, sorted)
  })
  return index
}

function buildCategoryIndex(table) {
  const index = new Map()
  Object.values(CATEGORIES).forEach((cat) => {
    index.set(cat, [])
  })
  table.forEach((entry) => {
    if (index.has(entry.category)) {
      index.get(entry.category).push(entry)
    } else {
      index.get(CATEGORIES.OTHER).push(entry)
    }
  })
  return index
}

function lookupByExtension(extension, extIndex, options = {}) {
  const {
    fuzzy = false,
    fuzzyMode = 'substring',
    categories = null,
    maxResults = MAX_FUZZY_RESULTS,
  } = options

  const normalized = normalizeExtension(extension)

  if (!normalized) {
    return {
      success: false,
      error: createError(ERROR_CODES.EMPTY_INPUT),
      results: [],
    }
  }

  if (!fuzzy) {
    const entries = extIndex.get(normalized) || []
    const filtered = filterByCategories(entries, categories)
    return {
      success: true,
      query: normalized,
      results: filtered,
      isFuzzy: false,
    }
  }

  const results = []
  for (const [ext, entries] of extIndex.entries()) {
    let match = false
    if (fuzzyMode === 'prefix') {
      match = ext.startsWith(normalized)
    } else {
      match = ext.includes(normalized)
    }
    if (match) {
      const filtered = filterByCategories(entries, categories)
      filtered.forEach((entry) => {
        results.push({
          ...entry,
          matchedExtension: ext,
        })
      })
      if (results.length >= maxResults) break
    }
  }

  return {
    success: true,
    query: normalized,
    results: results.slice(0, maxResults),
    isFuzzy: true,
    fuzzyMode,
  }
}

function lookupByMime(mime, mimeIndex, options = {}) {
  const {
    fuzzy = false,
    fuzzyMode = 'substring',
    categories = null,
    maxResults = MAX_FUZZY_RESULTS,
  } = options

  const normalized = normalizeMime(mime)

  if (!normalized) {
    return {
      success: false,
      error: createError(ERROR_CODES.EMPTY_INPUT),
      results: [],
    }
  }

  if (!fuzzy) {
    const entries = mimeIndex.get(normalized) || []
    const filtered = filterByCategories(entries, categories)
    return {
      success: true,
      query: normalized,
      results: filtered,
      isFuzzy: false,
    }
  }

  const results = []
  for (const [mimeKey, entries] of mimeIndex.entries()) {
    let match = false
    if (fuzzyMode === 'prefix') {
      match = mimeKey.startsWith(normalized)
    } else {
      match = mimeKey.includes(normalized)
    }
    if (match) {
      const filtered = filterByCategories(entries, categories)
      filtered.forEach((entry) => {
        results.push({
          ...entry,
          matchedMime: mimeKey,
        })
      })
      if (results.length >= maxResults) break
    }
  }

  return {
    success: true,
    query: normalized,
    results: results.slice(0, maxResults),
    isFuzzy: true,
    fuzzyMode,
  }
}

function filterByCategories(entries, categories) {
  if (!categories || categories.length === 0) {
    return entries
  }
  return entries.filter((e) => categories.includes(e.category))
}

function getRecommendedExtensionForMime(mime, mimeIndex) {
  const normalized = normalizeMime(mime)
  const entries = mimeIndex.get(normalized) || []
  const recommended = entries.find((e) => e.isRecommended)
  if (recommended) return recommended
  if (entries.length > 0) return entries[0]
  return null
}

function parseBatchInput(input) {
  if (input == null) return []
  return String(input)
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function loadOverrides(storage = null) {
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null)
  if (!store) {
    return []
  }
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item && item.extension && item.mime)
  } catch {
    return []
  }
}

function saveOverrides(overrides, storage = null) {
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null)
  if (!store) {
    return { success: false, error: createError(ERROR_CODES.STORAGE_WRITE_ERROR) }
  }
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(overrides))
    return { success: true }
  } catch {
    return { success: false, error: createError(ERROR_CODES.STORAGE_WRITE_ERROR) }
  }
}

function addOverride(existingOverrides, newOverride) {
  if (!newOverride || !newOverride.extension || !newOverride.mime) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_FORMAT),
      overrides: existingOverrides,
    }
  }
  const normalizedExt = normalizeExtension(newOverride.extension)
  const normalizedMime = normalizeMime(newOverride.mime)

  if (!normalizedExt || !normalizedMime) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_FORMAT),
      overrides: existingOverrides,
    }
  }

  const filtered = existingOverrides.filter(
    (item) =>
      !(
        normalizeExtension(item.extension) === normalizedExt &&
        normalizeMime(item.mime) === normalizedMime
      )
  )

  const newEntry = {
    extension: normalizedExt,
    mime: normalizedMime,
    category: newOverride.category || CATEGORIES.OTHER,
    priority: newOverride.priority || 100,
    isRecommended: newOverride.isRecommended || false,
    addedAt: Date.now(),
  }

  return {
    success: true,
    overrides: [...filtered, newEntry],
  }
}

function removeOverride(existingOverrides, extension, mime) {
  const normalizedExt = normalizeExtension(extension)
  const normalizedMime = normalizeMime(mime)

  const filtered = existingOverrides.filter(
    (item) =>
      !(
        normalizeExtension(item.extension) === normalizedExt &&
        normalizeMime(item.mime) === normalizedMime
      )
  )

  return {
    success: true,
    overrides: filtered,
    removed: existingOverrides.length !== filtered.length,
  }
}

function getTableInfo(version = CURRENT_TABLE_VERSION) {
  const table = getTableByVersion(version)
  return {
    version,
    count: table.length,
    categories: Object.values(CATEGORIES).map((cat) => ({
      id: cat,
      count: table.filter((e) => e.category === cat).length,
    })),
    allVersions: getAllVersions(),
  }
}

export {
  normalizeExtension,
  normalizeMime,
  buildExtensionIndex,
  buildMimeIndex,
  buildCategoryIndex,
  lookupByExtension,
  lookupByMime,
  filterByCategories,
  getRecommendedExtensionForMime,
  parseBatchInput,
  loadOverrides,
  saveOverrides,
  addOverride,
  removeOverride,
  getTableInfo,
}
