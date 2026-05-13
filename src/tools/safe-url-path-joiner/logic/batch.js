import { MAX_BATCH_LINES, LARGE_BATCH_THRESHOLD } from './constants.js'
import { ERROR_CODES, createError } from './errors.js'
import { joinSafe } from './joiner.js'

function parseBatchInput(input, separator = '|') {
  const lines = input.split(/\r?\n/)
  const result = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const segments = line.split(separator).map(s => s.trim())
    result.push({
      lineNumber: i + 1,
      rawLine: line,
      segments,
      isEmpty: line.trim().length === 0,
    })
  }

  return result
}

function processBatch(parsedLines, options) {
  const results = []
  const totalLines = parsedLines.length

  for (let i = 0; i < parsedLines.length; i++) {
    const line = parsedLines[i]

    if (line.isEmpty) {
      results.push({
        lineNumber: line.lineNumber,
        rawLine: line.rawLine,
        success: false,
        result: null,
        errors: [createError(ERROR_CODES.EMPTY_INPUT, { lineNumber: line.lineNumber })],
        warnings: [],
        diagnostics: [],
      })
      continue
    }

    const joinResult = joinSafe(line.segments, options)
    results.push({
      lineNumber: line.lineNumber,
      rawLine: line.rawLine,
      ...joinResult,
    })
  }

  return {
    totalLines,
    successCount: results.filter(r => r.success).length,
    errorCount: results.filter(r => !r.success).length,
    results,
  }
}

function validateBatchInput(input) {
  const lineCount = (input.match(/\n/g) || []).length + 1

  if (lineCount > MAX_BATCH_LINES) {
    return {
      valid: false,
      error: createError(ERROR_CODES.TOO_MANY_LINES, {
        count: lineCount,
        max: MAX_BATCH_LINES,
      }),
    }
  }

  return {
    valid: true,
    lineCount,
    isLarge: lineCount > LARGE_BATCH_THRESHOLD,
  }
}

function buildTreeFromBase(basePath, children, separator = '/') {
  const tree = {
    name: basePath,
    children: [],
  }

  for (const child of children) {
    const parts = child.split(separator).filter(p => p && p !== '.')
    let current = tree

    for (const part of parts) {
      let found = current.children.find(c => c.name === part)
      if (!found) {
        found = { name: part, children: [] }
        current.children.push(found)
      }
      current = found
    }
  }

  return tree
}

function formatTreeForDisplay(tree, indent = '') {
  const lines = []
  lines.push(indent + tree.name)

  const childCount = tree.children.length
  for (let i = 0; i < childCount; i++) {
    const child = tree.children[i]
    const isLast = i === childCount - 1
    const childIndent = indent + (isLast ? '    ' : '│   ')
    const connector = isLast ? '└── ' : '├── '
    const childLines = formatTreeForDisplay(child, childIndent)
    const firstLine = childLines[0]
    lines.push(indent + connector + firstLine)
    lines.push(...childLines.slice(1))
  }

  return lines
}

function processLargeBatchAsync(parsedLines, options, onProgress) {
  return new Promise((resolve) => {
    const results = []
    let index = 0
    const chunkSize = 10

    function processChunk() {
      const endIndex = Math.min(index + chunkSize, parsedLines.length)

      for (let i = index; i < endIndex; i++) {
        const line = parsedLines[i]

        if (line.isEmpty) {
          results.push({
            lineNumber: line.lineNumber,
            rawLine: line.rawLine,
            success: false,
            result: null,
            errors: [createError(ERROR_CODES.EMPTY_INPUT, { lineNumber: line.lineNumber })],
            warnings: [],
            diagnostics: [],
          })
        } else {
          const joinResult = joinSafe(line.segments, options)
          results.push({
            lineNumber: line.lineNumber,
            rawLine: line.rawLine,
            ...joinResult,
          })
        }
      }

      index = endIndex

      if (onProgress) {
        onProgress(index / parsedLines.length)
      }

      if (index < parsedLines.length) {
        setTimeout(processChunk, 0)
      } else {
        resolve({
          totalLines: parsedLines.length,
          successCount: results.filter(r => r.success).length,
          errorCount: results.filter(r => !r.success).length,
          results,
        })
      }
    }

    processChunk()
  })
}

export {
  parseBatchInput,
  processBatch,
  validateBatchInput,
  buildTreeFromBase,
  formatTreeForDisplay,
  processLargeBatchAsync,
}
