import {
  ERROR_CODES,
  TOOL_STATUSES,
} from './constants.js'
import {
  createError,
} from './errors.js'

function validateToolEntry(entry) {
  const errors = []

  if (!entry || typeof entry !== 'object') {
    return {
      valid: false,
      errors: [createError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, '条目不是对象')],
      entry: null,
    }
  }

  if (!entry.id || typeof entry.id !== 'string') {
    errors.push(createError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, 'id 是必需的字符串'))
  }

  if (!entry.title && !entry.name) {
    errors.push(createError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, 'title 或 name 是必需的'))
  }

  if (entry.status && !Object.values(TOOL_STATUSES).includes(entry.status)) {
    errors.push(createError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, `status 必须是: ${Object.values(TOOL_STATUSES).join(', ')}`))
  }

  if (entry.tags && !Array.isArray(entry.tags)) {
    errors.push(createError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, 'tags 必须是数组'))
  }

  if (entry.path !== undefined && typeof entry.path !== 'string') {
    errors.push(createError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, 'path 必须是字符串'))
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      entry: null,
    }
  }

  return {
    valid: true,
    errors: [],
    entry: normalizeToolEntry(entry),
  }
}

function normalizeToolEntry(entry) {
  const status = entry.status || TOOL_STATUSES.STABLE
  const tags = entry.tags || []
  const title = entry.title || entry.name || ''
  const summary = entry.summary || entry.description || ''
  const path = entry.path || `/tools/${entry.id}`

  return {
    id: String(entry.id || ''),
    title,
    summary,
    path,
    tags,
    status,
    name: title,
    description: summary,
  }
}

function validateToolList(rawList) {
  if (!rawList || !Array.isArray(rawList)) {
    return {
      valid: false,
      error: createError(ERROR_CODES.LIST_LOAD_FAILED, '清单不是数组'),
      validEntries: [],
      invalidEntries: [],
    }
  }

  const validEntries = []
  const invalidEntries = []
  const seenIds = new Set()

  rawList.forEach((entry, index) => {
    const result = validateToolEntry(entry)

    if (result.valid && result.entry) {
      if (seenIds.has(result.entry.id)) {
        invalidEntries.push({
          entry,
          index,
          errors: [createError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, '重复的 id')],
        })
      } else {
        seenIds.add(result.entry.id)
        validEntries.push(result.entry)
      }
    } else {
      invalidEntries.push({
        entry,
        index,
        errors: result.errors,
      })
    }
  })

  const hasErrors = invalidEntries.length > 0

  return {
    valid: !hasErrors,
    error: hasErrors ? createError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, `有 ${invalidEntries.length} 个条目验证失败`) : null,
    validEntries,
    invalidEntries,
  }
}

function mergeToolLists(baseList, extraList, dedupStrategy = 'base-wins') {
  const validationResult1 = validateToolList(baseList)
  const validationResult2 = validateToolList(extraList)

  const baseMap = new Map()
  const extraMap = new Map()
  const invalidEntries = [
    ...validationResult1.invalidEntries,
    ...validationResult2.invalidEntries.map((item) => ({ ...item, source: 'extra' })),
  ]

  validationResult1.validEntries.forEach((entry) => {
    baseMap.set(entry.id, { ...entry, source: 'base' })
  })

  validationResult2.validEntries.forEach((entry) => {
    extraMap.set(entry.id, { ...entry, source: 'extra' })
  })

  const merged = new Map()

  baseMap.forEach((entry, id) => {
    merged.set(id, entry)
  })

  extraMap.forEach((entry, id) => {
    if (merged.has(id)) {
      if (dedupStrategy === 'extra-wins') {
        merged.set(id, entry)
      } else if (dedupStrategy === 'merge') {
        const base = merged.get(id)
        merged.set(id, {
          ...base,
          ...entry,
          tags: [...new Set([...(base.tags || []), ...(entry.tags || [])])],
          source: 'merged',
        })
      }
    } else {
      merged.set(id, entry)
    }
  })

  return {
    entries: Array.from(merged.values()),
    invalidEntries,
    baseCount: baseMap.size,
    extraCount: extraMap.size,
    mergedCount: merged.size,
  }
}

export {
  validateToolEntry,
  normalizeToolEntry,
  validateToolList,
  mergeToolLists,
}
