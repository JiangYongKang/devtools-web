import { ERROR_CODES, createError } from './errors.js'
import { MAX_LINE_COUNT, MAX_LINE_LENGTH } from './constants.js'

const KEY_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/

function isValidKey(key) {
  return KEY_REGEX.test(key)
}

function joinContinuationLines(rawLines) {
  const result = []
  const lineMappings = []
  let i = 0

  while (i < rawLines.length) {
    const currentLine = rawLines[i]
    const startLine = i + 1

    if (currentLine.endsWith('\\')) {
      let joinedLine = currentLine.slice(0, -1)
      const mergedLines = [startLine]
      i++

      while (i < rawLines.length && rawLines[i].endsWith('\\')) {
        joinedLine += rawLines[i].slice(0, -1)
        mergedLines.push(i + 1)
        i++
      }

      if (i < rawLines.length) {
        joinedLine += rawLines[i]
        mergedLines.push(i + 1)
        i++
      }

      result.push(joinedLine)
      lineMappings.push({ mergedLines })
    } else {
      result.push(currentLine)
      lineMappings.push({ mergedLines: [startLine] })
      i++
    }
  }

  return { lines: result, lineMappings }
}

function stripComment(value) {
  let inSingleQuote = false
  let inDoubleQuote = false
  let escapeNext = false

  for (let i = 0; i < value.length; i++) {
    const char = value[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === '\\') {
      escapeNext = true
      continue
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }

    if (char === '#' && !inSingleQuote && !inDoubleQuote) {
      return { value: value.slice(0, i).trimEnd(), comment: value.slice(i + 1).trim() }
    }
  }

  return { value: value, comment: null }
}

function stripQuotes(value) {
  const trimmed = value.trim()

  if (trimmed.length >= 2) {
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return unescapeString(trimmed.slice(1, -1), 'double')
    }
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      return unescapeString(trimmed.slice(1, -1), 'single')
    }
  }

  return trimmed
}

function unescapeString(str, quoteType) {
  let result = ''
  let i = 0

  while (i < str.length) {
    const char = str[i]

    if (char === '\\') {
      i++
      if (i >= str.length) {
        result += '\\'
        break
      }

      const nextChar = str[i]
      switch (nextChar) {
        case 'n':
          result += '\n'
          break
        case 'r':
          result += '\r'
          break
        case 't':
          result += '\t'
          break
        case '\\':
          result += '\\'
          break
        case '"':
          result += '"'
          break
        case "'":
          result += "'"
          break
        default:
          result += '\\' + nextChar
      }
    } else {
      result += char
    }
    i++
  }

  return result
}

function checkQuotesClosed(value) {
  let inSingleQuote = false
  let inDoubleQuote = false
  let escapeNext = false

  for (let i = 0; i < value.length; i++) {
    const char = value[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === '\\') {
      escapeNext = true
      continue
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }
  }

  return !inSingleQuote && !inDoubleQuote
}

