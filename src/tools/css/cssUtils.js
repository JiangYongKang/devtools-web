/**
 * CSS 排版整理与压缩工具
 * 
 * 策略约定（与研发、DOC 一致）：
 * 1. 注释处理：
 *    - 基础模式：移除所有 /* 注释
 *    - 保留模式：保留 /*! 开头的重要注释
 * 2. Source Map：
 *    - 不生成 source map，仅处理源码文本
 *    - 输入中的 /*# sourceMappingURL= 会被保留（如需）或移除（默认移除）
 * 3. 压缩等级：
 *    - 低风险：仅移除空白和注释
 *    - 中风险：+ 合并可合并的声明、缩短十六进制颜色
 *    - 高风险：+ 移除最后一个分号、零值单位省略
 */

const COMPRESSION_LEVELS = [
  {
    id: 'min',
    name: '轻度压缩',
    description: '仅移除多余空白与注释，低风险',
    risk: 'low',
  },
  {
    id: 'standard',
    name: '标准压缩',
    description: '合并声明、缩短颜色，中等风险',
    risk: 'medium',
  },
  {
    id: 'max',
    name: '高度压缩',
    description: '零值单位省略、移除最后分号等，较高风险',
    risk: 'high',
  },
]

const FORMAT_OPTIONS = [
  {
    id: '2',
    name: '2 空格',
  },
  {
    id: '4',
    name: '4 空格',
  },
  {
    id: 'tab',
    name: 'Tab',
  },
]

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i]
}

const TOKEN = {
  COMMENT: 'comment',
  COMMENT_IMPORTANT: 'comment_important',
  STRING: 'string',
  AT_RULE: 'at_rule',
  SELECTOR: 'selector',
  PROPERTY: 'property',
  VALUE: 'value',
  SEMICOLON: 'semicolon',
  OPEN_BRACE: 'open_brace',
  CLOSE_BRACE: 'close_brace',
  COLON: 'colon',
  WHITESPACE: 'whitespace',
  COMMA: 'comma',
  SOURCE_MAP: 'source_map',
  UNKNOWN: 'unknown',
}

function tokenize(css) {
  const tokens = []
  let i = 0
  const len = css.length

  while (i < len) {
    const char = css[i]
    const nextChar = css[i + 1]

    if (char === '/' && nextChar === '*') {
      let j = i + 2
      let content = '/*'
      let isImportant = false
      let isSourceMap = false

      if (css[j] === '!') {
        isImportant = true
      }

      while (j < len) {
        content += css[j]
        if (css[j] === '*' && css[j + 1] === '/') {
          content += '/'
          j++
          break
        }
        j++
      }

      if (content.includes('sourceMappingURL=')) {
        isSourceMap = true
      }

      tokens.push({
        type: isSourceMap ? TOKEN.SOURCE_MAP : isImportant ? TOKEN.COMMENT_IMPORTANT : TOKEN.COMMENT,
        value: content,
        start: i,
        end: j + 1,
      })
      i = j + 1
      continue
    }

    if (char === '"' || char === "'") {
      const quote = char
      let j = i + 1
      let value = char

      while (j < len) {
        value += css[j]
        if (css[j] === '\\' && j + 1 < len) {
          value += css[j + 1]
          j += 2
          continue
        }
        if (css[j] === quote) {
          break
        }
        j++
      }

      tokens.push({
        type: TOKEN.STRING,
        value,
        start: i,
        end: j + 1,
      })
      i = j + 1
      continue
    }

    if (/\s/.test(char)) {
      let j = i
      let value = ''
      while (j < len && /\s/.test(css[j])) {
        value += css[j]
        j++
      }
      tokens.push({
        type: TOKEN.WHITESPACE,
        value,
        start: i,
        end: j,
      })
      i = j
      continue
    }

    if (char === '{') {
      tokens.push({ type: TOKEN.OPEN_BRACE, value: '{', start: i, end: i + 1 })
      i++
      continue
    }
    if (char === '}') {
      tokens.push({ type: TOKEN.CLOSE_BRACE, value: '}', start: i, end: i + 1 })
      i++
      continue
    }
    if (char === ';') {
      tokens.push({ type: TOKEN.SEMICOLON, value: ';', start: i, end: i + 1 })
      i++
      continue
    }
    if (char === ':') {
      tokens.push({ type: TOKEN.COLON, value: ':', start: i, end: i + 1 })
      i++
      continue
    }
    if (char === ',') {
      tokens.push({ type: TOKEN.COMMA, value: ',', start: i, end: i + 1 })
      i++
      continue
    }

    let j = i
    let value = ''
    while (j < len && !/[\s{};:,]/.test(css[j])) {
      if (css[j] === '/' && css[j + 1] === '*') break
      if (css[j] === '"' || css[j] === "'") break
      value += css[j]
      j++
    }

    if (value) {
      tokens.push({
        type: TOKEN.UNKNOWN,
        value,
        start: i,
        end: j,
      })
      i = j
      continue
    }

    i++
  }

  return tokens
}

