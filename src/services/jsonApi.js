
const API_BASE = import.meta.env.VITE_API_BASE || ''

const JSON_API_BASE = `${API_BASE}/api/json`

const ABORT_CONTROLLERS = new Map()

/**
 * 去除 JSON 字符串中的注释
 * 支持 // 单行注释和 /* *\/ 多行注释
 * 正确处理字符串内的 // 或 /* 不被误删
 */
export function stripJsonComments(str) {
  if (typeof str !== 'string' || !str) return str

  const result = []
  const len = str.length
  let inString = false
  let stringChar = ''
  let inSingleLineComment = false
  let inMultiLineComment = false
  let i = 0

  while (i < len) {
    const ch = str[i]
    const next = i + 1 < len ? str[i + 1] : ''

    if (inSingleLineComment) {
      if (ch === '\n' || ch === '\r') {
        inSingleLineComment = false
        result.push(ch)
      }
      i++
      continue
    }

    if (inMultiLineComment) {
      if (ch === '*' && next === '/') {
        inMultiLineComment = false
        i += 2
      } else {
        if (ch === '\n' || ch === '\r') {
          result.push(ch)
        }
        i++
      }
      continue
    }

    if (inString) {
      result.push(ch)
      if (ch === '\\' && next) {
        result.push(next)
        i += 2
        continue
      }
      if (ch === stringChar) {
        inString = false
      }
      i++
      continue
    }

    if (ch === '"' || ch === "'") {
      inString = true
      stringChar = ch
      result.push(ch)
      i++
      continue
    }

    if (ch === '/' && next === '/') {
      inSingleLineComment = true
      i += 2
      continue
    }

    if (ch === '/' && next === '*') {
      inMultiLineComment = true
      i += 2
      continue
    }

    result.push(ch)
    i++
  }

  return result.join('')
}

/**
 * 统一响应包络解析
 * 业务失败时 HTTP 可能为 400，但 JSON 形状仍保持一致
 */
async function handleResponse(response) {
  const text = await response.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error('响应解析失败：返回内容不是有效的 JSON')
  }

  if (!response.ok) {
    if (data && typeof data === 'object' && 'success' in data) {
      throw new ApiError(
        data.errorCode || 'UNKNOWN_ERROR',
        data.errorMessage || `HTTP ${response.status}`,
        data.nodePath || ''
      )
    }
    throw new ApiError('HTTP_ERROR', `HTTP ${response.status}`)
  }

  if (data && typeof data === 'object' && data.success === false) {
    throw new ApiError(
      data.errorCode || 'UNKNOWN_ERROR',
      data.errorMessage || '请求未成功',
      data.nodePath || ''
    )
  }

  if (data && typeof data === 'object' && data.success) {
    return data.data
  }

  return data
}

async function postJson(url, body, abortKey) {
  if (abortKey) {
    const existing = ABORT_CONTROLLERS.get(abortKey)
    if (existing) {
      existing.abort()
    }
    const controller = new AbortController()
    ABORT_CONTROLLERS.set(abortKey, controller)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      return handleResponse(response)
    } finally {
      ABORT_CONTROLLERS.delete(abortKey)
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return handleResponse(response)
}

export class ApiError extends Error {
  constructor(errorCode, errorMessage, nodePath = '') {
    super(errorMessage || errorCode)
    this.name = 'ApiError'
    this.errorCode = errorCode
    this.errorMessage = errorMessage
    this.nodePath = nodePath
  }
}

/**
 * JSON 格式化
 * 核心解析与缩进依赖后端统一实现
 * @param {Object} options
 * @param {string} options.jsonString - 待格式化的 JSON 字符串
 * @param {'SPACE'|'TAB'} [options.indentType=SPACE] - 缩进类型
 * @param {number} [options.indentWidth=2] - 缩进宽度（1-8，TAB 时每层仍为一个制表符）
 * @param {boolean} [options.sortKeys=false] - 是否按键名排序
 * @param {string} [abortKey] - 可取消请求的标识
 */
export async function formatJson({
  jsonString,
  indentType = 'SPACE',
  indentWidth = 2,
  sortKeys = false,
}, abortKey) {
  const payload = {
    jsonString,
    indentType,
    indentWidth: Number(indentWidth),
    sortKeys,
  }
  return postJson(`${JSON_API_BASE}/format`, payload, abortKey)
}

/**
 * JSON 压缩
 * 与格式化共享 sortKeys，输出为零缩进紧凑单行
 * @param {Object} options
 * @param {string} options.jsonString - 待压缩的 JSON 字符串
 * @param {boolean} [options.sortKeys=false] - 是否按键名排序
 * @param {string} [abortKey] - 可取消请求的标识
 */
export async function compressJson({
  jsonString,
  sortKeys = false,
}, abortKey) {
  const payload = {
    jsonString,
    sortKeys,
  }
  return postJson(`${JSON_API_BASE}/compress`, payload, abortKey)
}

/**
 * JSON 结构化搜索
 * 搜索语义与后端一致：
 * - query 不可为 null（空字符串易海量命中，前端可提示）
 * - searchTarget 缺省或空视为 KEY，可选 VALUE
 * - matchMode 缺省或空为 SUBSTRING，可选 EXACT
 * - caseSensitive 缺省或 null 时为区分大小写，显式 false 时忽略
 * @param {Object} options
 * @param {string} options.jsonString - 待搜索的 JSON 字符串
 * @param {string} options.query - 搜索关键词（不可为 null）
 * @param {'KEY'|'VALUE'} [options.searchTarget=KEY] - 搜索目标
 * @param {'SUBSTRING'|'EXACT'} [options.matchMode=SUBSTRING] - 匹配模式
 * @param {boolean} [options.caseSensitive=true] - 是否区分大小写
 * @param {string} [abortKey] - 可取消请求的标识
 */
export async function searchJson({
  jsonString,
  query,
  searchTarget = 'KEY',
  matchMode = 'SUBSTRING',
  caseSensitive = true,
}, abortKey) {
  const payload = {
    jsonString,
    query,
    searchTarget,
    matchMode,
    caseSensitive,
  }
  return postJson(`${JSON_API_BASE}/search`, payload, abortKey)
}

export const INDENT_TYPE_OPTIONS = [
  { value: 'SPACE', label: '空格 (SPACE)' },
  { value: 'TAB', label: '制表符 (TAB)' },
]

export const INDENT_WIDTH_OPTIONS = [
  { value: 1, label: '1' },
  { value: 2, label: '2 (默认)' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
  { value: 7, label: '7' },
  { value: 8, label: '8' },
]

export const SEARCH_TARGET_OPTIONS = [
  { value: 'KEY', label: '按键名搜索 (KEY)' },
  { value: 'VALUE', label: '按标量值搜索 (VALUE)' },
]

export const MATCH_MODE_OPTIONS = [
  { value: 'SUBSTRING', label: '子串匹配 (SUBSTRING)' },
  { value: 'EXACT', label: '精确匹配 (EXACT)' },
]
