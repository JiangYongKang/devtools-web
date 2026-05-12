import { CHAR_CATEGORIES, CATEGORY_NAMES, CATEGORY_RISK_LEVELS } from './constants.js'

function escapeForDoubleQuotes(rawText) {
  let result = ''
  for (let i = 0; i < rawText.length; i++) {
    const char = rawText[i]
    switch (char) {
      case '$':
        result += '\\$'
        break
      case '`':
        result += '\\`'
        break
      case '"':
        result += '\\"'
        break
      case '\\':
        result += '\\\\'
        break
      default:
        result += char
    }
  }
  return `"${result}"`
}

function escapeForSingleQuotes(rawText) {
  if (rawText.includes("'")) {
    const parts = rawText.split("'")
    return `'${parts.join("'\\''")}'`
  }
  return `'${rawText}'`
}

function getBareLineGuidance(rawText) {
  const issues = []
  const specialChars = new Set()
  
  for (let i = 0; i < rawText.length; i++) {
    const char = rawText[i]
    const cat = getCharCategory(char)
    if (cat !== CHAR_CATEGORIES.NORMAL) {
      specialChars.add(char)
    }
  }
  
  if (rawText.includes(' ')) {
    issues.push('包含空格，会被解释为多个参数')
  }
  if (rawText.includes('\n')) {
    issues.push('包含换行符，会被解释为多条命令')
  }
  if (rawText.includes('\t')) {
    issues.push('包含制表符，会被解释为参数分隔符')
  }
  if (rawText.includes('$')) {
    issues.push('包含 $，可能触发变量展开')
  }
  if (rawText.includes('`')) {
    issues.push('包含反引号，可能触发命令替换')
  }
  if (rawText.includes('*') || rawText.includes('?') || rawText.includes('[')) {
    issues.push('包含通配符，可能触发路径匹配')
  }
  if (rawText.includes("'") || rawText.includes('"')) {
    issues.push('包含引号，可能导致语法错误')
  }
  if (rawText.includes('\\')) {
    issues.push('包含反斜杠，可能触发转义')
  }
  
  return {
    canUseBare: issues.length === 0,
    issues,
    specialChars: Array.from(specialChars),
    recommendation: issues.length > 0 ? '建议使用双引号或单引号包裹' : '可以安全使用无引号',
  }
}

function getCharCategory(char) {
  if (char === ' ' || char === '\t') {
    return CHAR_CATEGORIES.SPACE_TAB
  }
  if (char === '\n' || char === '\r') {
    return CHAR_CATEGORIES.NEWLINE
  }
  if (char === '$') {
    return CHAR_CATEGORIES.VARIABLE
  }
  if (char === '`') {
    return CHAR_CATEGORIES.COMMAND_SUBST
  }
  if (char === '\\') {
    return CHAR_CATEGORIES.ESCAPE
  }
  if (char === '!') {
    return CHAR_CATEGORIES.HISTORY
  }
  if (char === '#') {
    return CHAR_CATEGORIES.COMMENT
  }
  if (char === "'" || char === '"') {
    return CHAR_CATEGORIES.QUOTE
  }
  if (char === '*' || char === '?' || char === '[' || char === ']') {
    return CHAR_CATEGORIES.GLOB
  }
  if ('(){}|;&<>~=:,%@'.includes(char)) {
    return CHAR_CATEGORIES.PUNCTUATION
  }
  return CHAR_CATEGORIES.NORMAL
}

function buildExplainedSpans(rawText, shellProfile = 'POSIX_BASH_LITE') {
  const spans = []
  let i = 0
  
  while (i < rawText.length) {
    const char = rawText[i]
    const category = getCharCategory(char)
    
    let length = 1
    
    if (char === '$') {
      if (i + 1 < rawText.length && rawText[i + 1] === '{') {
        let j = i + 2
        while (j < rawText.length && rawText[j] !== '}') {
          j++
        }
        if (j < rawText.length && rawText[j] === '}') {
          length = j - i + 1
        }
      } else if (i + 1 < rawText.length && /[a-zA-Z_]/.test(rawText[i + 1])) {
        let j = i + 1
        while (j < rawText.length && /[a-zA-Z0-9_]/.test(rawText[j])) {
          j++
        }
        length = j - i
      }
    }
    
    if (char === '`') {
      let j = i + 1
      while (j < rawText.length && rawText[j] !== '`') {
        j++
      }
      if (j < rawText.length && rawText[j] === '`') {
        length = j - i + 1
      }
    }
    
    const text = rawText.slice(i, i + length)
    spans.push({
      start: i,
      end: i + length,
      text,
      category,
      categoryName: CATEGORY_NAMES[category],
      riskLevel: CATEGORY_RISK_LEVELS[category],
      charCode: char.charCodeAt(0),
    })
    
    i += length
  }
  
  return spans
}

