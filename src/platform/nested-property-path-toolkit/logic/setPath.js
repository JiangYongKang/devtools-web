import { parsePath, checkDangerousKey, tokensToPath } from './pathParser.js'
import { ERROR_CODES, PATH_TYPES } from './constants.js'
import { PathError } from './errors.js'

/**
 * 克隆值（浅拷贝）
 * @param {*} value - 要克隆的值
 * @returns {*} 克隆后的值
 */
function clone(value) {
  if (Array.isArray(value)) {
    return [...value]
  }
  if (value !== null && typeof value === 'object') {
    return { ...value }
  }
  return value
}

/**
 * 不可变地设置嵌套对象的值（不修改原对象，共享未变化的子树）
 * @param {Object} obj - 源对象
 * @param {string} path - 路径字符串，如 'a.b[0].c'
 * @param {*|Function} value - 要设置的值或更新函数（接收旧值返回新值）
 * @param {Object} options - 配置选项
 * @param {boolean} options.createMissing - 是否自动创建不存在的中间路径，默认为 true
 * @returns {Object} 更新后的新对象
 * @throws {PathError} 当 createMissing 为 false 且路径不存在时抛出
 * @throws {PrototypePollutionError} 当路径包含危险键名时抛出
 */
function setPathImmutable(obj, path, value, options = {}) {
  const { createMissing = true } = options

  const tokens = parsePath(path)

  if (tokens.length === 0) {
    return value
  }

  function setRecursive(current, tokenIndex) {
    const token = tokens[tokenIndex]
    const isLast = tokenIndex === tokens.length - 1

    if (isLast) {
      let cloned = clone(current)
      if (cloned === null || cloned === undefined) {
        if (token.type === PATH_TYPES.ARRAY_INDEX) {
          cloned = []
        } else {
          cloned = {}
        }
      }
      if (token.type === PATH_TYPES.WILDCARD) {
        if (!Array.isArray(cloned)) {
          throw new PathError(
            'Wildcard can only be used on arrays',
            ERROR_CODES.INVALID_PATH_SYNTAX,
            token.offset,
            path
          )
        }
        return cloned.map(item => {
          if (typeof value === 'function') {
            return value(item)
          }
          return value
        })
      }
      const key = token.value
      checkDangerousKey(String(key))

      if (typeof value === 'function') {
        cloned[key] = value(cloned[key])
      } else {
        cloned[key] = value
      }
      return cloned
    }

    let nextContainer = current
    const key = token.type === PATH_TYPES.WILDCARD ? '*' : token.value

    if (key !== '*') {
      checkDangerousKey(String(key))
    }

    if (current === null || current === undefined) {
      if (!createMissing) {
        throw new PathError(
          `Cannot create path on ${current}`,
          ERROR_CODES.PATH_NOT_FOUND,
          token.offset,
          path
        )
      }
      if (token.type === PATH_TYPES.ARRAY_INDEX) {
        nextContainer = []
      } else {
        nextContainer = {}
      }
    } else if (token.type === PATH_TYPES.ARRAY_INDEX && !Array.isArray(current)) {
      if (!createMissing) {
        throw new PathError(
          'Array index access on non-array',
          ERROR_CODES.INVALID_PATH_SYNTAX,
          token.offset,
          path
        )
      }
      nextContainer = []
    } else if (token.type === PATH_TYPES.PROPERTY && Array.isArray(current)) {
      nextContainer = { ...current }
    } else {
      nextContainer = clone(current)
    }

    if (token.type === PATH_TYPES.WILDCARD) {
      if (!Array.isArray(nextContainer)) {
        throw new PathError(
          'Wildcard can only be used on arrays',
          ERROR_CODES.INVALID_PATH_SYNTAX,
          token.offset,
          path
        )
      }
      return nextContainer.map(item => setRecursive(item, tokenIndex + 1))
    }

    const nextValue = setRecursive(nextContainer[key], tokenIndex + 1)
    nextContainer[key] = nextValue

    return nextContainer
  }

  return setRecursive(obj, 0)
}

/**
 * 可变地设置嵌套对象的值（直接修改原对象）
 * @param {Object} obj - 源对象（会被修改）
 * @param {string} path - 路径字符串，如 'a.b[0].c'
 * @param {*|Function} value - 要设置的值或更新函数（接收旧值返回新值）
 * @returns {Object} 修改后的原对象
 * @throws {PathError} 当通配符用在非数组上时抛出
 * @throws {PrototypePollutionError} 当路径包含危险键名时抛出
 */
function setPathMutable(obj, path, value) {
  const tokens = parsePath(path)

  if (tokens.length === 0) {
    return value
  }

  let current = obj

  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i]

    if (token.type === PATH_TYPES.WILDCARD) {
      if (!Array.isArray(current)) {
        throw new PathError(
          'Wildcard can only be used on arrays',
          ERROR_CODES.INVALID_PATH_SYNTAX,
          token.offset,
          path
        )
      }
      const remainingTokens = tokens.slice(i + 1)
      const remainingPath = tokensToPath(remainingTokens)
      current.forEach(item => setPathMutable(item, remainingPath, value))
      return obj
    }

    const key = token.value
    checkDangerousKey(String(key))

    if (!(key in current) || current[key] === null || current[key] === undefined) {
      if (tokens[i + 1].type === PATH_TYPES.ARRAY_INDEX) {
        current[key] = []
      } else {
        current[key] = {}
      }
    }

    current = current[key]
  }

  const lastToken = tokens[tokens.length - 1]
  if (lastToken.type === PATH_TYPES.WILDCARD) {
    if (!Array.isArray(current)) {
      throw new PathError(
        'Wildcard can only be used on arrays',
        ERROR_CODES.INVALID_PATH_SYNTAX,
        lastToken.offset,
        path
      )
    }
    current.forEach((item, index) => {
      if (typeof value === 'function') {
        current[index] = value(item)
      } else {
        current[index] = value
      }
    })
  } else {
    const key = lastToken.value
    checkDangerousKey(String(key))
    if (typeof value === 'function') {
      current[key] = value(current[key])
    } else {
      current[key] = value
    }
  }

  return obj
}

export { setPathImmutable, setPathMutable, clone }
