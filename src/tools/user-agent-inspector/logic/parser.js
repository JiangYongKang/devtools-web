import {
  BROWSER_PATTERNS,
  OS_PATTERNS,
  ENGINE_PATTERNS,
  BOT_PATTERNS,
  MOBILE_INDICATORS,
  TABLET_INDICATORS,
  DEVICE_TYPES,
} from './constants'
import {
  ERROR_CODES,
  createError,
} from './errors'

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

function extractMajorVersion(version) {
  if (!version) return null
  const parts = version.split('.')
  return parts[0] || version
}

function parseParenthesesContent(ua) {
  const segments = []
  let depth = 0
  let current = ''
  let start = 0

  for (let i = 0; i < ua.length; i++) {
    const char = ua[i]
    if (char === '(') {
      if (depth === 0) {
        if (current.trim()) {
          segments.push({ type: 'token', content: current.trim(), start, end: i })
        }
        current = ''
        start = i + 1
      } else {
        current += char
      }
      depth++
    } else if (char === ')') {
      depth--
      if (depth === 0) {
        segments.push({ type: 'parentheses', content: current.trim(), start, end: i })
        current = ''
        start = i + 1
      } else if (depth > 0) {
        current += char
      } else if (depth < 0) {
        depth = 0
      }
    } else {
      current += char
    }
  }

  if (current.trim() && depth === 0) {
    segments.push({ type: 'token', content: current.trim(), start, end: ua.length })
  }

  return segments
}

function parseKeyValuePairs(content) {
  const pairs = []
  const parts = content.split(';')

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    const slashMatch = trimmed.match(/^([^/]+)\/([^/]+)$/)
    if (slashMatch) {
      pairs.push({
        key: slashMatch[1].trim(),
        value: slashMatch[2].trim(),
        raw: trimmed,
      })
      continue
    }

    const eqMatch = trimmed.match(/^([^=]+)=(.+)$/)
    if (eqMatch) {
      pairs.push({
        key: eqMatch[1].trim(),
        value: eqMatch[2].trim(),
        raw: trimmed,
      })
      continue
    }

    pairs.push({
      key: null,
      value: trimmed,
      raw: trimmed,
    })
  }

  return pairs
}

function detectBrowser(ua) {
  for (const { name, pattern } of BROWSER_PATTERNS) {
    const match = ua.match(pattern)
    if (match) {
      return {
        name,
        version: match[1] || null,
        majorVersion: extractMajorVersion(match[1]),
      }
    }
  }
  return { name: 'Unknown', version: null, majorVersion: null }
}

function detectOS(ua) {
  for (const { name, pattern } of OS_PATTERNS) {
    if (pattern.test(ua)) {
      return { name, detected: true }
    }
  }
  return { name: 'Unknown', detected: false }
}

function detectEngine(ua) {
  for (const { name, pattern } of ENGINE_PATTERNS) {
    const match = ua.match(pattern)
    if (match) {
      return {
        name,
        version: match[1] || null,
      }
    }
  }
  return { name: 'Unknown', version: null }
}

function detectBot(ua) {
  for (const { name, pattern } of BOT_PATTERNS) {
    const match = ua.match(pattern)
    if (match) {
      return {
        name,
        isBot: true,
        version: match[1] || null,
      }
    }
  }
  return { name: null, isBot: false, version: null }
}

function detectDeviceType(ua) {
  const botInfo = detectBot(ua)
  if (botInfo.isBot) {
    return {
      type: DEVICE_TYPES.BOT,
      isMobile: false,
      isDesktop: false,
      isBot: true,
    }
  }

  for (const indicator of TABLET_INDICATORS) {
    if (indicator.test(ua)) {
      return {
        type: DEVICE_TYPES.TABLET,
        isMobile: true,
        isDesktop: false,
        isBot: false,
      }
    }
  }

  for (const indicator of MOBILE_INDICATORS) {
    if (indicator.test(ua)) {
      return {
        type: DEVICE_TYPES.MOBILE,
        isMobile: true,
        isDesktop: false,
        isBot: false,
      }
    }
  }

  return {
    type: DEVICE_TYPES.DESKTOP,
    isMobile: false,
    isDesktop: true,
    isBot: false,
  }
}

