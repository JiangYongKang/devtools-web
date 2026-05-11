const MAX_SAFE_INPUT_SIZE = 500 * 1024

/**
 * HTML 转义函数，防止 XSS 攻击
 * 利用 DOM 原生特性进行安全转义
 * @param {string|null|undefined} text - 需要转义的文本
 * @returns {string} 转义后的安全 HTML 字符串
 */
function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

/**
 * 将字节数格式化为人类可读的字符串（B、KB、MB、GB）
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的字符串，如 "2.50 MB"
 */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const safeIndex = Math.min(i, units.length - 1)
  return parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(2)) + ' ' + units[safeIndex]
}

/**
 * HTML Token 类型枚举
 */
const TokenType = {
  COMMENT: 'comment',
  DOCTYPE: 'doctype',
  OPEN_TAG: 'open_tag',
  SELF_CLOSING_TAG: 'self_closing_tag',
  CLOSE_TAG: 'close_tag',
  TEXT: 'text',
  CDATA: 'cdata',
  SCRIPT_CONTENT: 'script_content',
  STYLE_CONTENT: 'style_content',
}

/**
 * HTML 自闭合标签列表（HTML5 标准）
 * 这些标签不需要闭合标签
 */
const SELF_CLOSING_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

/**
 * 特殊内容标签，其内容不应被解析为 HTML
 * - script: 包含 JavaScript
 * - style: 包含 CSS
 * - textarea: 用户输入
 * - pre: 预格式化文本
 */
const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea', 'pre'])

/**
 * 简单的 HTML Tokenizer（分词器）
 * 
 * 策略说明：
 * - 采用基于正则的轻量级解析，而非完整 DOM 解析
 * - 目标是保留原始语义的同时进行格式化，而非验证 HTML 正确性
 * - 对 script、style 等特殊标签使用原始文本模式
 * 
 * 兼容性假设：
 * - 假设输入是大体正确的 HTML
 * - 不处理极端错误的 HTML（如 <div <span>）
 * - 支持 HTML5 自闭合标签
 * 
 * @param {string} html - 输入的 HTML 字符串
 * @returns {Array} Token 数组
 */
