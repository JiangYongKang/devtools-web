import { LOG_LEVELS } from './constants.js'

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

function tryParseJSON(line) {
  try {
    const trimmed = line.trim()
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      return null
    }
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

const JSON_TIME_FIELDS = ['timestamp', 'time', 'ts', '@timestamp', 'datetime', 'date', 't']
const JSON_LEVEL_FIELDS = ['level', 'lvl', 'severity', 'log_level', 'type']

function findTimeInJSON(obj) {
  for (const field of JSON_TIME_FIELDS) {
    if (obj[field] != null) {
      const value = obj[field]
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value)
      }
    }
  }
  return null
}

function findLevelInJSON(obj) {
  for (const field of JSON_LEVEL_FIELDS) {
    if (obj[field] != null) {
      const value = obj[field]
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value)
      }
    }
  }
  return null
}

function extractTimeFromLine(line) {
  try {
    const jsonObj = tryParseJSON(line)
    if (jsonObj) {
      const timeValue = findTimeInJSON(jsonObj)
      if (timeValue) {
        return timeValue
      }
    }

    const match1 = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+(?:Z|[+-]\d{2}:?\d{2}))/i)
    if (match1) return match1[1]

    const match2 = line.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/i)
    if (match2) return match2[1]

    const match3 = line.match(/(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/i)
    if (match3) return match3[1]

    const match4 = line.match(/\[(\d{4}[-/]\d{2}[-/]\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:\s*[+-]\d{2}:?\d{2}|Z)?)\]/)
    if (match4) return match4[1]

    const match5 = line.match(/\[(\d{2}\/[A-Za-z]{3}\/\d{4}:\d{2}:\d{2}:\d{2}\s+[+-]\d{4})\]/)
    if (match5) return match5[1]

    const match6 = line.match(/time[=:]\s*"([^"]+)"/i)
    if (match6) return match6[1]

    const match7 = line.match(/time[=:]\s*'([^']+)'/i)
    if (match7) return match7[1]

    const match8 = line.match(/time[=:]\s*(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^"'\s]*)/i)
    if (match8) return match8[1]

    const match9 = line.match(/timestamp[=:]\s*"([^"]+)"/i)
    if (match9) return match9[1]

    const match10 = line.match(/timestamp[=:]\s*'([^']+)'/i)
    if (match10) return match10[1]

    const match11 = line.match(/timestamp[=:]\s*(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^"'\s]*)/i)
    if (match11) return match11[1]

    return null
  } catch {
    return null
  }
}

function extractLevelFromLine(line) {
  try {
    const jsonObj = tryParseJSON(line)
    if (jsonObj) {
      const levelValue = findLevelInJSON(jsonObj)
      if (levelValue) {
        return normalizeLevel(levelValue)
      }
    }

    const bracketMatch = line.match(/\[(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL|CRITICAL)\]/i)
    if (bracketMatch) {
      return normalizeLevel(bracketMatch[1])
    }

    const colonMatch = line.match(/(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL|CRITICAL):/i)
    if (colonMatch) {
      return normalizeLevel(colonMatch[1])
    }

    const kvMatch1 = line.match(/level[=:]\s*"([^"]+)"/i)
    if (kvMatch1) {
      const normalized = normalizeLevel(kvMatch1[1])
      if (normalized) return normalized
    }

    const kvMatch2 = line.match(/level[=:]\s*'([^']+)'/i)
    if (kvMatch2) {
      const normalized = normalizeLevel(kvMatch2[1])
      if (normalized) return normalized
    }

    const kvMatch3 = line.match(/level[=:]\s*(\S+)/i)
    if (kvMatch3) {
      const normalized = normalizeLevel(kvMatch3[1])
      if (normalized) return normalized
    }

    const kvMatch4 = line.match(/lvl[=:]\s*"([^"]+)"/i)
    if (kvMatch4) {
      const normalized = normalizeLevel(kvMatch4[1])
      if (normalized) return normalized
    }

    const kvMatch5 = line.match(/lvl[=:]\s*'([^']+)'/i)
    if (kvMatch5) {
      const normalized = normalizeLevel(kvMatch5[1])
      if (normalized) return normalized
    }

    const kvMatch6 = line.match(/lvl[=:]\s*(\S+)/i)
    if (kvMatch6) {
      const normalized = normalizeLevel(kvMatch6[1])
      if (normalized) return normalized
    }

    const kvMatch7 = line.match(/severity[=:]\s*"([^"]+)"/i)
    if (kvMatch7) {
      const normalized = normalizeLevel(kvMatch7[1])
      if (normalized) return normalized
    }

    const kvMatch8 = line.match(/severity[=:]\s*'([^']+)'/i)
    if (kvMatch8) {
      const normalized = normalizeLevel(kvMatch8[1])
      if (normalized) return normalized
    }

    const kvMatch9 = line.match(/severity[=:]\s*(\S+)/i)
    if (kvMatch9) {
      const normalized = normalizeLevel(kvMatch9[1])
      if (normalized) return normalized
    }

    const wordBoundaryMatch = line.match(/\b(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL|CRITICAL|TRC|DBG|INF|WRN|ERR|FTL)\b/i)
    if (wordBoundaryMatch) {
      return normalizeLevel(wordBoundaryMatch[1])
    }

    return null
  } catch {
    return null
  }
}

