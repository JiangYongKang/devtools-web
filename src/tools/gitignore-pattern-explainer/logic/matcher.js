import { TOKEN_TYPES } from './constants.js'

function charClassMatches(char, charClass) {
  if (!charClass.isComplete) {
    return false
  }

  let matches = false

  for (const singleChar of charClass.chars) {
    if (char === singleChar) {
      matches = true
      break
    }
  }

  for (const range of charClass.ranges || []) {
    if (char >= range.start && char <= range.end) {
      matches = true
      break
    }
  }

  return charClass.negated ? !matches : matches
}

function buildRegexFromTokens(tokens) {
  let patternStr = ''

  for (const token of tokens) {
    switch (token.type) {
      case TOKEN_TYPES.DOUBLE_ASTERISK:
        patternStr += '.*'
        break

      case TOKEN_TYPES.ASTERISK:
        patternStr += '[^/]*'
        break

      case TOKEN_TYPES.QUESTION_MARK:
        patternStr += '[^/]'
        break

      case TOKEN_TYPES.CHAR_CLASS:
        if (token.isComplete) {
          patternStr += token.value
        } else {
          patternStr += '\\['
        }
        break

      case TOKEN_TYPES.LEADING_SLASH:
        patternStr += '^'
        break

      case TOKEN_TYPES.SLASH:
        patternStr += '/'
        break

      case TOKEN_TYPES.TRAILING_SLASH:
        patternStr += '/.*$'
        break

      case TOKEN_TYPES.LITERAL:
        if (/[.*+?^${}()|[\]\\]/.test(token.value)) {
          patternStr += '\\' + token.value
        } else {
          patternStr += token.value
        }
        break
    }
  }

  if (!patternStr.endsWith('$') && !patternStr.endsWith('.*')) {
    patternStr += '(/.*)?$'
  }

  return patternStr
}

function matchTokens(tokens, pathParts, isAnchored, isDirectoryOnly, isNegative) {
  if (isDirectoryOnly && pathParts.length === 0) {
    return false
  }

  const testPath = pathParts.join('/')

  const hasLeadingSlash = tokens.some((t) => t.type === TOKEN_TYPES.LEADING_SLASH)
  const hasTrailingSlash = tokens.some((t) => t.type === TOKEN_TYPES.TRAILING_SLASH)
  const hasDoubleAsterisk = tokens.some((t) => t.type === TOKEN_TYPES.DOUBLE_ASTERISK)

  if (hasLeadingSlash || isAnchored) {
    const regexPattern = buildRegexFromTokens(tokens)
    try {
      const regex = new RegExp(regexPattern)
      return regex.test(testPath)
    } catch {
      return false
    }
  }

  if (hasDoubleAsterisk || tokens.some((t) => t.type === TOKEN_TYPES.SLASH)) {
    const regexPattern = buildRegexFromTokens(tokens)
    try {
      const regex = new RegExp(regexPattern)
      if (regex.test(testPath)) {
        return true
      }
      if (!regexPattern.startsWith('^')) {
        const anyMatchPattern = '.*' + regexPattern
        const anyRegex = new RegExp(anyMatchPattern)
        return anyRegex.test(testPath)
      }
      return false
    } catch {
      return false
    }
  }

  const regexPattern = buildRegexFromTokens(tokens)
  try {
    const regex = new RegExp(regexPattern)
    for (let i = 0; i < pathParts.length; i++) {
      const subPath = pathParts.slice(i).join('/')
      if (regex.test(subPath)) {
        return true
      }
    }
    return false
  } catch {
    return false
  }
}

function matchSinglePattern(parsedPattern, testPath) {
  if (parsedPattern.isEmpty || parsedPattern.isComment) {
    return { matched: false, reason: 'skip' }
  }

  const cleanPath = testPath.replace(/^\/+/, '').replace(/\/+$/, '')
  const pathParts = cleanPath.split('/').filter((p) => p.length > 0)

  const matched = matchTokens(
    parsedPattern.tokens,
    pathParts,
    parsedPattern.isAnchored,
    parsedPattern.isDirectoryOnly,
    parsedPattern.isNegative,
  )

  return {
    matched,
    isNegative: parsedPattern.isNegative,
    effectivePattern: parsedPattern.effectivePattern,
    rawPattern: parsedPattern.rawPattern,
  }
}

function matchPatterns(parsedPatterns, testPath) {
  let shouldIgnore = false
  const matchResults = []

  for (const parsed of parsedPatterns) {
    if (parsed.isEmpty || parsed.isComment) {
      continue
    }

    const result = matchSinglePattern(parsed, testPath)
    matchResults.push({
      lineNumber: parsed.lineNumber,
      pattern: parsed.rawPattern,
      matched: result.matched,
      isNegative: parsed.isNegative,
    })

    if (result.matched) {
      if (parsed.isNegative) {
        shouldIgnore = false
      } else {
        shouldIgnore = true
      }
    }
  }

  return {
    testPath,
    shouldIgnore,
    matches: matchResults,
  }
}

const DEFAULT_TEST_PATHS = [
  'src/app.js',
  'node_modules/lodash/index.js',
  'build/main.js',
  'logs/error.log',
  'important.log',
  'dist/index.html',
  'README.md',
  'temp/file.tmp',
]

export {
  charClassMatches,
  buildRegexFromTokens,
  matchTokens,
  matchSinglePattern,
  matchPatterns,
  DEFAULT_TEST_PATHS,
}