function tokenizeHtml(html) {
  const tokens = []
  let index = 0
  const length = html.length

  /**
   * 匹配注释：<!-- ... -->
   * 注释内的所有内容保持原样
   */
  function parseComment() {
    const end = html.indexOf('-->', index)
    if (end === -1) {
      tokens.push({ type: TokenType.COMMENT, value: html.slice(index), raw: html.slice(index) })
      index = length
    } else {
      const content = html.slice(index, end + 3)
      tokens.push({ type: TokenType.COMMENT, value: content.slice(4, -3).trim(), raw: content })
      index = end + 3
    }
  }

  /**
   * 匹配 CDATA：<![CDATA[ ... ]]>
   * 用于嵌入 XML 风格的原始数据
   */
  function parseCData() {
    const end = html.indexOf(']]>', index)
    if (end === -1) {
      tokens.push({ type: TokenType.CDATA, value: html.slice(index), raw: html.slice(index) })
      index = length
    } else {
      const content = html.slice(index, end + 3)
      tokens.push({ type: TokenType.CDATA, value: content.slice(9, -3), raw: content })
      index = end + 3
    }
  }

  /**
   * 匹配 DOCTYPE：<!DOCTYPE ...>
   * 通常在文档开头，大小写不敏感
   */
  function parseDoctype() {
    const end = html.indexOf('>', index)
    if (end === -1) {
      tokens.push({ type: TokenType.DOCTYPE, value: html.slice(index), raw: html.slice(index) })
      index = length
    } else {
      const content = html.slice(index, end + 1)
      tokens.push({ type: TokenType.DOCTYPE, value: content, raw: content })
      index = end + 1
    }
  }

  /**
   * 解析标签（开始标签、自闭合标签、结束标签）
   * 格式：<tagname attrs> 或 <tagname attrs/> 或 </tagname>
   */
  function parseTag() {
    const start = index
    let inString = false
    let stringChar = ''
    let i = start + 1

    while (i < length) {
      const ch = html[i]
      if (!inString && (ch === '"' || ch === "'")) {
        inString = true
        stringChar = ch
      } else if (inString && ch === stringChar) {
        inString = false
      } else if (!inString && ch === '>') {
        break
      }
      i++
    }

    const tagContent = html.slice(start, i + 1)
    const isClose = tagContent.startsWith('</')
    const isSelfClosing = tagContent.endsWith('/>')

    let tagName = ''
    if (isClose) {
      tagName = tagContent.slice(2, -1).trim().toLowerCase()
    } else {
      const match = tagContent.match(/^<\s*([a-zA-Z0-9_-]+)/)
      if (match) tagName = match[1].toLowerCase()
    }

    if (isClose) {
      tokens.push({ type: TokenType.CLOSE_TAG, name: tagName, raw: tagContent })
    } else if (isSelfClosing || SELF_CLOSING_TAGS.has(tagName)) {
      tokens.push({ type: TokenType.SELF_CLOSING_TAG, name: tagName, raw: tagContent })
    } else {
      tokens.push({ type: TokenType.OPEN_TAG, name: tagName, raw: tagContent })
    }

    index = i + 1
  }

  /**
   * 解析原始文本内容（用于 script、style 等标签）
   * 寻找对应的结束标签
   */
  function parseRawText(tagName) {
    const closeTag = `</${tagName}`
    const endIndex = html.toLowerCase().indexOf(closeTag, index)
    let content
    if (endIndex === -1) {
      content = html.slice(index)
      index = length
    } else {
      content = html.slice(index, endIndex)
      index = endIndex
    }

    const type = tagName === 'script' ? TokenType.SCRIPT_CONTENT :
                 tagName === 'style' ? TokenType.STYLE_CONTENT :
                 TokenType.TEXT
    tokens.push({ type, value: content, raw: content })
  }

  /**
   * 解析普通文本内容
   * 直到遇到下一个 '<' 字符
   */
  function parseText() {
    let end = index
    while (end < length && html[end] !== '<') {
      end++
    }
    if (end > index) {
      const content = html.slice(index, end)
      tokens.push({ type: TokenType.TEXT, value: content, raw: content })
      index = end
    }
  }

  let rawTextContext = null

  while (index < length) {
    if (html.startsWith('<!--', index)) {
      parseComment()
    } else if (html.startsWith('<![CDATA[', index)) {
      parseCData()
    } else if (html.slice(index, index + 9).toLowerCase().startsWith('<!doctype')) {
      parseDoctype()
    } else if (html[index] === '<') {
      if (rawTextContext) {
        const peekEnd = html.indexOf('>', index)
        if (peekEnd !== -1) {
          const peekTag = html.slice(index, peekEnd + 1)
          const closeMatch = peekTag.match(/^<\/\s*([a-zA-Z0-9_-]+)/)
          if (closeMatch && closeMatch[1].toLowerCase() === rawTextContext) {
            rawTextContext = null
            parseTag()
            continue
          }
        }
        parseRawText(rawTextContext)
      } else {
        parseTag()
        const lastToken = tokens[tokens.length - 1]
        if (lastToken && lastToken.type === TokenType.OPEN_TAG && RAW_TEXT_TAGS.has(lastToken.name)) {
          rawTextContext = lastToken.name
        }
      }
    } else {
      if (rawTextContext) {
        parseRawText(rawTextContext)
      } else {
        parseText()
      }
    }
  }

  return tokens
}

/**
 * HTML 美化（格式化）
 * 
 * 策略说明：
 * 1. 自闭合标签：不增加缩进层级，前后换行
 * 2. 块级元素：子内容换行并缩进，结束标签新行
 * 3. 行内元素：保持紧凑，不额外换行
 * 4. script/style/pre/textarea：内容保持原始格式
 * 5. 注释：独立成行
 * 6. DOCTYPE：独立成行
 * 
 * 兼容性假设：
 * - 不区分 HTML 版本（HTML4/HTML5 均可）
 * - 对于非标准标签（自定义元素），视为块级元素处理
 * - 对无效 HTML 尽量容错，不抛出错误
 * 
 * @param {string} html - 输入的 HTML 字符串
 * @param {Object} options - 格式化选项
 * @param {string} options.indent - 缩进字符（默认 2 空格）
 * @returns {string} 美化后的 HTML
 */
