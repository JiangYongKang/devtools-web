const SECURITY_POLICY_VERSION = '1.0.0'
const MAX_SOURCE_LENGTH = 100 * 1024

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']

const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'mark', 'del', 's', 'ins', 'u',
  'ul', 'ol', 'li',
  'blockquote',
  'code', 'pre',
  'a',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img',
  'div', 'span',
])

const ALLOWED_ATTRIBUTES = new Set([
  'href', 'src', 'alt', 'title',
  'class',
])

const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  SOURCE_EMPTY: 'SOURCE_EMPTY',
  SOURCE_TOO_LARGE: 'SOURCE_TOO_LARGE',
  SANITIZATION_FAILED: 'SANITIZATION_FAILED',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: '输入为空 (NULL_INPUT)',
  [ERROR_CODES.SOURCE_EMPTY]: '输入内容为空 (SOURCE_EMPTY)',
  [ERROR_CODES.SOURCE_TOO_LARGE]: '输入内容超过最大限制 (SOURCE_TOO_LARGE)',
  [ERROR_CODES.SANITIZATION_FAILED]: '内容净化处理失败 (SANITIZATION_FAILED)',
  [ERROR_CODES.INVALID_PARAMETER]: '参数无效 (INVALID_PARAMETER)',
}

const SANITIZATION_NOTES_MAP = {
  'script_removed': '移除了 script 标签以防止 XSS 攻击',
  'style_removed': '移除了 style 标签以防止样式注入',
  'iframe_removed': '移除了 iframe 标签以防止嵌入式内容风险',
  'event_handler_removed': '移除了内联事件处理器 (onclick, onload 等)',
  'javascript_protocol_removed': '移除了 javascript: 协议的链接',
  'dangerous_protocol_removed': '移除了不安全协议的链接',
  'inline_style_removed': '移除了内联样式属性',
  'dangerous_attribute_removed': '移除了危险属性',
  'unknown_tag_stripped': '移除了未知标签，保留了其内部文本',
}

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function isAllowedProtocol(url) {
  try {
    const lowerUrl = url.trim().toLowerCase()
    if (!lowerUrl) return false
    if (lowerUrl.startsWith('javascript:')) return false
    if (lowerUrl.startsWith('data:')) return false
    if (lowerUrl.startsWith('vbscript:')) return false
    if (lowerUrl.startsWith('#')) return true
    if (lowerUrl.startsWith('/')) return true
    for (const protocol of ALLOWED_PROTOCOLS) {
      if (lowerUrl.startsWith(protocol)) return true
    }
    return false
  } catch {
    return false
  }
}

function isTableSeparatorRow(line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|')) return false
  const parts = trimmed.split('|').filter((p) => p.trim())
  if (parts.length < 2) return false
  return parts.every((p) => /^[:-]+$/.test(p.trim()))
}

function parseTableRow(line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|')) return null
  const parts = trimmed.split('|')
  if (parts.length >= 2 && parts[0].trim() === '') parts.shift()
  if (parts.length >= 1 && parts[parts.length - 1].trim() === '') parts.pop()
  if (parts.length === 0) return null
  return parts.map((p) => p.trim())
}

