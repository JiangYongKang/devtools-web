import { HTML_SANITIZE_WHITELIST, ERROR_CODES } from './constants.js'
import { createError } from './errors.js'

function escapeHtmlForDisplay(html) {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeHtmlForAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function isValidProtocol(tagName, attrValue, protocols) {
  if (!attrValue || attrValue.trim() === '') {
    return true
  }

  const lowerValue = attrValue.toLowerCase().trim()

  if (lowerValue.startsWith('#')) {
    return true
  }

  if (lowerValue.startsWith('data:') && protocols?.includes('data')) {
    return true
  }

  if (lowerValue.startsWith('mailto:') && protocols?.includes('mailto')) {
    return true
  }

  if (lowerValue.startsWith('tel:') && protocols?.includes('tel')) {
    return true
  }

  const hasProtocol = lowerValue.includes(':')
  if (!hasProtocol) {
    return true
  }

  if (protocols) {
    for (const protocol of protocols) {
      if (lowerValue.startsWith(`${protocol}:`)) {
        return true
      }
    }
    return false
  }

  return true
}

function isValidStyleValue(value) {
  if (!value || typeof value !== 'string') {
    return true
  }

  const lowerValue = value.toLowerCase()

  if (lowerValue.includes('javascript:')) {
    return false
  }
  if (lowerValue.includes('expression(')) {
    return false
  }

  if (lowerValue.includes('url(')) {
    const urlMatch = lowerValue.match(/url\(\s*(['"]?)([^\1)]*?)\1\s*\)/)
    if (urlMatch) {
      const urlContent = urlMatch[2].toLowerCase()
      if (urlContent.includes('javascript:') || urlContent.includes('data:')) {
        return false
      }
    } else {
      const urlPart = lowerValue.substring(lowerValue.indexOf('url('))
      if (urlPart.includes('javascript:') || urlPart.includes('data:')) {
        return false
      }
    }
  }

  return true
}

function parseStyles(styleString) {
  const styles = {}
  if (!styleString || typeof styleString !== 'string') {
    return styles
  }

  const declarations = styleString.split(';')
  for (const decl of declarations) {
    const colonIndex = decl.indexOf(':')
    if (colonIndex === -1) continue

    const prop = decl.substring(0, colonIndex).trim()
    const value = decl.substring(colonIndex + 1).trim()

    if (prop && value) {
      styles[prop.toLowerCase()] = value
    }
  }
  return styles
}

function serializeStyles(styles) {
  const parts = []
  for (const [prop, value] of Object.entries(styles)) {
    parts.push(`${prop}: ${value}`)
  }
  return parts.join('; ')
}

function sanitizeStyles(styleString, allowedStyles) {
  const parsed = parseStyles(styleString)
  const sanitized = {}

  for (const [prop, value] of Object.entries(parsed)) {
    const lowerProp = prop.toLowerCase()
    if (allowedStyles.includes(lowerProp) && isValidStyleValue(value)) {
      sanitized[lowerProp] = value
    }
  }

  return serializeStyles(sanitized)
}

const TAG_PATTERN = /<([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?(\/)?>/g
const ATTR_PATTERN = /\s+([a-zA-Z_:][a-zA-Z0-9_.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g

function sanitizeHtmlSimple(html, whitelist = HTML_SANITIZE_WHITELIST) {
  if (!html || typeof html !== 'string') {
    return ''
  }

  const allowedTags = new Set(whitelist.tags.map(t => t.toLowerCase()))
  const allowedAttrs = whitelist.attributes
  const protocols = whitelist.protocols
  const allowedStyles = whitelist.styles || []

  let result = html
  let isModified = false

  result = result.replace(/<script[\s\S]*?<\/script>/gi, (match) => {
    isModified = true
    return ''
  })

  result = result.replace(/<style[\s\S]*?<\/style>/gi, (match) => {
    isModified = true
    return ''
  })

  result = result.replace(/<iframe[\s\S]*?<\/iframe>/gi, (match) => {
    isModified = true
    return ''
  })
  result = result.replace(/<frame[\s\S]*?<\/frame>/gi, (match) => {
    isModified = true
    return ''
  })
  result = result.replace(/<frameset[\s\S]*?<\/frameset>/gi, (match) => {
    isModified = true
    return ''
  })

  result = result.replace(TAG_PATTERN, (match, tagName, attrString, selfClosing) => {
    const tagLower = tagName.toLowerCase()

    if (!allowedTags.has(tagLower)) {
      isModified = true
      return ''
    }

    const tagAttrs = [
      ...(allowedAttrs['*'] || []),
      ...(allowedAttrs[tagLower] || []),
    ]
    const tagProtocols = protocols[tagLower]

    let newAttrs = ''

    if (attrString) {
      ATTR_PATTERN.lastIndex = 0
      let attrMatch
      while ((attrMatch = ATTR_PATTERN.exec(attrString)) !== null) {
        const attrName = attrMatch[1].toLowerCase()
        const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? ''

        if (!tagAttrs.includes(attrName)) {
          isModified = true
          continue
        }

        if (attrName.startsWith('on')) {
          isModified = true
          continue
        }

        if ((attrName === 'href' || attrName === 'src' || attrName === 'srcset') && tagProtocols) {
          if (!isValidProtocol(tagLower, attrValue, tagProtocols)) {
            isModified = true
            continue
          }
        }

        if (attrName === 'href' && attrValue.toLowerCase().startsWith('javascript:')) {
          isModified = true
          continue
        }

        if (attrName === 'style') {
          const sanitizedStyle = sanitizeStyles(attrValue, allowedStyles)
          if (sanitizedStyle) {
            newAttrs += ` style="${escapeHtmlForAttribute(sanitizedStyle)}"`
          } else {
            isModified = true
          }
          continue
        }

        newAttrs += ` ${attrName}="${escapeHtmlForAttribute(attrValue)}"`
      }
    }

    if (tagLower === 'a') {
      const hasTargetBlank = /\s+target\s*=\s*(?:"_blank"|'_blank'|_blank)/i.test(attrString || '')
      if (hasTargetBlank) {
        const hasRel = /\s+rel\s*=/i.test(newAttrs)
        if (!hasRel) {
          newAttrs += ' rel="noopener noreferrer"'
        } else {
          const relMatch = newAttrs.match(/rel="([^"]*)"/i) || newAttrs.match(/rel='([^']*)'/i)
          if (relMatch) {
            const existingRel = relMatch[1]
            let newRel = existingRel
            if (!existingRel.toLowerCase().includes('noopener')) {
              newRel = (existingRel ? existingRel + ' ' : '') + 'noopener noreferrer'
              newAttrs = newAttrs.replace(/rel="[^"]*"/i, `rel="${newRel}"`)
                .replace(/rel='[^']*'/i, `rel="${newRel}"`)
            }
          }
        }
      }
    }

    if (tagLower === 'form' || tagLower === 'input' || tagLower === 'button' ||
        tagLower === 'select' || tagLower === 'textarea') {
      newAttrs = newAttrs.replace(/\s+action\s*=\s*"[^"]*"/gi, '')
      newAttrs = newAttrs.replace(/\s+action\s*=\s*'[^']*'/gi, '')
      newAttrs = newAttrs.replace(/\s+formaction\s*=\s*"[^"]*"/gi, '')
      newAttrs = newAttrs.replace(/\s+formaction\s*=\s*'[^']*'/gi, '')
      newAttrs = newAttrs.replace(/\s+onclick\s*=\s*"[^"]*"/gi, '')
      newAttrs = newAttrs.replace(/\s+onclick\s*=\s*'[^']*'/gi, '')
      isModified = true
    }

    if (selfClosing) {
      return `<${tagLower}${newAttrs} />`
    }
    return `<${tagLower}${newAttrs}>`
  })

  result = result.replace(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g, (match, tagName) => {
    const tagLower = tagName.toLowerCase()
    if (!allowedTags.has(tagLower)) {
      isModified = true
      return ''
    }
    return `</${tagLower}>`
  })

  return {
    sanitizedHtml: result,
    isModified,
  }
}

function parseHtml(html) {
  try {
    if (typeof DOMParser === 'undefined') {
      return null
    }
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
    return doc.body.firstChild
  } catch {
    return null
  }
}

function sanitizeHtml(html, options = {}) {
  const {
    whitelist = HTML_SANITIZE_WHITELIST,
  } = options

  if (!html || typeof html !== 'string') {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_INPUT, 'HTML 输入无效'),
    }
  }

  try {
    const { sanitizedHtml, isModified } = sanitizeHtmlSimple(html, whitelist)

    return {
      success: true,
      sanitizedHtml,
      originalLength: html.length,
      sanitizedLength: sanitizedHtml.length,
      isModified,
    }
  } catch (error) {
    return {
      success: false,
      error: createError(ERROR_CODES.UNKNOWN_ERROR, 'HTML 消毒失败', error),
    }
  }
}

function htmlToPlainText(html) {
  if (!html || typeof html !== 'string') {
    return ''
  }

  try {
    if (typeof document !== 'undefined') {
      const temp = document.createElement('div')
      temp.innerHTML = html

      const scripts = temp.querySelectorAll('script, style')
      scripts.forEach((s) => s.remove())

      const text = temp.textContent || temp.innerText || ''
      return text
    }
  } catch {
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

export {
  HTML_SANITIZE_WHITELIST,
  escapeHtmlForDisplay,
  escapeHtmlForAttribute,
  sanitizeHtml,
  htmlToPlainText,
  parseHtml,
  isValidProtocol,
  isValidStyleValue,
  parseStyles,
  serializeStyles,
  sanitizeStyles,
  sanitizeHtmlSimple,
}