function normalizeLevel(rawLevel) {
  if (!rawLevel) return null
  try {
    const upper = String(rawLevel).toUpperCase().trim()

    for (let i = 0; i < LOG_LEVELS.length; i++) {
      const levelInfo = LOG_LEVELS[i]
      for (let j = 0; j < levelInfo.patterns.length; j++) {
        if (upper === levelInfo.patterns[j].toUpperCase()) {
          return levelInfo.name
        }
      }
    }

    return null
  } catch {
    return null
  }
}

function parseNginxTime(rawTime) {
  const nginxMatch = rawTime.match(/^(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s+([+-]\d{4})$/)
  if (nginxMatch) {
    const day = nginxMatch[1]
    const month = MONTH_MAP[nginxMatch[2].toLowerCase()]
    const year = nginxMatch[3]
    const hour = nginxMatch[4]
    const minute = nginxMatch[5]
    const second = nginxMatch[6]
    const tz = nginxMatch[7]

    if (month) {
      const formatted = `${year}-${month}-${day}T${hour}:${minute}:${second}${tz.substring(0, 3)}:${tz.substring(3)}`
      return formatted
    }
  }
  return null
}

function parseTimestamp(rawTime, timezone = 'UTC') {
  if (!rawTime) return null

  try {
    let timestamp = null
    let isValid = false

    const epochMsMatch = rawTime.match(/^\d{13}$/)
    if (epochMsMatch) {
      timestamp = parseInt(rawTime, 10)
      isValid = !isNaN(timestamp) && timestamp > 0
    }

    const epochSecMatch = rawTime.match(/^\d{10}$/)
    if (!isValid && epochSecMatch) {
      timestamp = parseInt(rawTime, 10) * 1000
      isValid = !isNaN(timestamp) && timestamp > 0
    }

    if (!isValid) {
      let normalized = rawTime

      const nginxNormalized = parseNginxTime(rawTime)
      if (nginxNormalized) {
        normalized = nginxNormalized
      } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
        normalized = normalized.replace(' ', 'T')
        if (timezone === 'UTC') {
          normalized += 'Z'
        }
      } else if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
        normalized = normalized.replace(/\//g, '-').replace(' ', 'T')
        if (timezone === 'UTC') {
          normalized += 'Z'
        }
      }

      timestamp = Date.parse(normalized)
      isValid = !isNaN(timestamp)
    }

    if (!isValid) {
      return {
        raw: rawTime,
        isValid: false,
        timestamp: null,
        formatted: null,
      }
    }

    const date = new Date(timestamp)
    let formatted = null

    try {
      if (timezone === 'UTC') {
        formatted = date.toISOString()
      } else {
        formatted = date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      }
    } catch {
      formatted = date.toISOString()
    }

    return {
      raw: rawTime,
      isValid: true,
      timestamp,
      formatted,
    }
  } catch {
    return {
      raw: rawTime,
      isValid: false,
      timestamp: null,
      formatted: null,
    }
  }
}

function parseLogLine(line, options = {}) {
  try {
    const { timezone = 'UTC' } = options
    const rawLine = line
    const level = extractLevelFromLine(line)
    const rawTime = extractTimeFromLine(line)

    let timeInfo = null
    if (rawTime) {
      timeInfo = parseTimestamp(rawTime, timezone)
    }

    const hasLevel = level != null
    const hasTime = timeInfo != null
    const hasValidTime = timeInfo ? timeInfo.isValid : false

    let unmatchedReason = null
    if (!hasLevel && !hasTime) {
      unmatchedReason = 'NEITHER'
    } else if (!hasLevel) {
      unmatchedReason = 'NO_LEVEL'
    } else if (!hasTime) {
      unmatchedReason = 'NO_TIME'
    } else if (!hasValidTime) {
      unmatchedReason = 'ILLEGAL_TIME'
    }

    return {
      rawLine,
      level,
      time: timeInfo,
      unmatchedReason,
      matched: hasLevel && hasValidTime,
    }
  } catch {
    return {
      rawLine: line,
      level: null,
      time: null,
      unmatchedReason: 'NEITHER',
      matched: false,
    }
  }
}

export {
    extractLevelFromLine, extractTimeFromLine, normalizeLevel, parseLogLine, parseTimestamp, tryParseJSON
}

