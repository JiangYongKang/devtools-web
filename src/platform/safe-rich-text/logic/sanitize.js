import {
  DEFAULT_WHITELIST,
  TAGS_TO_ALWAYS_REMOVE,
  MAX_DATA_URL_LENGTH,
  ALLOWED_DATA_URL_MIME_TYPES,
  UNKNOWN_TAG_POLICIES,
  SANITIZATION_MODES,
  DEFAULT_MAX_HTML_SIZE_BYTES,
  ERROR_CODES,
} from './constants.js'
import { createError } from './errors.js'

function escapeHtmlForDisplay(html) {
  if (!html) return ''
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeHtmlForAttribute(value) {
  if (!value) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function decodeHtmlEntities(str) {
  if (!str) return str
  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea')
      textarea.innerHTML = str
      return textarea.value
    }
  } catch (error) {
    void error
  }
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(num))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

function approximateByteLength(str) {
  if (!str) return 0
  if (typeof Blob !== 'undefined') {
    return new Blob([str]).size
  }
  return encodeURIComponent(str).replace(/%[0-9A-F]{2}/gi, 'x').length
}

function isValidProtocol(tagName, attrValue, allowedProtocols) {
  if (!attrValue || attrValue.trim() === '') {
    return { valid: true }
  }

  const decoded = decodeHtmlEntities(attrValue).toLowerCase().trim()

  if (decoded.startsWith('#')) {
    return { valid: true }
  }

  if (decoded.startsWith('data:')) {
    const dataUrlLower = decoded.toLowerCase()
    const matches = dataUrlLower.match(/^data:([^;,]+)?(;base64)?,/)
    
    if (!matches) {
      return { valid: false, reason: 'Invalid data URL format' }
    }

    const mimeType = matches[1] || ''
    
    if (ALLOWED_DATA_URL_MIME_TYPES.length > 0 && !ALLOWED_DATA_URL_MIME_TYPES.includes(mimeType)) {
      return { valid: false, reason: `Disallowed data URL MIME type: ${mimeType}` }
    }

    if (decoded.length > MAX_DATA_URL_LENGTH) {
      return { valid: false, reason: `Data URL exceeds maximum length of ${MAX_DATA_URL_LENGTH}` }
    }

    return { valid: true }
  }

  if (decoded.startsWith('mailto:')) {
    if (allowedProtocols.includes('mailto')) {
      return { valid: true }
    }
    return { valid: false, reason: 'mailto: protocol not allowed' }
  }

  if (decoded.startsWith('javascript:') || decoded.startsWith('vbscript:') || decoded.startsWith('data:text')) {
    return { valid: false, reason: 'Dangerous protocol detected' }
  }

  const protocolMatch = decoded.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/)
  if (protocolMatch) {
    const protocol = protocolMatch[1].toLowerCase()
    if (!allowedProtocols.includes(protocol)) {
      return { valid: false, reason: `Protocol '${protocol}:' not allowed` }
    }
  }

  try {
    if (protocolMatch) {
      const url = new URL(decoded)
      const protocol = url.protocol.replace(':', '')
      if (!allowedProtocols.includes(protocol)) {
        return { valid: false, reason: `Protocol '${protocol}:' not allowed` }
      }
    }
  } catch (error) {
    void error
  }

  return { valid: true }
}

function isEventAttribute(attrName) {
  return /^on[a-zA-Z]+/.test(attrName.toLowerCase())
}

