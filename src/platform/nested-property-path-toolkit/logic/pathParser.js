import { ERROR_CODES, PATH_TYPES } from './constants.js'
import { PathError, PrototypePollutionError } from './errors.js'

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * 检测键名是否为危险的原型污染键
 * @param {string} key - 要检测的键名
 * @returns {boolean} 如果是危险键返回 true，否则返回 false
 */
function isDangerousKey(key) {
  return DANGEROUS_KEYS.has(key)
}

/**
 * 检查键名是否为危险键，如果是则抛出 PrototypePollutionError
 * @param {string} key - 要检查的键名
 * @throws {PrototypePollutionError} 当键名是危险键时抛出
 */
function checkDangerousKey(key) {
  if (isDangerousKey(key)) {
    throw new PrototypePollutionError(key)
  }
}

/**
 * 解析路径字符串为 token 数组
 * @param {string} pathStr - 路径字符串，如 'a.b[0].c'
 * @returns {Array} 解析后的 token 数组
 * @throws {PathError} 当路径语法错误时抛出（如未闭合的括号、转义字符后无内容等）
 * @throws {PrototypePollutionError} 当路径包含危险键名（如 __proto__）时抛出
 */
function parsePath(pathStr) {
  if (pathStr === '' || pathStr === null || pathStr === undefined) {
    return []
  }

  const tokens = []
  let i = 0
  let current = ''
  const len = pathStr.length

  while (i < len) {
    const char = pathStr[i]

    if (char === '\\') {
      i++
      if (i >= len) {
        throw new PathError(
          'Unexpected end of path after escape character',
          ERROR_CODES.INVALID_PATH_SYNTAX,
          i - 1,
          pathStr
        )
      }
      current += pathStr[i]
      i++
      continue
    }

    if (char === '.') {
      if (current !== '') {
        checkDangerousKey(current)
        tokens.push({ type: PATH_TYPES.PROPERTY, value: current, offset: i - current.length })
        current = ''
      }
      i++
      continue
    }

    if (char === '[') {
      if (current !== '') {
        checkDangerousKey(current)
        tokens.push({ type: PATH_TYPES.PROPERTY, value: current, offset: i - current.length })
        current = ''
      }

      i++
      const bracketStart = i

      if (i < len && pathStr[i] === ']') {
        tokens.push({ type: PATH_TYPES.WILDCARD, value: '*', offset: bracketStart - 1 })
        i++
        continue
      }

      let inQuote = null
      let bracketContent = ''

      while (i < len) {
        const bChar = pathStr[i]

        if (bChar === '\\' && inQuote) {
          i++
          if (i >= len) {
            throw new PathError(
              'Unexpected end of path in quoted string',
              ERROR_CODES.INVALID_PATH_SYNTAX,
              i - 1,
              pathStr
            )
          }
          bracketContent += pathStr[i]
          i++
          continue
        }

        if ((bChar === '"' || bChar === "'") && (i === bracketStart || pathStr[i - 1] !== '\\')) {
          if (inQuote === null) {
            inQuote = bChar
          } else if (inQuote === bChar) {
            inQuote = null
          }
          bracketContent += bChar
          i++
          continue
        }

        if (bChar === ']' && inQuote === null) {
          break
        }

        bracketContent += bChar
        i++
      }

      if (i >= len) {
        throw new PathError(
          'Unclosed bracket',
          ERROR_CODES.INVALID_PATH_SYNTAX,
          bracketStart - 1,
          pathStr
        )
      }

      i++

      let key = bracketContent.trim()

      if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1)
        checkDangerousKey(key)
        tokens.push({ type: PATH_TYPES.PROPERTY, value: key, offset: bracketStart })
      } else if (/^-?\d+$/.test(key)) {
        const num = parseInt(key, 10)
        tokens.push({ type: PATH_TYPES.ARRAY_INDEX, value: num, offset: bracketStart })
      } else if (key === '') {
        throw new PathError(
          'Empty bracket key',
          ERROR_CODES.INVALID_PATH_SYNTAX,
          bracketStart,
          pathStr
        )
      } else {
        checkDangerousKey(key)
        tokens.push({ type: PATH_TYPES.PROPERTY, value: key, offset: bracketStart })
      }

      continue
    }

    current += char
    i++
  }

  if (current !== '') {
    checkDangerousKey(current)
    tokens.push({ type: PATH_TYPES.PROPERTY, value: current, offset: len - current.length })
  }

  return tokens
}

