import { DIFF_TYPES } from './constants.js'
import { stringifyPath } from './pathParser.js'

/**
 * 深度比较两个值是否相等（支持 NaN、-0、数组和对象）
 * @param {*} a - 第一个值
 * @param {*} b - 第二个值
 * @returns {boolean} 是否相等
 */
function isEqual(a, b) {
  if (a === b) {
    if (a === 0) {
      return 1 / a === 1 / b
    }
    return true
  }

  if (a !== a && b !== b) {
    return true
  }

  if (typeof a !== typeof b) {
    return false
  }

  if (typeof a === 'object' && a !== null && b !== null) {
    if (Array.isArray(a) !== Array.isArray(b)) {
      return false
    }

    if (Array.isArray(a)) {
      if (a.length !== b.length) {
        return false
      }
      for (let i = 0; i < a.length; i++) {
        if (!isEqual(a[i], b[i])) {
          return false
        }
      }
      return true
    }

    const keysA = Object.keys(a)
    const keysB = Object.keys(b)

    if (keysA.length !== keysB.length) {
      return false
    }

    for (const key of keysA) {
      if (!isEqual(a[key], b[key])) {
        return false
      }
    }

    return true
  }

  return false
}

/**
 * 递归比较两个对象，找出差异
 * @param {Object} oldObj - 旧对象
 * @param {Object} newObj - 新对象
 * @param {Array} currentPath - 当前路径（用于递归）
 * @returns {Array} 变更列表，每项包含 type、path、oldValue、value
 */
function diffObjects(oldObj, newObj, currentPath = []) {
  const changes = []

  const allKeys = new Set([
    ...(oldObj ? Object.keys(oldObj) : []),
    ...(newObj ? Object.keys(newObj) : []),
  ])

  for (const key of allKeys) {
    const path = [...currentPath, key]
    const oldVal = oldObj ? oldObj[key] : undefined
    const newVal = newObj ? newObj[key] : undefined

    if (oldVal === undefined) {
      changes.push({
        type: DIFF_TYPES.ADD,
        path: stringifyPath(path),
        value: newVal,
      })
    } else if (newVal === undefined) {
      changes.push({
        type: DIFF_TYPES.REMOVE,
        path: stringifyPath(path),
        oldValue: oldVal,
      })
    } else if (
      oldVal !== null &&
      newVal !== null &&
      typeof oldVal === 'object' &&
      typeof newVal === 'object' &&
      !Array.isArray(oldVal) &&
      !Array.isArray(newVal)
    ) {
      changes.push(...diffObjects(oldVal, newVal, path))
    } else if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      changes.push(...diffArrays(oldVal, newVal, path))
    } else if (!isEqual(oldVal, newVal)) {
      changes.push({
        type: DIFF_TYPES.UPDATE,
        path: stringifyPath(path),
        oldValue: oldVal,
        value: newVal,
      })
    }
  }

  return changes
}

/**
 * 递归比较两个数组，找出差异
 * @param {Array} oldArr - 旧数组
 * @param {Array} newArr - 新数组
 * @param {Array} currentPath - 当前路径（用于递归）
 * @returns {Array} 变更列表
 */
function diffArrays(oldArr, newArr, currentPath = []) {
  const changes = []

  const maxLen = Math.max(oldArr.length, newArr.length)

  for (let i = 0; i < maxLen; i++) {
    const path = [...currentPath, i]
    const oldVal = oldArr[i]
    const newVal = newArr[i]

    if (oldVal === undefined) {
      changes.push({
        type: DIFF_TYPES.ADD,
        path: stringifyPath(path),
        value: newVal,
      })
    } else if (newVal === undefined) {
      changes.push({
        type: DIFF_TYPES.REMOVE,
        path: stringifyPath(path),
        oldValue: oldVal,
      })
    } else if (
      oldVal !== null &&
      newVal !== null &&
      typeof oldVal === 'object' &&
      typeof newVal === 'object' &&
      !Array.isArray(oldVal) &&
      !Array.isArray(newVal)
    ) {
      changes.push(...diffObjects(oldVal, newVal, path))
    } else if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      changes.push(...diffArrays(oldVal, newVal, path))
    } else if (!isEqual(oldVal, newVal)) {
      changes.push({
        type: DIFF_TYPES.UPDATE,
        path: stringifyPath(path),
        oldValue: oldVal,
        value: newVal,
      })
    }
  }

  return changes
}

