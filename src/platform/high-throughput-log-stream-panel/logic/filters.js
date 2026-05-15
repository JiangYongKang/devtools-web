import {
  LOG_LEVELS,
  LOG_LEVEL_PRIORITY,
} from './constants.js'

function createLogFilter(config = {}) {
  const {
    minLevel = LOG_LEVELS.TRACE,
    includes = [],
    excludes = [],
    regexPatterns = [],
  } = config

  const minPriority = LOG_LEVEL_PRIORITY[minLevel] ?? 0

  const includePatterns = includes.map((pattern) => {
    if (pattern instanceof RegExp) return pattern
    return new RegExp(pattern, 'i')
  })

  const excludePatterns = excludes.map((pattern) => {
    if (pattern instanceof RegExp) return pattern
    return new RegExp(pattern, 'i')
  })

  const regexFilterPatterns = regexPatterns.map((pattern) => {
    if (pattern instanceof RegExp) return pattern
    return new RegExp(pattern)
  })

  return function filterLog(log) {
    const logText = typeof log === 'object' ? log.message || log.text || '' : String(log)
    const logLevel = typeof log === 'object' ? log.level : LOG_LEVELS.INFO
    const logPriority = LOG_LEVEL_PRIORITY[logLevel] ?? 2

    if (logPriority < minPriority) {
      return false
    }

    for (const pattern of excludePatterns) {
      if (pattern.test(logText)) {
        return false
      }
    }

    if (includePatterns.length > 0) {
      const hasIncludeMatch = includePatterns.some((pattern) => pattern.test(logText))
      if (!hasIncludeMatch) {
        return false
      }
    }

    if (regexFilterPatterns.length > 0) {
      const hasRegexMatch = regexFilterPatterns.some((pattern) => pattern.test(logText))
      if (!hasRegexMatch) {
        return false
      }
    }

    return true
  }
}

function filterByLevel(logs, minLevel) {
  const minPriority = LOG_LEVEL_PRIORITY[minLevel] ?? 0
  return logs.filter((log) => {
    const logLevel = typeof log === 'object' ? log.level : LOG_LEVELS.INFO
    const logPriority = LOG_LEVEL_PRIORITY[logLevel] ?? 2
    return logPriority >= minPriority
  })
}

function filterBySubstring(logs, substring, caseSensitive = false) {
  const searchStr = caseSensitive ? substring : substring.toLowerCase()
  return logs.filter((log) => {
    const logText = typeof log === 'object' ? log.message || log.text || '' : String(log)
    const text = caseSensitive ? logText : logText.toLowerCase()
    return text.includes(searchStr)
  })
}

function filterByRegex(logs, pattern) {
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern)
  return logs.filter((log) => {
    const logText = typeof log === 'object' ? log.message || log.text || '' : String(log)
    return regex.test(logText)
  })
}

function combineFilters(logs, ...filters) {
  return logs.filter((log) => {
    return filters.every((filter) => {
      if (typeof filter === 'function') {
        return filter(log)
      }
      return true
    })
  })
}

export {
  createLogFilter,
  filterByLevel,
  filterBySubstring,
  filterByRegex,
  combineFilters,
}
