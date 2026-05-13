import { DATE_FORMATS, ITEM_TYPES, TYPE_ORDER } from './constants.js'
import { createError, ERROR_CODES, MAX_PLACEHOLDER_DEPTH, MAX_SAFE_OUTPUT_SIZE } from './errors.js'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function createEmptyItem() {
  return {
    id: generateId(),
    type: 'feat',
    scope: '',
    content: '',
    contentEn: '',
    issue: '',
  }
}

function validateSemVer(version) {
  if (!version) return false
  const semVerRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/
  return semVerRegex.test(version)
}

function bumpVersion(version, type) {
  if (!validateSemVer(version)) {
    return {
      valid: false,
      errorCode: ERROR_CODES.INVALID_VERSION,
      error: createError(ERROR_CODES.INVALID_VERSION),
      version: null,
    }
  }

  const parts = version.split('-')[0].split('+')[0].split('.').map(Number)
  let [major, minor, patch] = parts

  switch (type) {
    case 'major':
      major++
      minor = 0
      patch = 0
      break
    case 'minor':
      minor++
      patch = 0
      break
    case 'patch':
      patch++
      break
    default:
      return {
        valid: false,
        errorCode: ERROR_CODES.INVALID_VERSION,
        error: createError(ERROR_CODES.INVALID_VERSION, { reason: `未知的 bump 类型: ${type}` }),
        version: null,
      }
  }

  const newVersion = `${major}.${minor}.${patch}`
  return {
    valid: true,
    errorCode: null,
    error: null,
    version: newVersion,
  }
}

function formatDate(date, formatId = 'local') {
  let d
  if (date instanceof Date) {
    d = date
  } else if (typeof date === 'string' || typeof date === 'number') {
    d = new Date(date)
  } else {
    d = new Date()
  }

  if (isNaN(d.getTime())) {
    return {
      valid: false,
      errorCode: ERROR_CODES.INVALID_DATE_FORMAT,
      error: createError(ERROR_CODES.INVALID_DATE_FORMAT),
      formatted: null,
    }
  }

  const format = DATE_FORMATS.find(f => f.id === formatId) || DATE_FORMATS[0]
  return {
    valid: true,
    errorCode: null,
    error: null,
    formatted: format.formatFn(d),
  }
}

function extractCommitFromText(text) {
  if (!text || !text.trim()) {
    return []
  }

  const lines = text.split('\n').filter(l => l.trim())
  const items = []

  const conventionalRegex = /^(feat|fix|refactor|perf|docs|style|test|ci|chore)(?:\(([^)]+)\))?(!)?:\s*(.+)$/i
  const issueRegex = /#(\d+)/g

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    const conventionalMatch = trimmedLine.match(conventionalRegex)
    
    let item = createEmptyItem()
    
    if (conventionalMatch) {
      const [, typeRaw, scope, breaking, subject] = conventionalMatch
      item.type = breaking ? 'BREAKING' : typeRaw.toLowerCase()
      item.scope = scope || ''
      item.content = subject.trim()

      const issueMatches = [...subject.matchAll(issueRegex)]
      if (issueMatches.length > 0) {
        item.issue = issueMatches.map(m => m[1]).join(', ')
        item.content = item.content.replace(issueRegex, '').trim()
      }
    } else {
      item.type = 'other'
      item.content = trimmedLine

      const issueMatches = [...trimmedLine.matchAll(issueRegex)]
      if (issueMatches.length > 0) {
        item.issue = issueMatches.map(m => m[1]).join(', ')
      }
    }

    items.push(item)
  }

  return items
}

function reorderItems(items, fromIndex, toIndex) {
  if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
    return items
  }
  const newItems = [...items]
  const [moved] = newItems.splice(fromIndex, 1)
  newItems.splice(toIndex, 0, moved)
  return newItems
}

function groupItemsByType(items) {
  const groups = {}
  
  for (const type of TYPE_ORDER) {
    groups[type] = []
  }

  for (const item of items) {
    const type = item.type || 'other'
    if (!groups[type]) {
      groups.other.push(item)
    } else {
      groups[type].push(item)
    }
  }

  return groups
}

function escapeTemplateLiteral(text) {
  if (!text) return ''
  let result = text
  result = result.replace(/\\\{/g, '\u0000')
  result = result.replace(/\\\}/g, '\u0001')
  return result
}

function unescapeTemplateLiteral(text) {
  if (!text) return ''
  let result = text
  result = result.replace(/\u0000/g, '{')
  result = result.replace(/\u0001/g, '}')
  return result
}

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

function formatIssueLink(issue, issueLinkTemplate) {
  if (!issue || !issue.trim()) return ''
  if (!issueLinkTemplate) return `#${issue}`
  
  const issues = issue.split(',').map(i => i.trim())
  return issues.map(i => {
    return issueLinkTemplate.replace(/\{\{issue\}\}/g, i)
  }).join(', ')
}