function beautifyHtml(html, options = {}) {
  if (!html || !html.trim()) return ''

  const indent = options.indent || '  '
  const tokens = tokenizeHtml(html)

  const INLINE_TAGS = new Set([
    'a', 'abbr', 'acronym', 'b', 'bdi', 'bdo', 'big', 'br', 'button', 'cite',
    'code', 'data', 'datalist', 'del', 'dfn', 'em', 'i', 'img', 'input',
    'ins', 'kbd', 'label', 'mark', 'meter', 'noscript', 'object', 'output',
    'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'select', 'small',
    'span', 'strong', 'sub', 'sup', 'textarea', 'time', 'tt', 'u', 'var',
    'wbr',
  ])

  const result = []
  let currentIndent = 0
  let lastToken = null

  function getIndent() {
    return indent.repeat(currentIndent)
  }

  function shouldBreakBefore(token) {
    if (!lastToken) return false
    if (token.type === TokenType.DOCTYPE) return true
    if (token.type === TokenType.COMMENT) return true
    if (token.type === TokenType.OPEN_TAG && !INLINE_TAGS.has(token.name)) return true
    if (token.type === TokenType.SELF_CLOSING_TAG) return true
    if (token.type === TokenType.CLOSE_TAG) {
      return true
    }
    return false
  }

  function shouldBreakAfter(token) {
    if (token.type === TokenType.DOCTYPE) return true
    if (token.type === TokenType.COMMENT) return true
    if (token.type === TokenType.OPEN_TAG && !INLINE_TAGS.has(token.name)) return true
    if (token.type === TokenType.SELF_CLOSING_TAG) return true
    if (token.type === TokenType.CLOSE_TAG) {
      return true
    }
    return false
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token.type === TokenType.TEXT) {
      const trimmed = token.value.trim()
      if (trimmed) {
        const hasNewline = token.value.includes('\n')
        const isOnlyWhitespace = /^\s*$/.test(token.value)
        
        if (!isOnlyWhitespace) {
          if (lastToken && (lastToken.type === TokenType.OPEN_TAG || lastToken.type === TokenType.SELF_CLOSING_TAG || lastToken.type === TokenType.CLOSE_TAG)) {
            const prevTag = lastToken.name
            if (lastToken.type === TokenType.OPEN_TAG && !INLINE_TAGS.has(prevTag)) {
              if (!hasNewline) {
                result.push('\n' + getIndent())
              }
            }
          }
          result.push(trimmed)
        }
      }
      lastToken = token
      continue
    }

    if (token.type === TokenType.SCRIPT_CONTENT || token.type === TokenType.STYLE_CONTENT) {
      result.push('\n')
      const lines = token.value.split('\n')
      const nonEmptyLines = lines.filter(l => l.trim().length > 0)
      if (nonEmptyLines.length > 0) {
        const minIndent = Math.min(...nonEmptyLines.map(l => {
          const match = l.match(/^(\s*)/)
          return match ? match[1].length : 0
        }))
        for (const line of lines) {
          const stripped = line.length > minIndent ? line.slice(minIndent) : line.trimStart()
          result.push(getIndent() + stripped + '\n')
        }
      }
      lastToken = token
      continue
    }

    if (token.type === TokenType.CLOSE_TAG) {
      const shouldIndent = !INLINE_TAGS.has(token.name)
      if (shouldIndent && lastToken && lastToken.type !== TokenType.OPEN_TAG) {
        currentIndent = Math.max(0, currentIndent - 1)
      }
      if (shouldBreakBefore(token) && lastToken && lastToken.type !== TokenType.OPEN_TAG) {
        result.push('\n' + getIndent())
      }
      result.push(token.raw)
      if (shouldIndent) {
        currentIndent = Math.max(0, currentIndent - 1)
      }
      if (shouldBreakAfter(token)) {
        result.push('\n')
      }
      lastToken = token
      continue
    }

    if (shouldBreakBefore(token) && lastToken && lastToken.type !== TokenType.OPEN_TAG) {
      if (!result.length || result[result.length - 1] !== '\n') {
        result.push('\n')
      }
    }

    if (token.type === TokenType.DOCTYPE || token.type === TokenType.COMMENT || token.type === TokenType.CDATA) {
      if (result.length && result[result.length - 1] !== '\n') {
        result.push('\n')
      }
      result.push(getIndent() + token.raw)
      if (shouldBreakAfter(token)) {
        result.push('\n')
      }
    } else if (token.type === TokenType.OPEN_TAG) {
      const isInline = INLINE_TAGS.has(token.name)
      const isRawText = RAW_TEXT_TAGS.has(token.name)
      
      if (!isInline && lastToken && lastToken.type === TokenType.OPEN_TAG) {
        result.push('\n')
      }
      
      if (!isInline && result.length && !result[result.length - 1].endsWith('\n')) {
        result.push('\n')
      }
      
      result.push(getIndent() + token.raw)
      
      if (!isInline && !isRawText) {
        currentIndent++
      }
      
      if (shouldBreakAfter(token)) {
        result.push('\n')
      }
    } else if (token.type === TokenType.SELF_CLOSING_TAG) {
      if (result.length && !result[result.length - 1].endsWith('\n')) {
        result.push('\n')
      }
      result.push(getIndent() + token.raw)
      if (shouldBreakAfter(token)) {
        result.push('\n')
      }
    }

    lastToken = token
  }

  let output = result.join('')
  output = output.replace(/\n{3,}/g, '\n\n')
  output = output.trim()

  return output
}

