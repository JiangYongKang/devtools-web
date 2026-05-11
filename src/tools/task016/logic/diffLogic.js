const MAX_SAFE_INPUT_SIZE = 500 * 1024
const MAX_SAFE_SEGMENTS = 10000
const DIFF_TIMEOUT_MS = 5000

const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  INPUT_TOO_LARGE: 'INPUT_TOO_LARGE',
  TOO_MANY_SEGMENTS: 'TOO_MANY_SEGMENTS',
  DIFF_TIMEOUT: 'DIFF_TIMEOUT',
  DIFF_INTERRUPTED: 'DIFF_INTERRUPTED',
  DIFF_ERROR: 'DIFF_ERROR',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: '输入文本不能为空',
  [ERROR_CODES.INVALID_PARAMETER]: '参数无效',
  [ERROR_CODES.INPUT_TOO_LARGE]: '输入内容过大',
  [ERROR_CODES.TOO_MANY_SEGMENTS]: '差异片段数量超出限制',
  [ERROR_CODES.DIFF_TIMEOUT]: '对比超时',
  [ERROR_CODES.DIFF_INTERRUPTED]: '对比被中断',
  [ERROR_CODES.DIFF_ERROR]: '对比过程中发生错误',
}

const OPERATION = {
  EQUAL: 'equal',
  DELETE: 'delete',
  INSERT: 'insert',
}

const GRANULARITY = {
  LINE: 'line',
  WORD: 'word',
}

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  if (typeof document !== 'undefined') {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const safeIndex = Math.min(i, units.length - 1)
  return parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(2)) + ' ' + units[safeIndex]
}

function validateInputs(leftText, rightText, options = {}) {
  const { granularity = GRANULARITY.LINE, ignoreWhitespace = false, normalizeNewlines = true } = options

  if (leftText == null || rightText == null) {
    return {
      valid: false,
      error: {
        code: ERROR_CODES.NULL_INPUT,
        message: ERROR_MESSAGES[ERROR_CODES.NULL_INPUT],
      },
    }
  }

  if (typeof leftText !== 'string' || typeof rightText !== 'string') {
    return {
      valid: false,
      error: {
        code: ERROR_CODES.NULL_INPUT,
        message: ERROR_MESSAGES[ERROR_CODES.NULL_INPUT],
      },
    }
  }

  if (granularity !== GRANULARITY.LINE && granularity !== GRANULARITY.WORD) {
    return {
      valid: false,
      error: {
        code: ERROR_CODES.INVALID_PARAMETER,
        message: `${ERROR_MESSAGES[ERROR_CODES.INVALID_PARAMETER]}: granularity 必须为 'line' 或 'word'`,
      },
    }
  }

  if (typeof ignoreWhitespace !== 'boolean') {
    return {
      valid: false,
      error: {
        code: ERROR_CODES.INVALID_PARAMETER,
        message: `${ERROR_MESSAGES[ERROR_CODES.INVALID_PARAMETER]}: ignoreWhitespace 必须为布尔值`,
      },
    }
  }

  if (typeof normalizeNewlines !== 'boolean') {
    return {
      valid: false,
      error: {
        code: ERROR_CODES.INVALID_PARAMETER,
        message: `${ERROR_MESSAGES[ERROR_CODES.INVALID_PARAMETER]}: normalizeNewlines 必须为布尔值`,
      },
    }
  }

  const leftSize = new Blob([leftText]).size
  const rightSize = new Blob([rightText]).size

  if (leftSize > MAX_SAFE_INPUT_SIZE || rightSize > MAX_SAFE_INPUT_SIZE) {
    return {
      valid: false,
      error: {
        code: ERROR_CODES.INPUT_TOO_LARGE,
        message: `${ERROR_MESSAGES[ERROR_CODES.INPUT_TOO_LARGE]}：建议使用小于 ${formatBytes(MAX_SAFE_INPUT_SIZE)} 的内容`,
      },
    }
  }

  return {
    valid: true,
    error: null,
  }
}

function normalizeText(text, options = {}) {
  const { ignoreWhitespace = false, normalizeNewlines = true } = options

  let normalized = text

  if (normalizeNewlines) {
    normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  }

  if (ignoreWhitespace) {
    normalized = normalized.replace(/[ \t]+/g, ' ')
  }

  return normalized
}