/**
 * 检测数组元素的移动（启发式检测，基于值相等）
 * @param {Array} oldArr - 旧数组
 * @param {Array} newArr - 新数组
 * @returns {Array} 移动列表，每项包含 type、from、to、value
 */
function detectMoves(oldArr, newArr) {
  const moves = []

  const oldMap = new Map()
  for (let i = 0; i < oldArr.length; i++) {
    const item = oldArr[i]
    const key = JSON.stringify(item)
    if (!oldMap.has(key)) {
      oldMap.set(key, [])
    }
    oldMap.get(key).push(i)
  }

  for (let i = 0; i < newArr.length; i++) {
    const item = newArr[i]
    const key = JSON.stringify(item)
    if (oldMap.has(key) && oldMap.get(key).length > 0) {
      const oldIndex = oldMap.get(key).shift()
      if (oldIndex !== i) {
        moves.push({
          type: DIFF_TYPES.MOVE,
          from: oldIndex,
          to: i,
          value: item,
        })
      }
    }
  }

  return moves
}

/**
 * 比较两个对象或数组，输出变更路径列表
 * @param {Object|Array} oldObj - 旧对象/数组
 * @param {Object|Array} newObj - 新对象/数组
 * @param {Object} options - 配置选项
 * @param {boolean} options.detectArrayMoves - 是否检测数组元素移动，默认为 false
 * @returns {Array} 变更列表，每项包含 type（add/remove/update/move）、path、value、oldValue
 */
function diff(oldObj, newObj, options = {}) {
  const { detectArrayMoves = false } = options

  if (isEqual(oldObj, newObj)) {
    return []
  }

  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    const changes = diffArrays(oldObj, newObj, [])

    if (detectArrayMoves) {
      const moves = detectMoves(oldObj, newObj)
      if (moves.length > 0) {
        return [...changes, ...moves.map(m => ({
          type: DIFF_TYPES.MOVE,
          path: `[${m.from}]`,
          toPath: `[${m.to}]`,
          value: m.value,
        }))]
      }
    }

    return changes
  }

  return diffObjects(oldObj, newObj, [])
}

/**
 * 脱敏对象中的敏感字段（用于日志打印）
 * @param {Object} obj - 源对象（不会被修改）
 * @param {Array} sensitivePaths - 敏感路径列表
 * @param {string} mask - 脱敏掩码，默认为 '***'
 * @returns {Object} 脱敏后的对象副本
 */
function maskSensitiveData(obj, sensitivePaths, mask = '***') {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  const result = JSON.parse(JSON.stringify(obj))

  for (const path of sensitivePaths) {
    const parts = path.split(/[.[\]]/).filter(Boolean)
    let current = result
    let parent = null
    let lastKey = null

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (i === parts.length - 1) {
        parent = current
        lastKey = part
      } else {
        if (current[part] === undefined) {
          break
        }
        current = current[part]
      }
    }

    if (parent && lastKey && parent[lastKey] !== undefined) {
      parent[lastKey] = mask
    }
  }

  return result
}

/**
 * 获取两个对象之间所有变更的路径列表
 * @param {Object|Array} oldObj - 旧对象/数组
 * @param {Object|Array} newObj - 新对象/数组
 * @returns {Array} 变更路径的字符串数组
 */
function getChangedPaths(oldObj, newObj) {
  const changes = diff(oldObj, newObj)
  return changes.map(c => c.path)
}

export {
  diff,
  diffObjects,
  diffArrays,
  detectMoves,
  isEqual,
  maskSensitiveData,
  getChangedPaths,
}
