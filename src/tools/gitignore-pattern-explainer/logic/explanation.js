import { TOKEN_TYPES } from './constants.js'

function formatCharClassDetails(charClass) {
  const parts = []

  if (charClass.chars.length > 0) {
    parts.push(`字符：${charClass.chars.join(', ')}`)
  }

  if (charClass.ranges && charClass.ranges.length > 0) {
    const rangeStr = charClass.ranges
      .map((r) => `${r.start} 到 ${r.end}`)
      .join(', ')
    parts.push(`范围：${rangeStr}`)
  }

  return parts.join('；')
}

function generateTokenExplanation(token, isDirectoryOnly = false) {
  switch (token.type) {
    case TOKEN_TYPES.DOUBLE_ASTERISK:
      return {
        symbol: '**',
        explanation: '双星号，跨目录级别的匹配。可以匹配任意层级的路径。',
        examples: ['**/node_modules 匹配任何位置的 node_modules 目录', 'a/**/b 匹配 a/x/b、a/y/z/b 等'],
      }

    case TOKEN_TYPES.ASTERISK:
      return {
        symbol: '*',
        explanation: '星号，匹配零个或多个字符，但不包含路径分隔符 /。',
        examples: ['*.txt 匹配 foo.txt、bar.txt，但不匹配 sub/foo.txt'],
      }

    case TOKEN_TYPES.QUESTION_MARK:
      return {
        symbol: '?',
        explanation: '问号，匹配单个任意字符，但不包含路径分隔符 /。',
        examples: ['file?.log 匹配 file1.log、fileA.log，但不匹配 file10.log'],
      }

    case TOKEN_TYPES.CHAR_CLASS:
      const negationText = token.negated ? '（取反：不匹配）' : ''
      return {
        symbol: token.value,
        explanation: `字符类 ${negationText}：${formatCharClassDetails(token)}`,
        examples: token.negated
          ? [`[!0-9] 匹配任意非数字字符`, `[^abc] 匹配除 a、b、c 以外的字符`]
          : [`[abc] 匹配 a、b 或 c 中任一字符`, `[0-9] 匹配任意数字`],
      }

    case TOKEN_TYPES.LEADING_SLASH:
      return {
        symbol: '/（前导）',
        explanation: '前导斜杠，将模式锚定到仓库根目录。只匹配根目录下的路径。',
        examples: ['/build 只匹配仓库根目录下的 build/ 目录', '/README.md 只匹配根目录下的 README.md'],
      }

    case TOKEN_TYPES.TRAILING_SLASH:
      return {
        symbol: '/（末尾）',
        explanation: '末尾斜杠，表示只匹配目录，不匹配文件。',
        examples: ['dist/ 匹配 dist 目录，但不匹配名为 dist 的文件'],
      }

    case TOKEN_TYPES.SLASH:
      return {
        symbol: '/',
        explanation: '路径分隔符，用于分隔目录层级。',
        examples: ['a/b/c 匹配 a 目录下 b 目录下的 c'],
      }

    case TOKEN_TYPES.LITERAL:
      return {
        symbol: token.value,
        explanation: `字面字符："${token.value}"，精确匹配该字符。`,
        examples: [],
      }

    default:
      return {
        symbol: token.value,
        explanation: '未知 token。',
        examples: [],
      }
  }
}

function generatePatternExplanation(parsedPattern) {
  if (parsedPattern.isEmpty) {
    return {
      type: 'empty',
      rawPattern: parsedPattern.rawPattern,
      lineNumber: parsedPattern.lineNumber,
      summary: '空行',
      details: '空行，不参与匹配。',
      segments: [],
      warnings: [],
    }
  }

  if (parsedPattern.isComment) {
    return {
      type: 'comment',
      rawPattern: parsedPattern.rawPattern,
      lineNumber: parsedPattern.lineNumber,
      summary: '注释',
      details: `注释行：${parsedPattern.comment}`,
      segments: [],
      warnings: [],
    }
  }

  const segments = parsedPattern.tokens.map((token) =>
    generateTokenExplanation(token, parsedPattern.isDirectoryOnly),
  )

  const summaryParts = []
  const detailParts = []

  if (parsedPattern.isNegative) {
    summaryParts.push('否定')
    detailParts.push('这是一个否定模式（以 ! 开头），用于取消之前匹配规则的影响。')
    detailParts.push(
      '注意：如果某个目录已被之前的规则忽略，则该目录下的文件无法通过否定规则重新包含。',
    )
  }

  if (parsedPattern.isDirectoryOnly) {
    summaryParts.push('目录')
  }

  if (parsedPattern.isAnchored) {
    summaryParts.push('根目录限定')
    detailParts.push('模式以 / 开头，只匹配仓库根目录下的路径。')
  }

  const hasDoubleAsterisk = parsedPattern.tokens.some((t) => t.type === TOKEN_TYPES.DOUBLE_ASTERISK)
  const hasAsterisk = parsedPattern.tokens.some((t) => t.type === TOKEN_TYPES.ASTERISK)
  const hasQuestionMark = parsedPattern.tokens.some((t) => t.type === TOKEN_TYPES.QUESTION_MARK)
  const hasCharClass = parsedPattern.tokens.some((t) => t.type === TOKEN_TYPES.CHAR_CLASS)

  if (hasDoubleAsterisk) {
    summaryParts.push('跨目录递归')
    detailParts.push('使用 ** 进行跨目录级别的递归匹配。')
  }

  if (hasAsterisk || hasQuestionMark || hasCharClass) {
    summaryParts.push('通配匹配')
    detailParts.push('使用通配符进行模糊匹配。')
  }

  if (summaryParts.length === 0) {
    summaryParts.push('精确匹配')
  }

  const typeClass = parsedPattern.isNegative ? 'negation' : parsedPattern.isDirectoryOnly ? 'directory' : 'file'

  return {
    type: typeClass,
    rawPattern: parsedPattern.rawPattern,
    lineNumber: parsedPattern.lineNumber,
    summary: summaryParts.join(' · '),
    details: detailParts.join(' '),
    segments,
    warnings: parsedPattern.warnings || [],
    unsupported: parsedPattern.warnings && parsedPattern.warnings.some((w) => w.type === 'unsupported'),
  }
}

function generateAllExplanations(parsedPatterns) {
  const explanations = []
  const summary = {
    totalPatterns: 0,
    commentLines: 0,
    emptyLines: 0,
    validPatterns: 0,
    negationPatterns: 0,
    directoryPatterns: 0,
    anchoredPatterns: 0,
    warnings: [],
    hasUnsupported: false,
  }

  for (const parsed of parsedPatterns) {
    const explanation = generatePatternExplanation(parsed)
    explanations.push(explanation)

    if (parsed.isEmpty) {
      summary.emptyLines++
    } else if (parsed.isComment) {
      summary.commentLines++
    } else {
      summary.totalPatterns++
      summary.validPatterns++

      if (parsed.isNegative) summary.negationPatterns++
      if (parsed.isDirectoryOnly) summary.directoryPatterns++
      if (parsed.isAnchored) summary.anchoredPatterns++

      if (parsed.warnings && parsed.warnings.length > 0) {
        summary.warnings.push(...parsed.warnings)
        if (parsed.warnings.some((w) => w.type === 'unsupported')) {
          summary.hasUnsupported = true
        }
      }
    }
  }

  return {
    summary,
    explanations,
  }
}

export { generateTokenExplanation, generatePatternExplanation, generateAllExplanations }