function tokenizeByLine(text) {
  if (text === '') return []

  const lines = []
  let start = 0
  let i = 0
  const len = text.length

  while (i < len) {
    if (text[i] === '\n') {
      lines.push({
        content: text.slice(start, i),
        lineStart: start,
        lineEnd: i,
      })
      start = i + 1
    }
    i++
  }

  if (start < len || text.endsWith('\n')) {
    lines.push({
      content: text.slice(start),
      lineStart: start,
      lineEnd: len,
    })
  }

  return lines
}

function tokenizeByWord(text) {
  if (text === '') return []

  const tokens = []
  const regex = /(\s+|[^\s]+)/g
  let match

  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      content: match[0],
      wordStart: match.index,
      wordEnd: match.index + match[0].length,
    })
  }

  return tokens
}

function tokenize(text, granularity) {
  if (granularity === GRANULARITY.LINE) {
    return tokenizeByLine(text)
  }
  return tokenizeByWord(text)
}

function computeLCS(arr1, arr2, getKey, startTime, timeoutMs) {
  const n = arr1.length
  const m = arr2.length

  if (n === 0 || m === 0) {
    const checkpoints = [
      { i: 0, j: 0 },
      { i: n, j: m },
    ]
    return { segments: [], checkpoints }
  }

  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (getKey(arr1[i - 1]) === getKey(arr2[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }

    if (timeoutMs && Date.now() - startTime > timeoutMs) {
      throw { code: ERROR_CODES.DIFF_TIMEOUT }
    }
  }

  const checkpoints = []
  let i = n
  let j = m

  while (i > 0 || j > 0) {
    checkpoints.push({ i, j })

    if (i > 0 && j > 0 && getKey(arr1[i - 1]) === getKey(arr2[j - 1])) {
      i--
      j--
    } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
      i--
    } else {
      j--
    }
  }

  checkpoints.push({ i: 0, j: 0 })
  checkpoints.reverse()

  return { segments: [], checkpoints }
}

function buildSegments(arr1, arr2, checkpoints, getKey) {
  const segments = []
  let leftIdx = 0
  let rightIdx = 0

  for (let k = 1; k < checkpoints.length; k++) {
    const prev = checkpoints[k - 1]
    const curr = checkpoints[k]

    const delCount = curr.i - prev.i
    const insCount = curr.j - prev.j

    if (delCount === 0 && insCount === 0) {
      continue
    }

    if (delCount > 0 && insCount > 0) {
      const delTokens = arr1.slice(prev.i, curr.i)
      const insTokens = arr2.slice(prev.j, curr.j)

      let allEqual = true
      for (let t = 0; t < delCount && t < insCount; t++) {
        if (getKey(delTokens[t]) !== getKey(insTokens[t])) {
          allEqual = false
          break
        }
      }

      if (allEqual && delCount === insCount) {
        for (let t = 0; t < delCount; t++) {
          const leftToken = delTokens[t]

          segments.push({
            operation: OPERATION.EQUAL,
            content: leftToken.content,
            leftStartIndex: leftIdx,
            leftEndIndex: leftIdx + 1,
            rightStartIndex: rightIdx,
            rightEndIndex: rightIdx + 1,
          })
          leftIdx++
          rightIdx++
        }
        continue
      }

      for (let t = 0; t < delCount; t++) {
        const token = delTokens[t]
        segments.push({
          operation: OPERATION.DELETE,
          content: token.content,
          leftStartIndex: leftIdx,
          leftEndIndex: leftIdx + 1,
          rightStartIndex: null,
          rightEndIndex: null,
        })
        leftIdx++
      }

      for (let t = 0; t < insCount; t++) {
        const token = insTokens[t]
        segments.push({
          operation: OPERATION.INSERT,
          content: token.content,
          leftStartIndex: null,
          leftEndIndex: null,
          rightStartIndex: rightIdx,
          rightEndIndex: rightIdx + 1,
        })
        rightIdx++
      }
    } else if (delCount > 0) {
      for (let t = 0; t < delCount; t++) {
        const token = arr1[prev.i + t]
        segments.push({
          operation: OPERATION.DELETE,
          content: token.content,
          leftStartIndex: leftIdx,
          leftEndIndex: leftIdx + 1,
          rightStartIndex: null,
          rightEndIndex: null,
        })
        leftIdx++
      }
    } else if (insCount > 0) {
      for (let t = 0; t < insCount; t++) {
        const token = arr2[prev.j + t]
        segments.push({
          operation: OPERATION.INSERT,
          content: token.content,
          leftStartIndex: null,
          leftEndIndex: null,
          rightStartIndex: rightIdx,
          rightEndIndex: rightIdx + 1,
        })
        rightIdx++
      }
    } else {
      const token1 = arr1[prev.i]

      segments.push({
        operation: OPERATION.EQUAL,
        content: token1.content,
        leftStartIndex: leftIdx,
        leftEndIndex: leftIdx + 1,
        rightStartIndex: rightIdx,
        rightEndIndex: rightIdx + 1,
      })
      leftIdx++
      rightIdx++
    }
  }

  return segments
}