function buildNormalizedTable(ua, parseResult) {
  const table = []
  const segments = parseParenthesesContent(ua)

  table.push({
    key: 'browser.name',
    label: '浏览器名称',
    value: parseResult.browser.name,
    category: 'browser',
  })

  if (parseResult.browser.majorVersion) {
    table.push({
      key: 'browser.majorVersion',
      label: '浏览器主版本',
      value: parseResult.browser.majorVersion,
      category: 'browser',
    })
  }

  if (parseResult.browser.version) {
    table.push({
      key: 'browser.fullVersion',
      label: '浏览器完整版本',
      value: parseResult.browser.version,
      category: 'browser',
    })
  }

  table.push({
    key: 'engine.name',
    label: '渲染引擎',
    value: parseResult.engine.name,
    category: 'engine',
  })

  if (parseResult.engine.version) {
    table.push({
      key: 'engine.version',
      label: '渲染引擎版本',
      value: parseResult.engine.version,
      category: 'engine',
    })
  }

  table.push({
    key: 'os.name',
    label: '操作系统',
    value: parseResult.os.name,
    category: 'os',
  })

  table.push({
    key: 'device.type',
    label: '设备类型',
    value: parseResult.device.type,
    category: 'device',
  })

  table.push({
    key: 'device.isMobile',
    label: '是否移动设备',
    value: parseResult.device.isMobile ? '是' : '否',
    category: 'device',
  })

  if (parseResult.bot.isBot) {
    table.push({
      key: 'bot.name',
      label: '爬虫/工具名称',
      value: parseResult.bot.name,
      category: 'bot',
    })
  }

  table.push({
    key: 'ua.original',
    label: '原始字符串长度',
    value: String(ua.length),
    category: 'meta',
  })

  table.push({
    key: 'ua.segments',
    label: '解析出的段数',
    value: String(segments.length),
    category: 'meta',
  })

  let segmentIndex = 0
  for (const segment of segments) {
    if (segment.type === 'parentheses') {
      const pairs = parseKeyValuePairs(segment.content)
      for (const pair of pairs) {
        const key = pair.key || `segment.${segmentIndex}.unknown`
        table.push({
          key,
          label: pair.key || `未知字段 #${segmentIndex}`,
          value: pair.value,
          category: 'extracted',
          raw: pair.raw,
        })
      }
    } else {
      const tokens = segment.content.split(/\s+/)
      for (const token of tokens) {
        const slashMatch = token.match(/^([^/]+)\/(.+)$/)
        if (slashMatch) {
          table.push({
            key: slashMatch[1],
            label: slashMatch[1],
            value: slashMatch[2],
            category: 'extracted',
            raw: token,
          })
        } else if (token) {
          table.push({
            key: `token.${segmentIndex}`,
            label: `Token #${segmentIndex}`,
            value: token,
            category: 'token',
            raw: token,
          })
        }
        segmentIndex++
      }
    }
    segmentIndex++
  }

  return table
}

function buildSummaryLine(parseResult) {
  const parts = []

  if (parseResult.bot.isBot) {
    parts.push(`爬虫: ${parseResult.bot.name}`)
  } else {
    if (parseResult.browser.name !== 'Unknown') {
      const versionPart = parseResult.browser.majorVersion
        ? ` ${parseResult.browser.majorVersion}`
        : ''
      parts.push(`${parseResult.browser.name}${versionPart}`)
    }

    if (parseResult.engine.name !== 'Unknown') {
      parts.push(parseResult.engine.name)
    }
  }

  if (parseResult.os.name !== 'Unknown') {
    parts.push(parseResult.os.name)
  }

  const typeLabels = {
    [DEVICE_TYPES.DESKTOP]: '桌面',
    [DEVICE_TYPES.MOBILE]: '移动',
    [DEVICE_TYPES.TABLET]: '平板',
    [DEVICE_TYPES.BOT]: '爬虫',
    [DEVICE_TYPES.UNKNOWN]: '未知',
  }
  parts.push(typeLabels[parseResult.device.type] || '未知')

  return parts.join(' / ')
}