/**
 * 将 token 数组转换回路径字符串
 * @param {Array} tokens - token 数组
 * @returns {string} 路径字符串
 */
function tokensToPath(tokens) {
  let result = ''
  for (const token of tokens) {
    if (token.type === PATH_TYPES.ARRAY_INDEX) {
      result += `[${token.value}]`
    } else if (token.type === PATH_TYPES.WILDCARD) {
      result += '[]'
    } else {
      const value = String(token.value)
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
        if (result) {
          result += '.'
        }
        result += value
      } else {
        const escaped = value.replace(/"/g, '\\"')
        result += `["${escaped}"]`
      }
    }
  }
  return result
}

/**
 * 将路径部分数组转换为路径字符串
 * @param {Array} parts - 路径部分数组，如 ['a', 'b', 0]
 * @returns {string} 路径字符串
 */
function stringifyPath(parts) {
  if (!Array.isArray(parts)) {
    return ''
  }
  return tokensToPath(parts.map(p => ({ type: typeof p === 'number' ? PATH_TYPES.ARRAY_INDEX : PATH_TYPES.PROPERTY, value: p })))
}

/**
 * 根据路径安全获取嵌套对象的值
 * @param {Object} obj - 源对象
 * @param {string} path - 路径字符串，如 'a.b[0].c'
 * @param {Object} options - 配置选项
 * @param {*} options.default - 当路径不存在时返回的默认值
 * @param {boolean} options.strict - 是否启用严格模式，不存在时抛出错误
 * @returns {*} 路径对应的值
 * @throws {PathError} strict 模式下路径不存在或中间节点为 null/undefined 时抛出
 */
function getPath(obj, path, options = {}) {
  const { default: defaultValue, strict } = { ...options }

  if (obj === null || obj === undefined) {
    if (strict) {
      throw new PathError(
        'Object is null or undefined',
        ERROR_CODES.PATH_NOT_FOUND,
        0,
        path
      )
    }
    return defaultValue
  }

  const tokens = parsePath(path)

  if (tokens.length === 0) {
    return obj
  }

  let current = obj

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (current === null || current === undefined) {
      if (strict) {
        throw new PathError(
          `Cannot access property '${token.value}' on ${current}`,
          ERROR_CODES.PATH_NOT_FOUND,
          token.offset,
          path
        )
      }
      return defaultValue
    }

    if (token.type === PATH_TYPES.WILDCARD) {
      if (!Array.isArray(current)) {
        if (strict) {
          throw new PathError(
            'Wildcard can only be used on arrays',
            ERROR_CODES.INVALID_PATH_SYNTAX,
            token.offset,
            path
          )
        }
        return defaultValue
      }
      const remainingTokens = tokens.slice(i + 1)
      const remainingPath = tokensToPath(remainingTokens)
      return current.map(item => getPath(item, remainingPath, options))
    }

    const key = token.value

    if (!(key in current)) {
      if (strict) {
        throw new PathError(
          `Property '${key}' not found`,
          ERROR_CODES.PATH_NOT_FOUND,
          token.offset,
          path
        )
      }
      return defaultValue
    }

    current = current[key]
  }

  return current
}

export {
  parsePath,
  tokensToPath,
  stringifyPath,
  getPath,
  isDangerousKey,
  checkDangerousKey,
}