function renderItem(item, options = {}) {
  const { 
    format = 'simple', 
    includeIndex = false, 
    index = 1,
    includeEnglish = false,
    issueLinkTemplate = null,
  } = options

  const scope = item.scope ? `(${item.scope})` : ''
  const issueStr = item.issue ? formatIssueLink(item.issue, issueLinkTemplate) : ''
  const typeInfo = ITEM_TYPES.find(t => t.id === item.type)
  const typeLabel = typeInfo?.label || item.type

  switch (format) {
    case 'keepachangelog':
      return `- ${escapeHtml(item.content)}${scope ? ` ${scope}` : ''}${issueStr ? ` (${issueStr})` : ''}`
    
    case 'conventional_commits':
      return `- **${typeLabel}**${scope}: ${escapeHtml(item.content)}${issueStr ? ` (${issueStr})` : ''}`
    
    case 'detailed':
      let line = `- ${escapeHtml(item.content)}`
      if (item.scope) {
        line += ` (${item.scope})`
      }
      if (issueStr) {
        line += ` [${issueStr}]`
      }
      if (includeEnglish && item.contentEn) {
        line += `\n  - ${escapeHtml(item.contentEn)}`
      }
      return line
    
    case 'simple':
    default:
      let simpleLine = includeIndex ? `${index}. ` : '- '
      simpleLine += escapeHtml(item.content)
      if (item.scope) {
        simpleLine += ` (${item.scope})`
      }
      if (issueStr) {
        simpleLine += ` (${issueStr})`
      }
      return simpleLine
  }
}

function renderSection(type, items, options = {}) {
  const typeInfo = ITEM_TYPES.find(t => t.id === type)
  const sectionLabel = typeInfo?.labelEn || type
  
  const lines = []
  lines.push(`### ${sectionLabel}`)
  lines.push('')
  
  for (let i = 0; i < items.length; i++) {
    lines.push(renderItem(items[i], { ...options, index: i + 1 }))
  }
  lines.push('')
  
  return lines.join('\n')
}

function renderSections(items, options = {}) {
  const groups = groupItemsByType(items)
  const sections = []

  for (const type of TYPE_ORDER) {
    const groupItems = groups[type]
    if (groupItems.length > 0) {
      sections.push(renderSection(type, groupItems, options))
    }
  }

  return sections.join('\n').trim()
}

function renderItemsFlat(items, options = {}) {
  const lines = []
  for (let i = 0; i < items.length; i++) {
    lines.push(renderItem(items[i], { ...options, includeIndex: options?.numbered, index: i + 1 }))
  }
  return lines.join('\n')
}

function findPlaceholders(template) {
  if (!template) return []
  
  const escaped = escapeTemplateLiteral(template)
  const placeholderRegex = /\{\{([^}]+)\}\}/g
  const matches = []
  let match
  
  while ((match = placeholderRegex.exec(escaped)) !== null) {
    matches.push({
      name: match[0],
      key: match[1].trim(),
      position: match.index,
    })
  }
  
  return matches
}

function validateTemplate(template) {
  if (template == null) {
    return {
      valid: false,
      errorCode: ERROR_CODES.INVALID_TEMPLATE,
      error: createError(ERROR_CODES.INVALID_TEMPLATE, { reason: '模板为空' }),
    }
  }

  const str = String(template)
  const escaped = escapeTemplateLiteral(str)
  
  let openBraces = 0
  let i = 0
  while (i < escaped.length) {
    if (escaped[i] === '{' && escaped[i + 1] === '{') {
      openBraces++
      i += 2
    } else if (escaped[i] === '}' && escaped[i + 1] === '}') {
      if (openBraces > 0) {
        openBraces--
      } else {
        return {
          valid: false,
          errorCode: ERROR_CODES.INVALID_TEMPLATE,
          error: createError(ERROR_CODES.INVALID_TEMPLATE, { reason: '存在多余的关闭占位符 }}' }),
        }
      }
      i += 2
    } else {
      i++
    }
  }

  if (openBraces !== 0) {
    return {
      valid: false,
      errorCode: ERROR_CODES.INVALID_TEMPLATE,
      error: createError(ERROR_CODES.INVALID_TEMPLATE, { reason: '存在未配对的占位符 {{ 或 }}' }),
    }
  }

  return { valid: true, errorCode: null, error: null }
}