function htmlToPlainText(html) {
  if (!html || typeof html !== 'string') {
    return ''
  }

  try {
    if (typeof document !== 'undefined') {
      const temp = document.createElement('div')
      temp.innerHTML = html

      const scripts = temp.querySelectorAll('script, style, iframe, frameset, frame')
      scripts.forEach((s) => s.remove())

      const text = temp.textContent || temp.innerText || ''
      return text
        .replace(/\s+/g, ' ')
        .trim()
    }
  } catch (error) {
    void error
  }

  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function serializeNode(node, options, context) {
  const {
    allowedTags,
    allowedAttrs,
    protocols,
    unknownTagPolicy,
    strippedTags,
    strippedAttrs,
  } = context

  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent
  }

  if (node.nodeType === Node.COMMENT_NODE) {
    return ''
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const tagName = node.tagName.toLowerCase()

  if (TAGS_TO_ALWAYS_REMOVE.includes(tagName)) {
    strippedTags.push({
      tag: tagName,
      reason: 'tag_is_in_always_remove_list',
    })
    return ''
  }

  const isAllowed = allowedTags.has(tagName)

  if (!isAllowed) {
    strippedTags.push({
      tag: tagName,
      reason: 'tag_not_in_whitelist',
    })

    if (unknownTagPolicy === UNKNOWN_TAG_POLICIES.UNWRAP) {
      return serializeChildren(node, options, context)
    }
    return ''
  }

  const tagAttrs = [
    ...(allowedAttrs['*'] || []),
    ...(allowedAttrs[tagName] || []),
  ]
  const tagProtocols = protocols[tagName] || []

  let serializedAttrs = ''
  const nodeAttrs = Array.from(node.attributes || [])

  for (const attr of nodeAttrs) {
    const attrName = attr.name.toLowerCase()
    const attrValue = attr.value

    if (isEventAttribute(attrName)) {
      strippedAttrs.push({
        tag: tagName,
        attribute: attrName,
        reason: 'event_attribute',
      })
      continue
    }

    if (attrName === 'style') {
      strippedAttrs.push({
        tag: tagName,
        attribute: attrName,
        reason: 'style_attribute_not_allowed',
      })
      continue
    }

    if (!tagAttrs.includes(attrName)) {
      strippedAttrs.push({
        tag: tagName,
        attribute: attrName,
        reason: 'attribute_not_in_whitelist',
      })
      continue
    }

    if (attrName === 'href' || attrName === 'src' || attrName === 'srcset' || attrName === 'action') {
      const protocolResult = isValidProtocol(tagName, attrValue, tagProtocols)
      if (!protocolResult.valid) {
        strippedAttrs.push({
          tag: tagName,
          attribute: attrName,
          value: attrValue.substring(0, 100),
          reason: protocolResult.reason,
        })
        continue
      }
    }

    serializedAttrs += ` ${attrName}="${escapeHtmlForAttribute(attrValue)}"`
  }

  if (tagName === 'a' && /target\s*=\s*["']_blank["']/i.test(serializedAttrs)) {
    const hasRel = /\srel\s*=/.test(serializedAttrs)
    if (!hasRel) {
      serializedAttrs += ' rel="noopener noreferrer"'
    } else {
      const relMatch = serializedAttrs.match(/rel="([^"]*)"/i) || serializedAttrs.match(/rel='([^']*)'/i)
      if (relMatch) {
        const existingRel = relMatch[1]
        const lowerRel = existingRel.toLowerCase()
        if (!lowerRel.includes('noopener')) {
          const newRel = (existingRel ? existingRel + ' ' : '') + 'noopener noreferrer'
          serializedAttrs = serializedAttrs.replace(/rel="[^"]*"/i, `rel="${newRel}"`)
            .replace(/rel='[^']*'/i, `rel="${newRel}"`)
        }
      }
    }
  }

  const isSelfClosing = ['br', 'hr', 'img', 'source', 'area', 'track', 'col'].includes(tagName)

  if (isSelfClosing) {
    return `<${tagName}${serializedAttrs} />`
  }

  const childrenContent = serializeChildren(node, options, context)

  return `<${tagName}${serializedAttrs}>${childrenContent}</${tagName}>`
}

function serializeChildren(parent, options, context) {
  let result = ''
  const children = Array.from(parent.childNodes || [])
  for (const child of children) {
    result += serializeNode(child, options, context)
  }
  return result
}

function sanitizeWithDOMParser(html, options) {
  const {
    whitelist = DEFAULT_WHITELIST,
    unknownTagPolicy = UNKNOWN_TAG_POLICIES.REMOVE,
  } = options

  const strippedTags = []
  const strippedAttrs = []
  const errors = []

  const allowedTags = new Set(whitelist.tags.map(t => t.toLowerCase()))
  const allowedAttrs = whitelist.attributes || {}
  const protocols = whitelist.protocols || {}

  const context = {
    allowedTags,
    allowedAttrs,
    protocols,
    unknownTagPolicy,
    strippedTags,
    strippedAttrs,
    errors,
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
    
    if (doc.body && doc.body.firstChild) {
      const container = doc.body.firstChild
      const safeHtml = serializeChildren(container, options, context)
      
      return {
        safeHtml,
        strippedTags,
        strippedAttrs,
        errors,
        mode: 'domparser',
      }
    }
  } catch (error) {
    errors.push(createError(ERROR_CODES.PARSING_FAILED, 'DOMParser parsing failed', error.message))
  }

  return {
    safeHtml: '',
    strippedTags,
    strippedAttrs,
    errors: [...errors, createError(ERROR_CODES.PARSING_FAILED, 'Failed to parse HTML with DOMParser')],
    mode: 'domparser',
  }
}

const TAG_PATTERN = /<([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?(\/)?>/g
const ATTR_PATTERN = /\s+([a-zA-Z_:][a-zA-Z0-9_.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
const CLOSE_TAG_PATTERN = /<\/([a-zA-Z][a-zA-Z0-9-]*)>/g
const COMMENT_PATTERN = /<!--[\s\S]*?-->/g
const CDATA_PATTERN = /<!\[CDATA\[[\s\S]*?\]\]>/g

function sanitizeWithTokenizer(html, options, isFallback = true) {
  const {
    whitelist = DEFAULT_WHITELIST,
    unknownTagPolicy = UNKNOWN_TAG_POLICIES.REMOVE,
  } = options

  const strippedTags = []
  const strippedAttrs = []
  const errors = []

  const allowedTags = new Set(whitelist.tags.map(t => t.toLowerCase()))
  const allowedAttrs = whitelist.attributes || {}
  const protocols = whitelist.protocols || {}

  let result = html

  result = result.replace(CDATA_PATTERN, '')
  result = result.replace(COMMENT_PATTERN, '')

  for (const dangerousTag of TAGS_TO_ALWAYS_REMOVE) {
    const dangerousPattern = new RegExp(`<${dangerousTag}[\\s\\S]*?<\\/${dangerousTag}>`, 'gi')
    const selfClosingPattern = new RegExp(`<${dangerousTag}[^>]*\\/?>`, 'gi')
    
    result = result.replace(dangerousPattern, () => {
      strippedTags.push({
        tag: dangerousTag.toLowerCase(),
        reason: 'tag_is_in_always_remove_list',
      })
      return ''
    })
    result = result.replace(selfClosingPattern, () => {
      strippedTags.push({
        tag: dangerousTag.toLowerCase(),
        reason: 'tag_is_in_always_remove_list',
      })
      return ''
    })
  }

  if (unknownTagPolicy === UNKNOWN_TAG_POLICIES.REMOVE) {
    const unknownOpenPattern = /<([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?(\/)?>/g
    result = result.replace(unknownOpenPattern, (match, tagName) => {
      const tagLower = tagName.toLowerCase()
      if (!allowedTags.has(tagLower)) {
        strippedTags.push({
          tag: tagLower,
          reason: 'tag_not_in_whitelist',
        })
        return ''
      }
      return match
    })

    result = result.replace(CLOSE_TAG_PATTERN, (match, tagName) => {
      const tagLower = tagName.toLowerCase()
      if (!allowedTags.has(tagLower)) {
        return ''
      }
      return match
    })
  }

  result = result.replace(TAG_PATTERN, (match, tagName, attrString, selfClosing) => {
    const tagLower = tagName.toLowerCase()

    if (!allowedTags.has(tagLower)) {
      if (unknownTagPolicy === UNKNOWN_TAG_POLICIES.UNWRAP) {
        strippedTags.push({
          tag: tagLower,
          reason: 'tag_not_in_whitelist',
        })
        return ''
      }
      return match
    }

    const tagAttrsList = [
      ...(allowedAttrs['*'] || []),
      ...(allowedAttrs[tagLower] || []),
    ]
    const tagProtocols = protocols[tagLower] || []

    let newAttrs = ''

    if (attrString) {
      ATTR_PATTERN.lastIndex = 0
      let attrMatch
      while ((attrMatch = ATTR_PATTERN.exec(attrString)) !== null) {
        const attrName = attrMatch[1].toLowerCase()
        const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? ''

        if (isEventAttribute(attrName)) {
          strippedAttrs.push({
            tag: tagLower,
            attribute: attrName,
            reason: 'event_attribute',
          })
          continue
        }

        if (attrName === 'style') {
          strippedAttrs.push({
            tag: tagLower,
            attribute: attrName,
            reason: 'style_attribute_not_allowed',
          })
          continue
        }

        if (!tagAttrsList.includes(attrName)) {
          strippedAttrs.push({
            tag: tagLower,
            attribute: attrName,
            reason: 'attribute_not_in_whitelist',
          })
          continue
        }

        if (attrName === 'href' || attrName === 'src' || attrName === 'srcset' || attrName === 'action') {
          const protocolResult = isValidProtocol(tagLower, attrValue, tagProtocols)
          if (!protocolResult.valid) {
            strippedAttrs.push({
              tag: tagLower,
              attribute: attrName,
              value: attrValue.substring(0, 100),
              reason: protocolResult.reason,
            })
            continue
          }
        }

        newAttrs += ` ${attrName}="${escapeHtmlForAttribute(attrValue)}"`
      }
    }

    if (tagLower === 'a' && /target\s*=\s*["']_blank["']/i.test(newAttrs)) {
      const hasRel = /\srel\s*=/.test(newAttrs)
      if (!hasRel) {
        newAttrs += ' rel="noopener noreferrer"'
      }
    }

    if (selfClosing) {
      return `<${tagLower}${newAttrs} />`
    }
    return `<${tagLower}${newAttrs}>`
  })

  result = result.replace(CLOSE_TAG_PATTERN, (match, tagName) => {
    const tagLower = tagName.toLowerCase()
    if (!allowedTags.has(tagLower)) {
      return ''
    }
    return `</${tagLower}>`
  })

  if (isFallback) {
    errors.push(createError(
      ERROR_CODES.PARSING_FAILED,
      'DOMParser not available, using fallback tokenizer (limited functionality)'
    ))
  }

  return {
    safeHtml: result,
    strippedTags,
    strippedAttrs,
    errors,
    mode: 'tokenizer',
  }
}

function sanitizeRichText(html, options = {}) {
  const {
    mode = SANITIZATION_MODES.WHITELIST,
    maxSizeBytes = DEFAULT_MAX_HTML_SIZE_BYTES,
    whitelist = DEFAULT_WHITELIST,
    unknownTagPolicy = UNKNOWN_TAG_POLICIES.REMOVE,
  } = options

  const strippedTags = []
  const strippedAttrs = []

  if (html === null || html === undefined || typeof html !== 'string') {
    return {
      safeHtml: '',
      strippedTags,
      strippedAttrs,
      errors: [createError(ERROR_CODES.INVALID_INPUT, 'HTML input must be a string')],
      mode: null,
    }
  }

  const byteLength = approximateByteLength(html)
  if (byteLength > maxSizeBytes) {
    return {
      safeHtml: '',
      strippedTags,
      strippedAttrs,
      errors: [createError(ERROR_CODES.CONTENT_TOO_LARGE, `HTML exceeds maximum size of ${maxSizeBytes} bytes (actual: ${byteLength} bytes)`)],
      mode: null,
    }
  }

  if (mode === SANITIZATION_MODES.PLAIN_TEXT) {
    const plainText = htmlToPlainText(html)
    return {
      safeHtml: escapeHtmlForDisplay(plainText),
      strippedTags: [{ tag: '*', reason: 'plain_text_mode' }],
      strippedAttrs: [],
      errors: [],
      mode: 'plain_text',
    }
  }

  try {
    if (typeof DOMParser !== 'undefined') {
      return sanitizeWithDOMParser(html, { whitelist, unknownTagPolicy })
    }
  } catch (error) {
    void error
  }

  return sanitizeWithTokenizer(html, { whitelist, unknownTagPolicy })
}

function createSanitizer(options = {}) {
  const defaultOptions = {
    mode: SANITIZATION_MODES.WHITELIST,
    maxSizeBytes: DEFAULT_MAX_HTML_SIZE_BYTES,
    whitelist: DEFAULT_WHITELIST,
    unknownTagPolicy: UNKNOWN_TAG_POLICIES.REMOVE,
    ...options,
  }

  return {
    sanitize: (html, overrideOptions = {}) => {
      return sanitizeRichText(html, { ...defaultOptions, ...overrideOptions })
    },
    options: { ...defaultOptions },
  }
}

export {
  escapeHtmlForDisplay,
  escapeHtmlForAttribute,
  decodeHtmlEntities,
  approximateByteLength,
  isValidProtocol,
  isEventAttribute,
  htmlToPlainText,
  sanitizeWithDOMParser,
  sanitizeWithTokenizer,
  sanitizeRichText,
  createSanitizer,
}