function parseUserAgent(uaString, options = {}) {
  const { truncate = true } = options
  const result = {
    success: true,
    error: null,
    result: null,
  }

  if (uaString == null || typeof uaString !== 'string') {
    result.success = false
    result.error = createError(ERROR_CODES.MALFORMED, '输入不是有效字符串')
    return result
  }

  const trimmed = uaString.trim()

  if (trimmed.length === 0) {
    result.success = false
    result.error = createError(ERROR_CODES.EMPTY_INPUT)
    return result
  }

  let processedUa = trimmed
  if (trimmed.length > 4096 && truncate) {
    processedUa = trimmed.slice(0, 4096)
    result.error = createError(ERROR_CODES.INPUT_TOO_LONG, `原始长度: ${trimmed.length}，已截断为 4096 字符`)
  }

  try {
    const browser = detectBrowser(processedUa)
    const os = detectOS(processedUa)
    const engine = detectEngine(processedUa)
    const bot = detectBot(processedUa)
    const device = detectDeviceType(processedUa)

    const parseResult = {
      browser,
      os,
      engine,
      bot,
      device,
    }

    const normalizedTable = buildNormalizedTable(processedUa, parseResult)
    const summaryLine = buildSummaryLine(parseResult)

    const jsonExport = {
      raw: processedUa,
      summary: summaryLine,
      browser,
      os,
      engine,
      device,
      bot,
      normalizedTable,
      _parsedAt: new Date().toISOString(),
    }

    result.result = {
      original: trimmed,
      processed: processedUa,
      normalizedTable,
      summaryLine,
      jsonExportString: JSON.stringify(jsonExport, null, 2),
    }

    const unknownCount = normalizedTable.filter(
      (item) =>
        item.value === 'Unknown' ||
        item.category === 'token' ||
        (item.key && item.key.startsWith('segment') && item.key.includes('unknown'))
    ).length

    if (!result.error && unknownCount > 3 && !bot.isBot) {
      result.error = createError(ERROR_CODES.PARTIAL_PARSE, `有 ${unknownCount} 个字段未能完全识别`)
    }
  } catch (err) {
    result.success = false
    result.error = createError(ERROR_CODES.MALFORMED, err?.message || '解析过程中发生错误')
  }

  return result
}

function highlightSearchResults(normalizedTable, searchToken) {
  if (!searchToken || !searchToken.trim()) {
    return normalizedTable.map((item) => ({
      ...item,
      isHighlighted: false,
    }))
  }

  const query = searchToken.trim().toLowerCase()

  return normalizedTable.map((item) => {
    const keyMatch = !!(item.key && item.key.toLowerCase().includes(query))
    const labelMatch = !!(item.label && item.label.toLowerCase().includes(query))
    const valueMatch = !!(item.value && item.value.toLowerCase().includes(query))
    const rawMatch = !!(item.raw && item.raw.toLowerCase().includes(query))

    return {
      ...item,
      isHighlighted: keyMatch || labelMatch || valueMatch || rawMatch,
    }
  })
}

export {
  parseUserAgent,
  highlightSearchResults,
  escapeHtml,
  parseParenthesesContent,
  parseKeyValuePairs,
  detectBrowser,
  detectOS,
  detectEngine,
  detectBot,
  detectDeviceType,
  buildNormalizedTable,
  buildSummaryLine,
  extractMajorVersion,
}