function buildRiskMarkers(spans, rawText) {
  const markers = {
    totalSpans: spans.length,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    hasCommandSubst: false,
    hasVariable: false,
    hasGlob: false,
    hasWhitespace: false,
    highRiskSpans: [],
  }
  
  for (const span of spans) {
    switch (span.riskLevel) {
      case 'critical':
        markers.criticalCount++
        break
      case 'high':
        markers.highCount++
        break
      case 'medium':
        markers.mediumCount++
        break
      case 'low':
        markers.lowCount++
        break
    }
    
    if (span.category === CHAR_CATEGORIES.COMMAND_SUBST) {
      markers.hasCommandSubst = true
    }
    if (span.category === CHAR_CATEGORIES.VARIABLE) {
      markers.hasVariable = true
    }
    if (span.category === CHAR_CATEGORIES.GLOB) {
      markers.hasGlob = true
    }
    if (span.category === CHAR_CATEGORIES.SPACE_TAB || span.category === CHAR_CATEGORIES.NEWLINE) {
      markers.hasWhitespace = true
    }
    
    if (span.riskLevel === 'critical' || span.riskLevel === 'high') {
      markers.highRiskSpans.push({
        ...span,
      })
    }
  }
  
  markers.overallRisk = 'low'
  if (markers.criticalCount > 0) {
    markers.overallRisk = 'critical'
  } else if (markers.highCount > 0) {
    markers.overallRisk = 'high'
  } else if (markers.mediumCount > 0) {
    markers.overallRisk = 'medium'
  }
  
  return markers
}

function parseQuotedString(input, startIndex = 0) {
  if (startIndex >= input.length) {
    return { endIndex: startIndex, value: '', error: null }
  }
  
  const firstChar = input[startIndex]
  let result = ''
  let i = startIndex + 1
  
  if (firstChar === '"') {
    while (i < input.length) {
      const char = input[i]
      if (char === '\\' && i + 1 < input.length) {
        const nextChar = input[i + 1]
        if (nextChar === '$' || nextChar === '`' || nextChar === '"' || nextChar === '\\') {
          result += nextChar
          i += 2
        } else if (nextChar === '\n') {
          i += 2
        } else {
          result += char
          i++
        }
      } else if (char === '"') {
        return { endIndex: i + 1, value: result, error: null }
      } else {
        result += char
        i++
      }
    }
    return { endIndex: i, value: result, error: 'UNBALANCED_QUOTES' }
  } else if (firstChar === "'") {
    while (i < input.length) {
      const char = input[i]
      if (char === "'") {
        return { endIndex: i + 1, value: result, error: null }
      } else {
        result += char
        i++
      }
    }
    return { endIndex: i, value: result, error: 'UNBALANCED_QUOTES' }
  }
  
  return { endIndex: startIndex, value: '', error: 'NOT_A_QUOTED_STRING' }
}

function parseInverse(input, shellProfile = 'POSIX_BASH_LITE') {
  const result = {
    originalInput: input,
    segments: [],
    expandedValue: '',
    warnings: [],
    errorCode: null,
    errorMessage: null,
  }
  
  let i = 0
  
  while (i < input.length) {
    const char = input[i]
    
    if (char === '"' || char === "'") {
      const parsed = parseQuotedString(input, i)
      if (parsed.error) {
        if (parsed.error === 'UNBALANCED_QUOTES') {
          result.errorCode = 'UNBALANCED_QUOTES'
          result.errorMessage = '引号不匹配，请检查输入'
          return result
        }
      } else {
        result.segments.push({
          type: char === '"' ? 'double_quoted' : 'single_quoted',
          raw: input.slice(i, parsed.endIndex),
          value: parsed.value,
          start: i,
          end: parsed.endIndex,
        })
        result.expandedValue += parsed.value
        i = parsed.endIndex
        continue
      }
    }
    
    if (char === '\\' && i + 1 < input.length) {
      const nextChar = input[i + 1]
      result.segments.push({
        type: 'escaped',
        raw: input.slice(i, i + 2),
        value: nextChar,
        start: i,
        end: i + 2,
      })
      result.expandedValue += nextChar
      i += 2
      continue
    }
    
    result.segments.push({
      type: 'literal',
      raw: char,
      value: char,
      start: i,
      end: i + 1,
    })
    result.expandedValue += char
    i++
  }
  
  return result
}

function validateInput(rawText, maxInputChars = 10000) {
  if (rawText === null || rawText === undefined) {
    return { valid: false, errorCode: 'NULL_INPUT', errorMessage: '输入值为 null 或 undefined' }
  }
  
  if (typeof rawText !== 'string') {
    rawText = String(rawText)
  }
  
  if (rawText.length === 0) {
    return { valid: false, errorCode: 'EMPTY_INPUT', errorMessage: '输入为空字符串' }
  }
  
  if (rawText.trim() === '') {
    return { valid: false, errorCode: 'EMPTY_INPUT', errorMessage: '输入仅包含空白字符' }
  }
  
  if (rawText.length > maxInputChars) {
    return { 
      valid: false, 
      errorCode: 'INPUT_TOO_LARGE', 
      errorMessage: `输入过长（${rawText.length} 字符），最大支持 ${maxInputChars} 字符` 
    }
  }
  
  return { valid: true, errorCode: null, errorMessage: null }
}

export {
  escapeForDoubleQuotes,
  escapeForSingleQuotes,
  getBareLineGuidance,
  getCharCategory,
  buildExplainedSpans,
  buildRiskMarkers,
  parseQuotedString,
  parseInverse,
  validateInput,
}