function mergeEqualSegments(segments) {
  if (segments.length <= 1) return segments

  const merged = []
  let current = segments[0]

  for (let i = 1; i < segments.length; i++) {
    const next = segments[i]

    if (current.operation === next.operation && next.operation === OPERATION.EQUAL) {
      current = {
        ...current,
        content: current.content + next.content,
        leftEndIndex: next.leftEndIndex,
        rightEndIndex: next.rightEndIndex,
      }
    } else {
      merged.push(current)
      current = next
    }
  }

  merged.push(current)
  return merged
}

function computeDiff(leftText, rightText, options = {}) {
  const startTime = Date.now()
  const {
    granularity = GRANULARITY.LINE,
    ignoreWhitespace = false,
    normalizeNewlines = true,
    timeoutMs = DIFF_TIMEOUT_MS,
    maxSegments = MAX_SAFE_SEGMENTS,
  } = options

  const validation = validateInputs(leftText, rightText, { granularity, ignoreWhitespace, normalizeNewlines })
  if (!validation.valid) {
    return {
      success: false,
      result: null,
      error: validation.error,
    }
  }

  try {
    const normalizedLeft = normalizeText(leftText, { ignoreWhitespace, normalizeNewlines })
    const normalizedRight = normalizeText(rightText, { ignoreWhitespace, normalizeNewlines })

    const leftTokens = tokenize(normalizedLeft, granularity)
    const rightTokens = tokenize(normalizedRight, granularity)

    const getKey = (token) => token.content

    const { checkpoints } = computeLCS(leftTokens, rightTokens, getKey, startTime, timeoutMs)

    let segments = buildSegments(leftTokens, rightTokens, checkpoints, getKey)
    segments = mergeEqualSegments(segments)

    if (segments.length > maxSegments) {
      return {
        success: false,
        result: null,
        error: {
          code: ERROR_CODES.TOO_MANY_SEGMENTS,
          message: `${ERROR_MESSAGES[ERROR_CODES.TOO_MANY_SEGMENTS]}：限制为 ${maxSegments} 个片段`,
        },
      }
    }

    const stats = calculateStats(segments)

    return {
      success: true,
      result: {
        ...stats,
        segments,
      },
      error: null,
    }
  } catch (err) {
    if (err && err.code === ERROR_CODES.DIFF_TIMEOUT) {
      return {
        success: false,
        result: null,
        error: {
          code: ERROR_CODES.DIFF_TIMEOUT,
          message: ERROR_MESSAGES[ERROR_CODES.DIFF_TIMEOUT],
        },
      }
    }

    return {
      success: false,
      result: null,
      error: {
        code: ERROR_CODES.DIFF_ERROR,
        message: `${ERROR_MESSAGES[ERROR_CODES.DIFF_ERROR]}: ${err?.message || '未知错误'}`,
      },
    }
  }
}

function calculateStats(segments) {
  let deleteCount = 0
  let insertCount = 0
  let hasDifferences = false

  for (const segment of segments) {
    if (segment.operation === OPERATION.DELETE) {
      deleteCount++
      hasDifferences = true
    } else if (segment.operation === OPERATION.INSERT) {
      insertCount++
      hasDifferences = true
    }
  }

  return {
    hasDifferences,
    totalSegments: segments.length,
    deleteCount,
    insertCount,
  }
}

function groupSegmentsByOperation(segments) {
  const groups = {
    equal: [],
    delete: [],
    insert: [],
  }

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    groups[segment.operation].push({
      ...segment,
      index: i,
    })
  }

  return groups
}

export {
  MAX_SAFE_INPUT_SIZE,
  MAX_SAFE_SEGMENTS,
  DIFF_TIMEOUT_MS,
  ERROR_CODES,
  ERROR_MESSAGES,
  OPERATION,
  GRANULARITY,
  escapeHtml,
  formatBytes,
  validateInputs,
  normalizeText,
  tokenizeByLine,
  tokenizeByWord,
  tokenize,
  computeDiff,
  calculateStats,
  groupSegmentsByOperation,
}