function tokenizeMarkdown(md) {
  const tokens = []
  const lines = md.split('\n')
  let inCodeBlock = false
  let inTable = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      if (inTable) {
        tokens.push({ type: 'table_end' })
        inTable = false
      }
      if (inCodeBlock) {
        tokens.push({ type: 'code_block_end' })
        inCodeBlock = false
      } else {
        const codeFenceLang = trimmed.slice(3).trim() || null
        tokens.push({ type: 'code_block_start', language: codeFenceLang })
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      tokens.push({ type: 'code_line', content: line })
      continue
    }

    if (trimmed.startsWith('>')) {
      if (inTable) {
        tokens.push({ type: 'table_end' })
        inTable = false
      }
      const content = trimmed.slice(1).replace(/^ /, '')
      tokens.push({ type: 'blockquote_start' })
      tokens.push({ type: 'paragraph', content })
      tokens.push({ type: 'blockquote_end' })
      continue
    }

    if (/^#{1,6} /.test(trimmed)) {
      if (inTable) {
        tokens.push({ type: 'table_end' })
        inTable = false
      }
      const match = trimmed.match(/^(#{1,6}) (.*)$/)
      if (match) {
        const level = match[1].length
        const content = match[2]
        tokens.push({ type: 'heading', level, content })
        continue
      }
    }

    if (/^(---|\*\*\*|___)$/.test(trimmed.replace(/ /g, ''))) {
      if (inTable) {
        tokens.push({ type: 'table_end' })
        inTable = false
      }
      tokens.push({ type: 'horizontal_rule' })
      continue
    }

    if (/^[-*+] /.test(trimmed) || /^\d+\. /.test(trimmed)) {
      if (inTable) {
        tokens.push({ type: 'table_end' })
        inTable = false
      }
      const isOrdered = /^\d+\. /.test(trimmed)
      const content = isOrdered
        ? trimmed.replace(/^\d+\. /, '')
        : trimmed.slice(2)
      tokens.push({ type: 'list_item', ordered: isOrdered, content })
      continue
    }

    if (trimmed === '') {
      if (inTable) {
        tokens.push({ type: 'table_end' })
        inTable = false
      }
      tokens.push({ type: 'blank' })
      continue
    }

    const tableCells = parseTableRow(line)
    if (tableCells) {
      if (!inTable) {
        const nextLine = lines[i + 1]
        if (nextLine !== undefined && isTableSeparatorRow(nextLine)) {
          tokens.push({ type: 'table_start' })
          tokens.push({ type: 'table_header', cells: tableCells })
          i++
          inTable = true
          continue
        }
      }

      if (inTable) {
        tokens.push({ type: 'table_row', cells: tableCells })
        continue
      }
    } else {
      if (inTable) {
        tokens.push({ type: 'table_end' })
        inTable = false
      }
      tokens.push({ type: 'paragraph', content: trimmed })
    }
  }

  if (inCodeBlock) {
    tokens.push({ type: 'code_block_end' })
  }

  return tokens
}

function parseInline(text) {
  let result = text

  result = result.replace(/`([^`]+)`/g, '<code>$1</code>')
  result = result.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  result = result.replace(/_([^_]+)_/g, '<em>$1</em>')
  result = result.replace(/~~([^~]+)~~/g, '<del>$1</del>')

  result = result.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (match, altText, url) => {
      if (isAllowedProtocol(url)) {
        const safeUrl = escapeHtml(url)
        const safeAlt = escapeHtml(altText || '')
        return `<img src="${safeUrl}" alt="${safeAlt}" />`
      }
      return escapeHtml(altText || '')
    }
  )

  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (match, linkText, url) => {
      if (isAllowedProtocol(url)) {
        const safeUrl = escapeHtml(url)
        const safeText = escapeHtml(linkText)
        return `<a href="${safeUrl}" rel="noopener noreferrer" target="_blank">${safeText}</a>`
      }
      return escapeHtml(linkText)
    }
  )

  return result
}

function renderTokens(tokens) {
  let html = ''
  let inList = null
  let codeContent = ''
  let inTableBody = false

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    switch (token.type) {
      case 'table_start':
        html += '<table>'
        inTableBody = false
        break
      case 'table_header':
        html += '<thead><tr>'
        token.cells.forEach((cell) => {
          html += `<th>${parseInline(cell)}</th>`
        })
        html += '</tr></thead>'
        break
      case 'table_row':
        if (!inTableBody) {
          html += '<tbody>'
          inTableBody = true
        }
        html += '<tr>'
        token.cells.forEach((cell) => {
          html += `<td>${parseInline(cell)}</td>`
        })
        html += '</tr>'
        break
      case 'table_end':
        if (inTableBody) {
          html += '</tbody>'
          inTableBody = false
        }
        html += '</table>'
        break
      case 'code_block_start':
        codeContent = ''
        break
      case 'code_line':
        codeContent += (codeContent ? '\n' : '') + token.content
        break
      case 'code_block_end':
        html += `<pre><code>${escapeHtml(codeContent)}</code></pre>`
        codeContent = ''
        break
      case 'heading':
        html += `<h${token.level}>${parseInline(token.content)}</h${token.level}>`
        break
      case 'horizontal_rule':
        html += '<hr />'
        break
      case 'list_item':
        if (inList !== token.ordered) {
          if (inList !== null) {
            html += inList ? '</ol>' : '</ul>'
          }
          html += token.ordered ? '<ol>' : '<ul>'
          inList = token.ordered
        }
        html += `<li>${parseInline(token.content)}</li>`
        break
      case 'paragraph':
        if (inList !== null) {
          html += inList ? '</ol>' : '</ul>'
          inList = null
        }
        html += `<p>${parseInline(token.content)}</p>`
        break
      case 'blockquote_start':
        if (inList !== null) {
          html += inList ? '</ol>' : '</ul>'
          inList = null
        }
        html += '<blockquote>'
        break
      case 'blockquote_end':
        html += '</blockquote>'
        break
      case 'blank':
        if (inList !== null) {
          html += inList ? '</ol>' : '</ul>'
          inList = null
        }
        break
    }
  }

  if (inList !== null) {
    html += inList ? '</ol>' : '</ul>'
  }

  return html
}

function simpleMarkdownRender(md) {
  if (!md || !md.trim()) return ''
  const tokens = tokenizeMarkdown(md)
  return renderTokens(tokens)
}

function parseHtmlAttributes(attrStr) {
  const attrs = new Map()
  const attrRegex = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  let match

  while ((match = attrRegex.exec(attrStr)) !== null) {
    const name = match[1].toLowerCase()
    let value = match[2] ?? match[3] ?? match[4] ?? ''
    attrs.set(name, value)
  }

  return attrs
}

function buildHtmlAttributes(attrs) {
  const parts = []
  for (const [name, value] of attrs) {
    parts.push(value ? `${name}="${escapeHtml(value)}"` : name)
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : ''
}

function sanitizeHtml(html, notes = []) {
  const result = []
  let i = 0
  const len = html.length
  let inPreOrCode = 0

  while (i < len) {
    if (html[i] === '<') {
      const tagEnd = html.indexOf('>', i)
      if (tagEnd === -1) {
        result.push(escapeHtml(html.slice(i)))
        break
      }

      const fullTag = html.slice(i, tagEnd + 1)
      const isEndTag = fullTag.startsWith('</')
      const isSelfClosing = fullTag.endsWith('/>')

      let tagName
      let attrStr = ''

      if (isEndTag) {
        const match = fullTag.match(/^<\/\s*([a-zA-Z0-9-]+)/)
        tagName = match ? match[1].toLowerCase() : null
      } else {
        const match = fullTag.match(/^<\s*([a-zA-Z0-9-]+)([^>]*?)\/?>$/)
        if (match) {
          tagName = match[1].toLowerCase()
          attrStr = match[2] || ''
        }
      }

      if (!tagName) {
        result.push(escapeHtml(fullTag))
        i = tagEnd + 1
        continue
      }

      const lowerTagName = tagName.toLowerCase()

      if (lowerTagName === 'script' || lowerTagName === 'style' || lowerTagName === 'iframe') {
        if (!isEndTag) {
          const endTag = `</${lowerTagName}>`
          const endIndex = html.toLowerCase().indexOf(endTag, tagEnd)
          if (endIndex !== -1) {
            const noteKey = `${lowerTagName}_removed`
            if (!notes.includes(noteKey)) notes.push(noteKey)
            i = endIndex + endTag.length
            continue
          }
        }
        const noteKey = `${lowerTagName}_removed`
        if (!notes.includes(noteKey)) notes.push(noteKey)
        i = tagEnd + 1
        continue
      }

      if (!ALLOWED_TAGS.has(lowerTagName)) {
        const noteKey = 'unknown_tag_stripped'
        if (!notes.includes(noteKey)) notes.push(noteKey)
        result.push(escapeHtml(fullTag))
        i = tagEnd + 1
        continue
      }

      if (lowerTagName === 'pre' || lowerTagName === 'code') {
        if (isEndTag) {
          inPreOrCode = Math.max(0, inPreOrCode - 1)
        } else {
          inPreOrCode++
        }
      }

      if (isEndTag) {
        result.push(`</${lowerTagName}>`)
      } else {
        const attrs = parseHtmlAttributes(attrStr)
        const safeAttrs = new Map()

        for (const [name, value] of attrs) {
          const lowerName = name.toLowerCase()

          if (/^on/.test(lowerName)) {
            const noteKey = 'event_handler_removed'
            if (!notes.includes(noteKey)) notes.push(noteKey)
            continue
          }

          if (lowerName === 'style') {
            const noteKey = 'inline_style_removed'
            if (!notes.includes(noteKey)) notes.push(noteKey)
            continue
          }

          if (!ALLOWED_ATTRIBUTES.has(lowerName)) {
            const noteKey = 'dangerous_attribute_removed'
            if (!notes.includes(noteKey)) notes.push(noteKey)
            continue
          }

          if (lowerName === 'href' || lowerName === 'src') {
            if (!isAllowedProtocol(value)) {
              const lowerValue = value.toLowerCase()
              if (lowerValue.startsWith('javascript:')) {
                const noteKey = 'javascript_protocol_removed'
                if (!notes.includes(noteKey)) notes.push(noteKey)
              } else {
                const noteKey = 'dangerous_protocol_removed'
                if (!notes.includes(noteKey)) notes.push(noteKey)
              }
              continue
            }
          }

          safeAttrs.set(lowerName, value)
        }

        const attrHtml = buildHtmlAttributes(safeAttrs)
        if (isSelfClosing) {
          result.push(`<${lowerTagName}${attrHtml} />`)
        } else {
          result.push(`<${lowerTagName}${attrHtml}>`)
        }
      }

      i = tagEnd + 1
    } else {
      const nextTag = html.indexOf('<', i)
      const textContent = nextTag === -1 ? html.slice(i) : html.slice(i, nextTag)

      if (inPreOrCode > 0) {
        result.push(textContent)
      } else {
        result.push(escapeHtml(textContent))
      }

      i = nextTag === -1 ? len : nextTag
    }
  }

  return result.join('')
}

function getSourceSummary(source, maxLength = 100) {
  if (!source) return ''
  const trimmed = source.trim()
  if (trimmed.length <= maxLength) return trimmed
  return trimmed.slice(0, maxLength) + '...'
}

function getSanitizationNotes(notes = []) {
  if (!notes || notes.length === 0) return []
  return notes
    .filter(key => SANITIZATION_NOTES_MAP[key])
    .map(key => ({
      key,
      message: SANITIZATION_NOTES_MAP[key],
    }))
}

function getSecurityPolicyInfo() {
  return {
    policyVersion: SECURITY_POLICY_VERSION,
    securityPolicyVersion: SECURITY_POLICY_VERSION,
    maxSourceLength: MAX_SOURCE_LENGTH,
    allowedProtocols: [...ALLOWED_PROTOCOLS],
    allowedTags: [...ALLOWED_TAGS],
    allowedAttributes: [...ALLOWED_ATTRIBUTES],
  }
}

function getErrorMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES[ERROR_CODES.INVALID_PARAMETER]
}

function validateInput(markdownSource) {
  if (markdownSource === null || markdownSource === undefined) {
    return { valid: false, code: ERROR_CODES.NULL_INPUT }
  }

  if (typeof markdownSource !== 'string') {
    return { valid: false, code: ERROR_CODES.INVALID_PARAMETER }
  }

  if (markdownSource.trim() === '') {
    return { valid: false, code: ERROR_CODES.SOURCE_EMPTY }
  }

  if (markdownSource.length > MAX_SOURCE_LENGTH) {
    return { valid: false, code: ERROR_CODES.SOURCE_TOO_LARGE }
  }

  return { valid: true }
}

function processMarkdown(markdownSource) {
  const validation = validateInput(markdownSource)

  if (!validation.valid) {
    return {
      success: false,
      errorCode: validation.code,
      errorMessage: getErrorMessage(validation.code),
      sourceSummary: '',
      previewHtml: '',
      sourceLength: typeof markdownSource === 'string' ? markdownSource.length : 0,
      renderedLength: 0,
      ...getSecurityPolicyInfo(),
      sanitizationNotes: [],
    }
  }

  try {
    const sanitizationNotes = []

    let html = simpleMarkdownRender(markdownSource)

    const safeHtml = sanitizeHtml(html, sanitizationNotes)

    return {
      success: true,
      sourceSummary: getSourceSummary(markdownSource),
      previewHtml: safeHtml,
      sourceLength: markdownSource.length,
      renderedLength: safeHtml.length,
      ...getSecurityPolicyInfo(),
      sanitizationNotes: getSanitizationNotes(sanitizationNotes),
    }
  } catch {
    return {
      success: false,
      errorCode: ERROR_CODES.SANITIZATION_FAILED,
      errorMessage: getErrorMessage(ERROR_CODES.SANITIZATION_FAILED),
      sourceSummary: getSourceSummary(markdownSource),
      previewHtml: '',
      sourceLength: markdownSource.length,
      renderedLength: 0,
      ...getSecurityPolicyInfo(),
      sanitizationNotes: [],
    }
  }
}

export {
  SECURITY_POLICY_VERSION,
  MAX_SOURCE_LENGTH,
  ALLOWED_PROTOCOLS,
  ALLOWED_TAGS,
  ALLOWED_ATTRIBUTES,
  ERROR_CODES,
  ERROR_MESSAGES,
  SANITIZATION_NOTES_MAP,
  escapeHtml,
  getSourceSummary,
  getSanitizationNotes,
  getSecurityPolicyInfo,
  getErrorMessage,
  validateInput,
  tokenizeMarkdown,
  parseInline,
  renderTokens,
  simpleMarkdownRender,
  parseHtmlAttributes,
  buildHtmlAttributes,
  sanitizeHtml,
  processMarkdown,
  isAllowedProtocol,
}