function checkCircularReferences(variableMap) {
  const visited = new Set()
  const recursionStack = new Set()

  function hasCycle(key) {
    if (recursionStack.has(key)) return true
    if (visited.has(key)) return false

    visited.add(key)
    recursionStack.add(key)

    const value = variableMap[key]
    if (typeof value === 'string') {
      const placeholders = findPlaceholders(value)
      for (const p of placeholders) {
        if (hasCycle(p.key)) return true
      }
    }

    recursionStack.delete(key)
    return false
  }

  for (const key of Object.keys(variableMap)) {
    if (hasCycle(key)) {
      return {
        valid: false,
        errorCode: ERROR_CODES.CIRCULAR_REFERENCE,
        error: createError(ERROR_CODES.CIRCULAR_REFERENCE, { key }),
      }
    }
  }

  return { valid: true, errorCode: null, error: null }
}

function renderTemplate(template, variables, options = {}) {
  const {
    missingPlaceholderStrategy = 'empty',
    maxDepth = MAX_PLACEHOLDER_DEPTH,
  } = options

  const templateValidation = validateTemplate(template)
  if (!templateValidation.valid) {
    return {
      valid: false,
      errorCode: templateValidation.errorCode,
      error: templateValidation.error,
      output: null,
      missingPlaceholders: [],
    }
  }

  const circularCheck = checkCircularReferences(variables)
  if (!circularCheck.valid) {
    return {
      valid: false,
      errorCode: circularCheck.errorCode,
      error: circularCheck.error,
      output: null,
      missingPlaceholders: [],
    }
  }

  let current = escapeTemplateLiteral(String(template || ''))
  const missingPlaceholders = []
  let iterations = 0

  while (iterations < maxDepth) {
    iterations++
    const placeholderRegex = /\{\{([^}]+)\}\}/g
    const placeholders = []
    let match

    while ((match = placeholderRegex.exec(current)) !== null) {
      placeholders.push({
        name: match[0],
        key: match[1].trim(),
        position: match.index,
      })
    }
    
    if (placeholders.length === 0) break

    let replaced = false
    const keysToReplace = new Set(placeholders.map(p => p.key))

    for (const key of keysToReplace) {
      const regex = new RegExp(`\\{\\{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'g')
      
      if (variables[key] !== undefined && variables[key] !== null) {
        const value = typeof variables[key] === 'function' ? variables[key]() : variables[key]
        current = current.replace(regex, String(value))
        replaced = true
      } else {
        if (!missingPlaceholders.includes(key)) {
          missingPlaceholders.push(key)
        }

        switch (missingPlaceholderStrategy) {
          case 'empty':
            current = current.replace(regex, '')
            replaced = true
            break
          case 'tbd':
            current = current.replace(regex, 'TBD')
            replaced = true
            break
          case 'error':
          default:
            break
        }
      }
    }

    if (!replaced) {
      break
    }
  }

  if (iterations >= maxDepth) {
    return {
      valid: false,
      errorCode: ERROR_CODES.CIRCULAR_REFERENCE,
      error: createError(ERROR_CODES.CIRCULAR_REFERENCE, { reason: '模板展开超出最大深度' }),
      output: unescapeTemplateLiteral(current),
      missingPlaceholders,
    }
  }

  const output = unescapeTemplateLiteral(current)

  if (output.length > MAX_SAFE_OUTPUT_SIZE) {
    return {
      valid: false,
      errorCode: ERROR_CODES.INPUT_TOO_LARGE,
      error: createError(ERROR_CODES.INPUT_TOO_LARGE, { actualSize: output.length, maxSize: MAX_SAFE_OUTPUT_SIZE }),
      output: null,
      missingPlaceholders,
    }
  }

  const hasMissing = missingPlaceholderStrategy === 'error' && missingPlaceholders.length > 0

  return {
    valid: !hasMissing,
    errorCode: hasMissing ? ERROR_CODES.MISSING_PLACEHOLDER : null,
    error: hasMissing ? createError(ERROR_CODES.MISSING_PLACEHOLDER, { placeholders: missingPlaceholders }) : null,
    output,
    missingPlaceholders,
  }
}

function addPrefixToItems(items, prefix) {
  if (!prefix) return items
  return items.map(item => ({
    ...item,
    content: prefix + item.content,
  }))
}

function addPrefixToSelection(items, selectedIds, prefix) {
  if (!prefix || selectedIds.length === 0) return items
  return items.map(item => {
    if (selectedIds.includes(item.id)) {
      return {
        ...item,
        content: prefix + item.content,
      }
    }
    return item
  })
}

export {
    addPrefixToItems,
    addPrefixToSelection, bumpVersion, checkCircularReferences, createEmptyItem, escapeHtml, escapeTemplateLiteral, extractCommitFromText, findPlaceholders, formatDate, formatIssueLink, generateId, groupItemsByType, renderItem, renderItemsFlat, renderSection,
    renderSections, renderTemplate, reorderItems, unescapeTemplateLiteral, validateSemVer, validateTemplate
}