function parseEnvContent(content, options = {}) {
  const {
    maxLineCount = MAX_LINE_COUNT,
    maxLineLength = MAX_LINE_LENGTH,
  } = options

  const warnings = []
  const errors = []
  const parsedEntries = []
  const duplicateInfo = new Map()

  if (!content || content.trim() === '') {
    return {
      success: false,
      errorCode: ERROR_CODES.EMPTY_INPUT,
      errorMessage: '输入不能为空',
      warnings,
      errors,
      entries: [],
      duplicates: [],
    }
  }

  const rawLines = content.split(/\r?\n/)

  if (rawLines.length > maxLineCount) {
    errors.push(createError(
      ERROR_CODES.LINE_COUNT_EXCEEDED,
      `行数 ${rawLines.length} 超过限制 ${maxLineCount}，仅处理前 ${maxLineCount} 行`,
      { actual: rawLines.length, limit: maxLineCount }
    ))
  }

  const linesToProcess = rawLines.slice(0, maxLineCount)

  for (let i = 0; i < linesToProcess.length; i++) {
    const line = linesToProcess[i]
    if (line.length > maxLineLength) {
      errors.push(createError(
        ERROR_CODES.LINE_LENGTH_EXCEEDED,
        `第 ${i + 1} 行长度 ${line.length} 超过限制 ${maxLineLength}`,
        { line: i + 1, actual: line.length, limit: maxLineLength }
      ))
    }
  }

  const { lines: joinedLines, lineMappings } = joinContinuationLines(linesToProcess)

  for (let i = 0; i < joinedLines.length; i++) {
    const line = joinedLines[i]
    const mapping = lineMappings[i]
    const firstLineNum = mapping.mergedLines[0]

    const trimmed = line.trim()

    if (trimmed === '' || trimmed.startsWith('#')) {
      continue
    }

    let lineWithoutExport = trimmed
    let hasExport = false

    if (trimmed.startsWith('export ')) {
      lineWithoutExport = trimmed.slice(7).trim()
      hasExport = true
    } else if (trimmed.startsWith('export')) {
      lineWithoutExport = trimmed.slice(6)
      if (lineWithoutExport.length === 0 || /^[a-zA-Z_]/.test(lineWithoutExport) === false) {
        lineWithoutExport = trimmed
      } else {
        hasExport = true
        lineWithoutExport = lineWithoutExport.trim()
      }
    }

    const equalsIndex = lineWithoutExport.indexOf('=')

    if (equalsIndex === -1) {
      errors.push(createError(
        ERROR_CODES.INVALID_LINE_FORMAT,
        `第 ${firstLineNum} 行缺少等号（=）分隔符`,
        { line: firstLineNum, rawLine: line }
      ))
      continue
    }

    const key = lineWithoutExport.slice(0, equalsIndex).trim()
    const rawValue = lineWithoutExport.slice(equalsIndex + 1)

    if (!isValidKey(key)) {
      errors.push(createError(
        ERROR_CODES.INVALID_KEY_FORMAT,
        `第 ${firstLineNum} 行的键名 "${key}" 格式无效，应为字母数字下划线且不以数字开头`,
        { line: firstLineNum, key }
      ))
      continue
    }

    if (!checkQuotesClosed(rawValue)) {
      errors.push(createError(
        ERROR_CODES.UNCLOSED_QUOTE,
        `第 ${firstLineNum} 行存在未闭合的引号`,
        { line: firstLineNum, key, rawValue }
      ))
      continue
    }

    const { value: valueWithoutComment, comment } = stripComment(rawValue)
    const finalValue = stripQuotes(valueWithoutComment)

    const entry = {
      key,
      value: finalValue,
      rawValue,
      lineNumbers: mapping.mergedLines,
      hasExport,
      comment,
      rawLine: line,
    }

    parsedEntries.push(entry)

    if (!duplicateInfo.has(key)) {
      duplicateInfo.set(key, [])
    }
    duplicateInfo.get(key).push({
      value: finalValue,
      lineNumbers: mapping.mergedLines,
      firstLine: firstLineNum,
      comment,
    })
  }

  const duplicates = []
  duplicateInfo.forEach((occurrences, key) => {
    if (occurrences.length > 1) {
      duplicates.push({
        key,
        occurrences,
        lastValue: occurrences[occurrences.length - 1].value,
        count: occurrences.length,
      })
    }
  })

  if (duplicates.length > 0) {
    warnings.push({
      type: 'warning',
      code: 'DUPLICATE_KEYS',
      message: `发现 ${duplicates.length} 个重复键`,
      details: duplicates,
    })
  }

  const uniqueEntries = new Map()
  parsedEntries.forEach((entry) => {
    uniqueEntries.set(entry.key, entry)
  })

  return {
    success: errors.length === 0 || errors.every(e => e.errorCode === ERROR_CODES.LINE_COUNT_EXCEEDED),
    warnings,
    errors,
    entries: parsedEntries,
    uniqueEntries: Array.from(uniqueEntries.values()),
    duplicates,
    stats: {
      totalLines: rawLines.length,
      processedLines: linesToProcess.length,
      validEntries: parsedEntries.length,
      uniqueKeys: uniqueEntries.size,
      duplicateCount: duplicates.length,
    },
  }
}

function formatAsSortedKeyList(entries) {
  return entries
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => `${entry.key}=${entry.value}`)
    .join('\n')
}

function formatAsTSV(entries) {
  const header = 'Key\tValue\tLine(s)\tHas Export\tComment'
  const rows = entries.map((entry) => {
    const value = entry.value.includes('\t') || entry.value.includes('\n')
      ? `"${entry.value.replace(/"/g, '""')}"`
      : entry.value
    return `${entry.key}\t${value}\t${entry.lineNumbers.join(',')}\t${entry.hasExport ? 'Yes' : 'No'}\t${entry.comment || ''}`
  })
  return [header, ...rows].join('\n')
}

export {
  isValidKey,
  joinContinuationLines,
  stripComment,
  stripQuotes,
  checkQuotesClosed,
  parseEnvContent,
  formatAsSortedKeyList,
  formatAsTSV,
}
