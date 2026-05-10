
const API_BASE = import.meta.env.VITE_API_BASE || ''

const TIMESTAMP_API_BASE = `${API_BASE}/api/timestamp`

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
        data.errorMessage || `HTTP ${response.status}`
      )
    }
    throw new ApiError('HTTP_ERROR', `HTTP ${response.status}`)
  }

  if (data && typeof data === 'object' && data.success === false) {
    throw new ApiError(
      data.errorCode || 'UNKNOWN_ERROR',
      data.errorMessage || '请求未成功'
    )
  }

  if (data && typeof data === 'object' && data.success) {
    return data.data
  }

  return data
}

async function postJson(url, body) {
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
  constructor(errorCode, errorMessage) {
    super(errorMessage || errorCode)
    this.name = 'ApiError'
    this.errorCode = errorCode
    this.errorMessage = errorMessage
  }
}

/**
 * 时间戳转日期时间
 * 核心换算依赖后端统一实现，避免前端与后端规则不一致
 */
export async function toDateTime({
  timestamp,
  granularity = 'SECONDS',
  timezoneId,
  formatPattern,
}) {
  if (!timestamp && timestamp !== 0) {
    throw new ApiError('NULL_INPUT', '时间戳不能为空')
  }

  const payload = {
    timestamp: Number(timestamp),
    granularity,
    timezoneId,
  }

  if (formatPattern) {
    payload.formatPattern = formatPattern
  }

  return postJson(`${TIMESTAMP_API_BASE}/toDateTime`, payload)
}

/**
 * 日期时间转时间戳
 * 核心换算依赖后端统一实现，避免前端与后端规则不一致
 */
export async function toTimestamp({
  dateTimeString,
  timezoneId,
  formatPattern,
  granularity = 'SECONDS',
}) {
  if (!dateTimeString) {
    throw new ApiError('NULL_INPUT', '日期时间字符串不能为空')
  }

  const payload = {
    dateTimeString,
    timezoneId,
    granularity,
  }

  if (formatPattern) {
    payload.formatPattern = formatPattern
  }

  return postJson(`${TIMESTAMP_API_BASE}/toTimestamp`, payload)
}

export const GRANULARITY_OPTIONS = [
  { value: 'SECONDS', label: '秒级 (s)' },
  { value: 'MILLISECONDS', label: '毫秒级 (ms)' },
]

export const FORMAT_PATTERN_OPTIONS = [
  { value: 'YYYY-mm-dd HH:mm:ss', label: 'YYYY-mm-dd HH:mm:ss' },
  { value: 'YYYY/mm/dd HH:mm:ss', label: 'YYYY/mm/dd HH:mm:ss' },
]

/**
 * 常用时区（完整 IANA 标识）
 * 按常见城市/地区展示，避免使用三字母缩写
 */
export const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC (协调世界时)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (中国标准时间)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (日本标准时间)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (新加坡时间)' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (香港时间)' },
  { value: 'Asia/Seoul', label: 'Asia/Seoul (韩国标准时间)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (曼谷时间)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (迪拜时间)' },
  { value: 'Europe/London', label: 'Europe/London (伦敦时间)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (巴黎时间)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (柏林时间)' },
  { value: 'Europe/Moscow', label: 'Europe/Moscow (莫斯科时间)' },
  { value: 'America/New_York', label: 'America/New_York (纽约时间)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (洛杉矶时间)' },
  { value: 'America/Chicago', label: 'America/Chicago (芝加哥时间)' },
  { value: 'America/Toronto', label: 'America/Toronto (多伦多时间)' },
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (圣保罗时间)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (悉尼时间)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (奥克兰时间)' },
]