function buildAST(tokens) {
  const rules = []
  let i = 0
  const len = tokens.length

  function consumeWhitespace() {
    while (i < len && tokens[i].type === TOKEN.WHITESPACE) {
      i++
    }
  }

  while (i < len) {
    consumeWhitespace()

    if (i >= len) break

    const token = tokens[i]

    if (token.type === TOKEN.COMMENT || token.type === TOKEN.COMMENT_IMPORTANT || token.type === TOKEN.SOURCE_MAP) {
      rules.push({
        type: 'comment',
        subtype: token.type,
        value: token.value,
      })
      i++
      continue
    }

    if (token.type === TOKEN.UNKNOWN && token.value.startsWith('@')) {
      const atRule = {
        type: 'at_rule',
        name: token.value,
        prelude: [],
        rules: null,
      }
      i++

      while (i < len) {
        consumeWhitespace()
        if (i >= len) break
        const t = tokens[i]

        if (t.type === TOKEN.OPEN_BRACE) {
          i++
          atRule.rules = []
          let braceDepth = 1

          while (i < len && braceDepth > 0) {
            consumeWhitespace()
            if (i >= len) break

            const innerT = tokens[i]
            if (innerT.type === TOKEN.OPEN_BRACE) {
              braceDepth++
              atRule.rules.push(innerT)
              i++
            } else if (innerT.type === TOKEN.CLOSE_BRACE) {
              braceDepth--
              if (braceDepth > 0) {
                atRule.rules.push(innerT)
              }
              i++
            } else {
              atRule.rules.push(innerT)
              i++
            }
          }
          break
        } else if (t.type === TOKEN.SEMICOLON) {
          i++
          break
        } else {
          atRule.prelude.push(t)
          i++
        }
      }

      rules.push(atRule)
      continue
    }

    if (token.type === TOKEN.CLOSE_BRACE) {
      i++
      continue
    }

    const rule = {
      type: 'rule',
      selectors: [],
      declarations: [],
    }

    let selectorParts = []
    while (i < len) {
      consumeWhitespace()
      if (i >= len) break
      const t = tokens[i]

      if (t.type === TOKEN.OPEN_BRACE) {
        i++
        break
      }
      if (t.type === TOKEN.COMMA) {
        rule.selectors.push(selectorParts.join(''))
        selectorParts = []
        i++
        continue
      }
      selectorParts.push(t.value)
      i++
    }
    if (selectorParts.length > 0) {
      rule.selectors.push(selectorParts.join(''))
    }

    while (i < len) {
      consumeWhitespace()
      if (i >= len) break
      const t = tokens[i]

      if (t.type === TOKEN.CLOSE_BRACE) {
        i++
        break
      }

      if (t.type === TOKEN.COMMENT || t.type === TOKEN.COMMENT_IMPORTANT || t.type === TOKEN.SOURCE_MAP) {
        rule.declarations.push({
          type: 'comment',
          subtype: t.type,
          value: t.value,
        })
        i++
        continue
      }

      let property = ''
      while (i < len) {
        consumeWhitespace()
        if (i >= len) break
        const pt = tokens[i]
        if (pt.type === TOKEN.COLON) {
          i++
          break
        }
        property += pt.value
        i++
      }

      consumeWhitespace()

      let valueParts = []
      while (i < len) {
        if (i >= len) break
        const vt = tokens[i]
        if (vt.type === TOKEN.SEMICOLON) {
          i++
          break
        }
        if (vt.type === TOKEN.CLOSE_BRACE) {
          break
        }
        if (vt.type === TOKEN.WHITESPACE) {
          if (valueParts.length > 0) {
            const lastPart = valueParts[valueParts.length - 1]
            if (!lastPart.endsWith(' ')) {
              valueParts.push(' ')
            }
          }
          i++
          continue
        }
        valueParts.push(vt.value)
        i++
      }

      const value = valueParts.join('').trim()

      if (property) {
        rule.declarations.push({
          type: 'declaration',
          property: property.trim(),
          value,
        })
      }
    }

    rules.push(rule)
  }

  return rules
}

