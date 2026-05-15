import { SEVERITY, SEVERITY_ORDER, WARNING_CODE } from './constants'
import { getDeprecationLinks, getSunsetLinks, parseAllHeaders } from './header-parser'

export function createDeprecationNotice(parsedHeaders, sourceUrl = null) {
  const { deprecation, sunset, sunsetDate, links = [], warnings = [] } = parsedHeaders
  
  const effectiveAt = sunset || sunsetDate || (deprecation?.type === 'date' ? deprecation.value : null)
  const version = deprecation?.type === 'version' ? deprecation.value : null
  
  const deprecationLinks = getDeprecationLinks(links)
  const sunsetLinks = getSunsetLinks(links)
  const link = sunsetLinks[0]?.url || deprecationLinks[0]?.url || null
  
  const deprecationWarning = warnings.find(w => w.code === WARNING_CODE.DEPRECATION)
  const sunsetWarning = warnings.find(w => w.code === WARNING_CODE.SUNSET)
  const detail = sunsetWarning?.text || deprecationWarning?.text || null
  
  const now = new Date()
  let severity = SEVERITY.INFO
  
  if (effectiveAt) {
    const daysUntil = (effectiveAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysUntil <= 0) {
      severity = SEVERITY.BLOCKING
    } else if (daysUntil <= 30) {
      severity = SEVERITY.WARNING
    }
  } else if (deprecation || warnings.some(w => w.code === WARNING_CODE.DEPRECATION)) {
    severity = SEVERITY.WARNING
  }
  
  const id = generateNoticeId({ effectiveAt, version, link, detail, sourceUrl })
  
  return {
    id,
    effectiveAt,
    version,
    link,
    detail,
    severity,
    sourceUrl,
    rawHeaders: { deprecation, sunset, sunsetDate, links, warnings },
  }
}

function stringToUtf8Bytes(str) {
  const bytes = []
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i)
    if (charCode < 0x80) {
      bytes.push(charCode)
    } else if (charCode < 0x800) {
      bytes.push(0xc0 | (charCode >> 6))
      bytes.push(0x80 | (charCode & 0x3f))
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      bytes.push(0xe0 | (charCode >> 12))
      bytes.push(0x80 | ((charCode >> 6) & 0x3f))
      bytes.push(0x80 | (charCode & 0x3f))
    } else {
      i++
      const codePoint = 0x10000 + (((charCode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff))
      bytes.push(0xf0 | (codePoint >> 18))
      bytes.push(0x80 | ((codePoint >> 12) & 0x3f))
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f))
      bytes.push(0x80 | (codePoint & 0x3f))
    }
  }
  return bytes
}

function bytesToBase64(bytes) {
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i]
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0
    result += base64Chars[(b1 >> 2) & 0x3f]
    result += base64Chars[((b1 << 4) | (b2 >> 4)) & 0x3f]
    result += base64Chars[((b2 << 2) | (b3 >> 6)) & 0x3f]
    result += base64Chars[b3 & 0x3f]
  }
  const padding = (3 - bytes.length % 3) % 3
  return result.slice(0, result.length - padding) + '=='.slice(0, padding)
}

function generateNoticeId({ effectiveAt, version, link, detail, sourceUrl }) {
  const parts = [
    sourceUrl || '',
    effectiveAt?.toISOString() || '',
    version || '',
    link || '',
    detail || '',
  ]
  const combined = parts.join('|')
  const bytes = stringToUtf8Bytes(combined)
  return bytesToBase64(bytes).slice(0, 32)
}

export function mergeNotices(notices) {
  const seen = new Map()
  
  for (const notice of notices) {
    const existing = seen.get(notice.id)
    if (existing) {
      existing.sourceUrls = [...new Set([...(existing.sourceUrls || [existing.sourceUrl]), notice.sourceUrl].filter(Boolean))]
    } else {
      seen.set(notice.id, { ...notice, sourceUrls: [notice.sourceUrl].filter(Boolean) })
    }
  }
  
  return Array.from(seen.values()).sort((a, b) => {
    return SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  })
}

export function extractNoticesFromInput(input, sourceUrl = null) {
  const parsed = parseAllHeaders(input)
  const notice = createDeprecationNotice(parsed, sourceUrl)
  
  if (!notice.effectiveAt && !notice.version && !notice.link && !notice.detail) {
    return []
  }
  
  return [notice]
}

export function formatDateForDisplay(date) {
  if (!date) return ''
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date) {
  if (!date) return ''
  
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const absDiff = Math.abs(diff)
  
  const minutes = Math.floor(absDiff / (1000 * 60))
  const hours = Math.floor(absDiff / (1000 * 60 * 60))
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24))
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)
  
  if (diff < 0) {
    if (years > 0) return `${years} 年前`
    if (months > 0) return `${months} 个月前`
    if (days > 0) return `${days} 天前`
    if (hours > 0) return `${hours} 小时前`
    return `${minutes} 分钟前`
  } else {
    if (years > 0) return `${years} 年后`
    if (months > 0) return `${months} 个月后`
    if (days > 0) return `${days} 天后`
    if (hours > 0) return `${hours} 小时后`
    return `${minutes} 分钟后`
  }
}

export function getHumanReadableMessage(notice) {
  const { severity, effectiveAt, version, detail } = notice
  const relativeTime = effectiveAt ? formatRelativeTime(effectiveAt) : ''
  const formattedDate = effectiveAt ? formatDateForDisplay(effectiveAt) : ''
  
  switch (severity) {
    case SEVERITY.BLOCKING:
      if (version) {
        return `此 API 版本 ${version} 已停止服务（${formattedDate}）。请立即升级。`
      }
      return `此 API 已停止服务（${formattedDate}）。请迁移到新版本。`
    
    case SEVERITY.WARNING:
      if (version) {
        return `API 版本 ${version} 即将废弃（${formattedDate}，${relativeTime}）。请安排升级。`
      }
      if (effectiveAt) {
        return `此 API 即将在 ${formattedDate}（${relativeTime}）停止服务。`
      }
      return detail || '此 API 已标记为废弃，请尽快迁移。'
    
    case SEVERITY.INFO:
    default:
      if (version) {
        return `注意：正在使用 API 版本 ${version}。`
      }
      return detail || '有关于此 API 的重要通知。'
  }
}

export function getMachineReadableSummary(notice) {
  return {
    id: notice.id,
    effectiveAt: notice.effectiveAt?.toISOString() || null,
    version: notice.version,
    link: notice.link,
    severity: notice.severity,
  }
}