/**
 * HTML 压缩（单行压缩）
 * 
 * 策略说明：
 * 1. 移除 HTML 注释（可选）
 * 2. 移除多余的空白字符（空格、制表符、换行）
 * 3. 保留标签内的属性结构
 * 4. 保留 pre、textarea 等标签内的原始空白
 * 5. script、style 内容保留必要的换行
 * 
 * 兼容性假设：
 * - 不处理 HTML 内的 JavaScript/CSS 逻辑
 * - 不压缩属性值（保持原样）
 * - 不改变标签名称大小写
 * 
 * 注意：
 * - 本函数不做 XSS 消毒
 * - 不验证 HTML 语法正确性
 * 
 * @param {string} html - 输入的 HTML 字符串
 * @param {Object} options - 压缩选项
 * @param {boolean} options.removeComments - 是否移除注释（默认 true）
 * @param {boolean} options.collapseWhitespace - 是否折叠空白（默认 true）
 * @returns {string} 压缩后的 HTML
 */
function minifyHtml(html, options = {}) {
  if (!html || !html.trim()) return ''

  const removeComments = options.removeComments !== false
  const collapseWhitespace = options.collapseWhitespace !== false

  const tokens = tokenizeHtml(html)
  const result = []
  let inPre = false
  let inTextarea = false
  let lastIsText = false

  for (const token of tokens) {
    switch (token.type) {
      case TokenType.COMMENT:
        if (!removeComments) {
          result.push(token.raw)
        }
        lastIsText = false
        break

      case TokenType.DOCTYPE:
      case TokenType.CDATA:
        result.push(token.raw)
        lastIsText = false
        break

      case TokenType.OPEN_TAG:
        result.push(token.raw)
        if (token.name === 'pre') inPre = true
        if (token.name === 'textarea') inTextarea = true
        lastIsText = false
        break

      case TokenType.SELF_CLOSING_TAG:
        result.push(token.raw)
        lastIsText = false
        break

      case TokenType.CLOSE_TAG:
        result.push(token.raw)
        if (token.name === 'pre') inPre = false
        if (token.name === 'textarea') inTextarea = false
        lastIsText = false
        break

      case TokenType.SCRIPT_CONTENT:
      case TokenType.STYLE_CONTENT:
        {
          let content = token.value
          if (collapseWhitespace) {
            const lines = content.split('\n').map(line => line.trim())
            const nonEmpty = lines.filter(line => line.length > 0)
            content = nonEmpty.join(' ')
          }
          result.push(content)
        }
        lastIsText = true
        break

      case TokenType.TEXT:
        if (inPre || inTextarea) {
          result.push(token.value)
        } else {
          if (collapseWhitespace) {
            const trimmed = token.value.replace(/\s+/g, ' ')
            if (trimmed === ' ') {
              if (lastIsText) {
                result.push(' ')
              }
            } else {
              result.push(trimmed)
            }
          } else {
            result.push(token.value)
          }
        }
        lastIsText = token.value.trim().length > 0
        break
    }
  }

  let output = result.join('')
  if (collapseWhitespace) {
    output = output.replace(/\s{2,}/g, ' ')
    output = output.replace(/>\s+</g, '><')
    output = output.trim()
  }

  return output
}

export {
  MAX_SAFE_INPUT_SIZE,
  TokenType,
  SELF_CLOSING_TAGS,
  RAW_TEXT_TAGS,
  escapeHtml,
  formatBytes,
  tokenizeHtml,
  beautifyHtml,
  minifyHtml,
}
