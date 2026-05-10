

const API_BASE = import.meta.env.VITE_API_BASE || ''

const URL_API_BASE = `${API_BASE}/api/url`

const ABORT_CONTROLLERS = new Map()

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
        data.data
      )
    }
    throw new ApiError('HTTP_ERROR', `HTTP ${response.status}`)
  }

  if (data && typeof data === 'object' && data.success === false) {
    throw new ApiError(
      data.errorCode || 'UNKNOWN_ERROR',
      data.errorMessage || '请求未成功',
      data.data
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
  constructor(errorCode, errorMessage, payload = null) {
    super(errorMessage || errorCode)
    this.name = 'ApiError'
    this.errorCode = errorCode
    this.errorMessage = errorMessage
    this.payload = payload
  }
}

export async function encodeUrl({ text, charset, style }, abortKey) {
  const payload = { text }
  if (charset != null && charset !== '') {
    payload.charset = charset
  }
  if (style != null && style !== '') {
    payload.style = style
  }
  return postJson(`${URL_API_BASE}/encode`, payload, abortKey)
}

export async function decodeUrl({ text, charset, style }, abortKey) {
  const payload = { text }
  if (charset != null && charset !== '') {
    payload.charset = charset
  }
  if (style != null && style !== '') {
    payload.style = style
  }
  return postJson(`${URL_API_BASE}/decode`, payload, abortKey)
}

export async function batchUrl(items, abortKey) {
  return postJson(`${URL_API_BASE}/batch`, items, abortKey)
}

export const STYLE_OPTIONS = [
  { value: 'URI_COMPONENT', label: 'URI 组件 (URI_COMPONENT) - 空格为 %20' },
  { value: 'FORM', label: '表单 (FORM) - 空格为 +，适用于 application/x-www-form-urlencoded' },
]

export const CHARSET_OPTIONS = [
  { value: 'UTF-8', label: 'UTF-8 (默认)' },
  { value: 'ISO-8859-1', label: 'ISO-8859-1 (Latin-1)' },
  { value: 'GBK', label: 'GBK (简体中文)' },
  { value: 'GB2312', label: 'GB2312 (简体中文)' },
  { value: 'UTF-16', label: 'UTF-16' },
  { value: 'UTF-16BE', label: 'UTF-16BE (大端序)' },
  { value: 'UTF-16LE', label: 'UTF-16LE (小端序)' },
]

export const ERROR_CODE_MESSAGES = {
  NULL_INPUT: '输入不能为空（text 字段为 null 或未提供）',
  INVALID_CHARSET: '无效的字符集名称',
  INVALID_ACTION: '无效的操作类型（仅支持 ENCODE / DECODE）',
  ENCODE_FAILED: '编码失败',
  DECODE_FAILED: '解码失败',
  INVALID_PERCENT_SEQUENCE: '无效的百分号序列（不完整 % 或非十六进制字符）',
  INVALID_UTF8_SEQUENCE: '无效的 UTF-8 字节序列',
  HTTP_ERROR: '网络请求失败',
  UNKNOWN_ERROR: '未知错误',
}