function parseCSS(css) {
  try {
    const tokens = tokenize(css)
    const ast = buildAST(tokens)
    return { success: true, ast, error: null }
  } catch (err) {
    return {
      success: false,
      ast: null,
      error: err?.message || 'CSS 解析失败',
    }
  }
}

function getIndent(indentOption, level = 1) {
  const base = indentOption === 'tab' ? '\t' : ' '.repeat(parseInt(indentOption) || 2)
  return base.repeat(level)
}

function formatCSS(css, options = {}) {
  const { indent = '2', removeComments = false, keepImportant = true, keepSourceMap = false } = options

  const parsed = parseCSS(css)
  if (!parsed.success) {
    return { success: false, result: '', error: parsed.error }
  }

  const { ast } = parsed
  const lines = []

  function formatPrelude(prelude) {
    return prelude.map(t => {
      if (t.type === TOKEN.WHITESPACE) return ' '
      return t.value
    }).join('').trim()
  }

  function formatRule(rule, level = 1) {
    if (rule.type === 'comment') {
      if (removeComments) {
        if (keepImportant && rule.subtype === TOKEN.COMMENT_IMPORTANT) {
          return [getIndent(indent, level - 1) + rule.value]
        }
        if (keepSourceMap && rule.subtype === TOKEN.SOURCE_MAP) {
          return [getIndent(indent, level - 1) + rule.value]
        }
        return []
      }
      return [getIndent(indent, level - 1) + rule.value]
    }

    if (rule.type === 'at_rule') {
      const ruleLines = []
      const preludeStr = formatPrelude(rule.prelude)
      const prefix = getIndent(indent, level - 1)

      if (rule.rules === null) {
        ruleLines.push(prefix + rule.name + (preludeStr ? ' ' + preludeStr : '') + ';')
      } else {
        ruleLines.push(prefix + rule.name + (preludeStr ? ' ' + preludeStr : '') + ' {')

        const innerParsed = buildAST(rule.rules.filter(t => t.type !== TOKEN.OPEN_BRACE && t.type !== TOKEN.CLOSE_BRACE))
        for (const innerRule of innerParsed) {
          ruleLines.push(...formatRule(innerRule, level + 1))
        }

        ruleLines.push(prefix + '}')
      }
      return ruleLines
    }

    if (rule.type === 'rule') {
      const ruleLines = []
      const prefix = getIndent(indent, level - 1)
      const selectorsStr = rule.selectors.join(',\n' + prefix)
      ruleLines.push(prefix + selectorsStr + ' {')

      for (const decl of rule.declarations) {
        if (decl.type === 'comment') {
          if (removeComments) {
            if (keepImportant && decl.subtype === TOKEN.COMMENT_IMPORTANT) {
              ruleLines.push(getIndent(indent, level) + decl.value)
            }
            if (keepSourceMap && decl.subtype === TOKEN.SOURCE_MAP) {
              ruleLines.push(getIndent(indent, level) + decl.value)
            }
            continue
          }
          ruleLines.push(getIndent(indent, level) + decl.value)
          continue
        }

        if (decl.type === 'declaration') {
          ruleLines.push(getIndent(indent, level) + decl.property + ': ' + decl.value + ';')
        }
      }

      ruleLines.push(prefix + '}')
      return ruleLines
    }

    return []
  }

  for (const rule of ast) {
    const formatted = formatRule(rule, 1)
    if (formatted.length > 0) {
      lines.push(...formatted)
    }
  }

  return {
    success: true,
    result: lines.join('\n'),
    error: null,
  }
}

