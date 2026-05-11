const MAX_TEXT_LENGTH = 100000
const MAX_PATTERN_LENGTH = 1000
const MAX_MATCH_COUNT = 500
const EXECUTION_TIMEOUT_MS = 2000

const FLAGS = [
  { id: 'g', name: 'g', description: '全局匹配（查找所有匹配项）', default: true },
  { id: 'i', name: 'i', description: '忽略大小写', default: false },
  { id: 'm', name: 'm', description: '多行模式（^ 和 $ 匹配每行）', default: false },
  { id: 's', name: 's', description: '点号匹配换行符', default: false },
  { id: 'u', name: 'u', description: 'Unicode 模式', default: false },
]

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function compileRegex(pattern, flagsStr) {
  if (!pattern) {
    return { regex: null, error: '请输入正则表达式' }
  }

  if (pattern.length > MAX_PATTERN_LENGTH) {
    return { regex: null, error: `正则表达式过长（${pattern.length} 字符），建议限制在 ${MAX_PATTERN_LENGTH} 字符以内` }
  }

  try {
    const regex = new RegExp(pattern, flagsStr || 'g')
    return { regex, error: null }
  } catch (err) {
    return { regex: null, error: `正则表达式语法错误：${err?.message || '未知错误'}` }
  }
}

function executeRegexWithTimeout(regex, text) {
  return new Promise((resolve, reject) => {
    let hasTimedOut = false
    const timeoutId = setTimeout(() => {
      hasTimedOut = true
      reject(new Error(`匹配超时（超过 ${EXECUTION_TIMEOUT_MS}ms），可能是复杂表达式或回溯导致`))
    }, EXECUTION_TIMEOUT_MS)

    try {
      const matches = []
      const source = regex.source
      const flags = regex.flags

      if (!flags.includes('g')) {
        const match = text.match(regex)
        if (match) {
          matches.push({
            index: match.index,
            match: match[0],
            groups: match.slice(1),
            namedGroups: match.groups || {},
            length: match[0].length,
          })
        }
        clearTimeout(timeoutId)
        resolve({ matches, matchCount: matches.length })
        return
      }

      const workingRegex = new RegExp(source, flags)
      let matchCount = 0
      let lastIndex = 0

      while (!hasTimedOut) {
        const match = workingRegex.exec(text)
        if (!match) break

        if (matches.length < MAX_MATCH_COUNT) {
          matches.push({
            index: match.index,
            match: match[0],
            groups: match.slice(1),
            namedGroups: match.groups || {},
            length: match[0].length,
          })
        }

        matchCount++

        if (match[0].length === 0) {
          workingRegex.lastIndex = match.index + 1
          if (workingRegex.lastIndex === lastIndex) break
          lastIndex = workingRegex.lastIndex
        }
      }

      clearTimeout(timeoutId)
      resolve({ matches, matchCount, hasMoreMatches: matchCount > MAX_MATCH_COUNT })
    } catch (err) {
      clearTimeout(timeoutId)
      reject(err)
    }
  })
}

function buildHighlightedHtml(text, matches) {
  if (!text) return ''

  const sortedMatches = [...matches].sort((a, b) => a.index - b.index)
  const mergedMatches = []

  for (const m of sortedMatches) {
    if (m.length === 0) continue
    const start = m.index
    const end = m.index + m.length

    if (mergedMatches.length === 0) {
      mergedMatches.push({ start, end })
      continue
    }

    const last = mergedMatches[mergedMatches.length - 1]
    if (start <= last.end) {
      last.end = Math.max(last.end, end)
    } else {
      mergedMatches.push({ start, end })
    }
  }

  if (mergedMatches.length === 0) {
    return escapeHtml(text)
  }

  const parts = []
  let pos = 0

  for (const m of mergedMatches) {
    if (m.start > pos) {
      parts.push(escapeHtml(text.slice(pos, m.start)))
    }
    parts.push(`<mark class="match-highlight">${escapeHtml(text.slice(m.start, m.end))}</mark>`)
    pos = m.end
  }

  if (pos < text.length) {
    parts.push(escapeHtml(text.slice(pos)))
  }

  return parts.join('')
}

function validateInputs(pattern, text) {
  const warnings = []

  if (text && text.length > MAX_TEXT_LENGTH) {
    warnings.push({
      type: 'warning',
      message: `样本文本较长（${text.length} 字符），建议限制在 ${MAX_TEXT_LENGTH} 字符以内，避免性能问题`,
    })
  }

  if (pattern && pattern.length > MAX_PATTERN_LENGTH * 0.7) {
    warnings.push({
      type: 'warning',
      message: `正则表达式较长（${pattern.length} 字符），复杂表达式可能导致匹配缓慢或超时`,
    })
  }

  if (pattern) {
    const lookaroundWithGreedy = [
      /\(\?\=.*[*+{]/,
      /\(\?\!.*[*+{]/,
      /\(\?<=.*[*+{]/,
      /\(\?<!.*[*+{]/,
    ]

    for (const patternToCheck of lookaroundWithGreedy) {
      if (patternToCheck.test(pattern)) {
        warnings.push({
          type: 'warning',
          message: '检测到可能的回溯风险模式，建议避免在环视结构中使用贪婪量词',
        })
        break
      }
    }
  }

  return warnings
}

function formatMatchInfo(match, index) {
  const groups = match.groups || []
  const namedGroups = match.namedGroups || {}

  return {
    index,
    position: match.index,
    length: match.length,
    end: match.index + match.length,
    matchedText: match.match,
    captureGroups: groups.map((g, i) => ({ index: i + 1, value: g == null ? '(未匹配)' : g })),
    namedGroups: Object.keys(namedGroups).map((name) => ({
      name,
      value: namedGroups[name] == null ? '(未匹配)' : namedGroups[name],
    })),
  }
}

export {
  FLAGS,
  MAX_TEXT_LENGTH,
  MAX_PATTERN_LENGTH,
  MAX_MATCH_COUNT,
  EXECUTION_TIMEOUT_MS,
  escapeHtml,
  compileRegex,
  executeRegexWithTimeout,
  buildHighlightedHtml,
  validateInputs,
  formatMatchInfo,
}
