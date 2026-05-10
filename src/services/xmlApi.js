
const API_BASE = import.meta.env.VITE_API_BASE || ''

const XML_API_BASE = `${API_BASE}/api/xml`

const ABORT_CONTROLLERS = new Map()

/**
 * 统一响应包络解析（XML 接口专用）
 * 与 JSON/Timestamp 接口不同，XML 接口成功结果为顶层 output（及可选 structure），
 * 不使用 data 包络。失败时仍含 success: false 与错误码、错误信息等。
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
        data.nodePath || '',
        data.lineNumber,
        data.columnNumber
      )
    }
    throw new ApiError('HTTP_ERROR', `HTTP ${response.status}`)
  }

  if (data && typeof data === 'object' && data.success === false) {
    throw new ApiError(
      data.errorCode || 'UNKNOWN_ERROR',
      data.errorMessage || '请求未成功',
      data.nodePath || '',
      data.lineNumber,
      data.columnNumber
    )
  }

  if (data && typeof data === 'object' && data.success) {
    return {
      output: data.output,
      structure: data.structure || null,
    }
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
  constructor(errorCode, errorMessage, nodePath = '', lineNumber, columnNumber) {
    super(errorMessage || errorCode)
    this.name = 'ApiError'
    this.errorCode = errorCode
    this.errorMessage = errorMessage
    this.nodePath = nodePath
    this.lineNumber = lineNumber
    this.columnNumber = columnNumber
  }
}

/**
 * XML 格式化
 * 核心解析与缩进依赖后端统一实现
 * @param {Object} options
 * @param {string} options.xmlString - 待格式化的 XML 字符串
 * @param {'SPACE'|'TAB'} [options.indentType=SPACE] - 缩进类型
 * @param {number} [options.indentWidth=2] - 缩进宽度（1-8，SPACE 下为每层空格数，TAB 时每层仍为一个制表符）
 * @param {'KEEP'|'REMOVE'|'REWRITE'} [options.declarationPolicy=KEEP] - XML 声明策略
 *   - KEEP：保留原声明（若无则不添加）
 *   - REMOVE：移除声明
 *   - REWRITE：重写为标准 UTF-8 声明
 * @param {'KEEP'|'REMOVE'} [options.commentPolicy=KEEP] - 注释策略
 *   - KEEP：保留注释
 *   - REMOVE：移除注释
 * @param {boolean} [options.includeStructure=false] - 是否请求文档结构摘要
 * @param {string} [abortKey] - 可取消请求的标识
 */
export async function formatXml({
  xmlString,
  indentType = 'SPACE',
  indentWidth = 2,
  declarationPolicy = 'KEEP',
  commentPolicy = 'KEEP',
  includeStructure = false,
}, abortKey) {
  const payload = {
    xmlString,
    indentType,
    indentWidth: Number(indentWidth),
    declarationPolicy,
    commentPolicy,
    includeStructure,
  }
  return postJson(`${XML_API_BASE}/format`, payload, abortKey)
}

/**
 * XML 压缩
 * 去除多余空白，输出紧凑单行
 * @param {Object} options
 * @param {string} options.xmlString - 待压缩的 XML 字符串
 * @param {'KEEP'|'REMOVE'|'REWRITE'} [options.declarationPolicy=KEEP] - XML 声明策略
 * @param {'KEEP'|'REMOVE'} [options.commentPolicy=KEEP] - 注释策略
 * @param {boolean} [options.includeStructure=false] - 是否请求文档结构摘要
 * @param {string} [abortKey] - 可取消请求的标识
 */
export async function compressXml({
  xmlString,
  declarationPolicy = 'KEEP',
  commentPolicy = 'KEEP',
  includeStructure = false,
}, abortKey) {
  const payload = {
    xmlString,
    declarationPolicy,
    commentPolicy,
    includeStructure,
  }
  return postJson(`${XML_API_BASE}/compress`, payload, abortKey)
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

/**
 * XML 声明策略选项
 * 影响输出中 XML 声明（如 <?xml version="1.0" encoding="UTF-8"?>）的存在形式
 */
export const DECLARATION_POLICY_OPTIONS = [
  { value: 'KEEP', label: '保留原声明 (KEEP)' },
  { value: 'REMOVE', label: '移除声明 (REMOVE)' },
  { value: 'REWRITE', label: '重写为 UTF-8 (REWRITE)' },
]

/**
 * 注释策略选项
 * 影响输出中 XML 注释（如 <!-- ... -->）的保留或移除
 */
export const COMMENT_POLICY_OPTIONS = [
  { value: 'KEEP', label: '保留注释 (KEEP)' },
  { value: 'REMOVE', label: '移除注释 (REMOVE)' },
]