function shortenHexColor(value) {
  return value.replace(/#([0-9a-fA-F]{6})\b/g, (match, hex) => {
    const r = hex[0]
    const g = hex[2]
    const b = hex[4]
    if (hex[0] === hex[1] && hex[2] === hex[3] && hex[4] === hex[5]) {
      return '#' + r + g + b
    }
    return match
  }).toLowerCase()
}

function removeZeroUnits(value, level) {
  if (level.id !== 'max') return value

  return value.replace(/\b0(px|em|rem|%|pt|cm|mm|in|pc|ex|ch|vw|vh|vmin|vmax|deg|rad|grad|turn|s|ms)\b/gi, '0')
}

function compressCSS(css, options = {}) {
  const { level = COMPRESSION_LEVELS[1], removeComments = true, keepImportant = false, keepSourceMap = false } = options

  const parsed = parseCSS(css)
  if (!parsed.success) {
    return { success: false, result: '', error: parsed.error }
  }

  const { ast } = parsed
  const parts = []

  function compressRule(rule) {
    if (rule.type === 'comment') {
      if (removeComments) {
        if (keepImportant && rule.subtype === TOKEN.COMMENT_IMPORTANT) {
          return rule.value
        }
        if (keepSourceMap && rule.subtype === TOKEN.SOURCE_MAP) {
          return rule.value
        }
        return ''
      }
      return rule.value
    }

    if (rule.type === 'at_rule') {
      let preludeStr = rule.prelude
        .map(t => (t.type === TOKEN.WHITESPACE ? ' ' : t.value))
        .join('')
        .replace(/\s+/g, ' ')
        .trim()

      if (level.id !== 'min') {
        preludeStr = shortenHexColor(preludeStr)
        preludeStr = removeZeroUnits(preludeStr, level)
      }

      if (rule.rules === null) {
        return rule.name + (preludeStr ? ' ' + preludeStr : '') + ';'
      }

      const innerParsed = buildAST(rule.rules.filter(t => t.type !== TOKEN.OPEN_BRACE && t.type !== TOKEN.CLOSE_BRACE))
      let innerContent = ''
      for (const innerRule of innerParsed) {
        innerContent += compressRule(innerRule)
      }

      return rule.name + (preludeStr ? ' ' + preludeStr : '') + '{' + innerContent + '}'
    }

    if (rule.type === 'rule') {
      const selectorsStr = rule.selectors
        .map(s => s.replace(/\s+/g, ' ').trim())
        .join(',')

      let declParts = []
      const declarations = rule.declarations.filter(d => d.type === 'declaration')

      const mergedDecls = new Map()
      for (const decl of declarations) {
        mergedDecls.set(decl.property.toLowerCase(), decl)
      }

      const finalDecls = level.id === 'min' ? declarations : Array.from(mergedDecls.values())

      for (let j = 0; j < finalDecls.length; j++) {
        const decl = finalDecls[j]
        let value = decl.value.replace(/\s+/g, ' ').trim()

        if (level.id !== 'min') {
          value = shortenHexColor(value)
          value = removeZeroUnits(value, level)
        }

        const isLast = j === finalDecls.length - 1
        const semicolon = (level.id === 'max' && isLast) ? '' : ';'
        declParts.push(decl.property.toLowerCase() + ':' + value + semicolon)
      }

      if (declParts.length === 0) {
        return ''
      }

      return selectorsStr + '{' + declParts.join('') + '}'
    }

    return ''
  }

  for (const rule of ast) {
    const compressed = compressRule(rule)
    if (compressed) {
      parts.push(compressed)
    }
  }

  let result = parts.join('')

  result = result
    .replace(/\n+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};:,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim()

  return {
    success: true,
    result,
    error: null,
  }
}

export {
  COMPRESSION_LEVELS,
  FORMAT_OPTIONS,
  parseCSS,
  formatCSS,
  compressCSS,
  escapeHtml,
  formatBytes,
}
