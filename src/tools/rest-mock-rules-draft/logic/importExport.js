import { parse } from 'yaml'
import { ERROR_CODES, STORAGE_KEY, SHARE_PARAM_MAX_LENGTH } from './constants.js'
import { createError } from './errors.js'
import { normalizeDraft, createEmptyDraft } from './normalization.js'

const yamlParser = { parse }

export function exportDraftToJson(draft) {
  const normalized = normalizeDraft(draft)
  return JSON.stringify(normalized, null, 2)
}

export function downloadDraft(draft, filename = null) {
  const json = exportDraftToJson(draft)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `mock-rules-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  return { success: true, filename: a.download }
}

export function importFromJson(jsonText) {
  if (typeof jsonText !== 'string' || jsonText.trim() === '') {
    return {
      success: false,
      error: createError(ERROR_CODES.IMPORT_FAILED, '导入内容为空'),
    }
  }

  try {
    const parsed = JSON.parse(jsonText)
    const normalized = normalizeDraft(parsed)
    return {
      success: true,
      draft: normalized,
    }
  } catch (e) {
    return {
      success: false,
      error: createError(ERROR_CODES.IMPORT_FAILED, `JSON 解析失败: ${e.message}`),
    }
  }
}

export function importFromYaml(yamlText, yamlParser) {
  if (typeof yamlText !== 'string' || yamlText.trim() === '') {
    return {
      success: false,
      error: createError(ERROR_CODES.IMPORT_FAILED, '导入内容为空'),
    }
  }

  try {
    if (!yamlParser || typeof yamlParser.parse !== 'function') {
      return {
        success: false,
        error: createError(ERROR_CODES.INVALID_YAML, 'YAML 解析器不可用'),
      }
    }

    const parsed = yamlParser.parse(yamlText)
    const normalized = normalizeDraft(parsed)
    return {
      success: true,
      draft: normalized,
    }
  } catch (e) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_YAML, `YAML 解析失败: ${e.message}`),
    }
  }
}

export function saveDraftToStorage(draft) {
  try {
    const json = exportDraftToJson(draft)
    localStorage.setItem(STORAGE_KEY, json)
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: createError(ERROR_CODES.IMPORT_FAILED, `保存到 localStorage 失败: ${e.message}`),
    }
  }
}

export function loadDraftFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return { success: false, draft: createEmptyDraft() }
    }
    return importFromJson(stored)
  } catch (e) {
    return {
      success: false,
      draft: createEmptyDraft(),
      error: createError(ERROR_CODES.IMPORT_FAILED, `从 localStorage 读取失败: ${e.message}`),
    }
  }
}

export function clearDraftFromStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: createError(ERROR_CODES.IMPORT_FAILED, `清除 localStorage 失败: ${e.message}`),
    }
  }
}

export function encodeShareUrl(draft) {
  try {
    const json = exportDraftToJson(draft)
    const encoded = encodeURIComponent(json)

    if (encoded.length > SHARE_PARAM_MAX_LENGTH) {
      return {
        success: false,
        error: createError(
          ERROR_CODES.SHARE_URL_TOO_LONG,
          `分享链接过长 (${encoded.length} 字符)，超过限制 ${SHARE_PARAM_MAX_LENGTH} 字符。请减少规则数量或导出到文件。`
        ),
      }
    }

    return {
      success: true,
      param: encoded,
      length: encoded.length,
    }
  } catch (e) {
    return {
      success: false,
      error: createError(ERROR_CODES.IMPORT_FAILED, `编码分享链接失败: ${e.message}`),
    }
  }
}

export function decodeShareUrl(param) {
  if (typeof param !== 'string' || param.trim() === '') {
    return {
      success: false,
      error: createError(ERROR_CODES.IMPORT_FAILED, '分享参数为空'),
    }
  }

  try {
    const decoded = decodeURIComponent(param)
    return importFromJson(decoded)
  } catch (e) {
    return {
      success: false,
      error: createError(ERROR_CODES.IMPORT_FAILED, `解码分享链接失败: ${e.message}`),
    }
  }
}

export function generateShareUrl(draft, baseUrl = window?.location?.href || '') {
  const encoding = encodeShareUrl(draft)
  if (!encoding.success) {
    return encoding
  }

  try {
    const url = new URL(baseUrl)
    url.searchParams.set('draft', encoding.param)
    return {
      success: true,
      url: url.toString(),
      length: encoding.length,
    }
  } catch {
    const separator = baseUrl.includes('?') ? '&' : '?'
    return {
      success: true,
      url: `${baseUrl}${separator}draft=${encoding.param}`,
      length: encoding.length,
    }
  }
}

export function importDraftFromText(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return {
      success: false,
      error: createError(ERROR_CODES.IMPORT_FAILED, '导入内容为空'),
    }
  }

  let result = importFromJson(text)
  if (result.success) {
    return result
  }

  try {
    result = importFromYaml(text, yamlParser)
    if (result.success) {
      return result
    }
  } catch {
    // ignore YAML parse errors, fall back to JSON error
  }

  return result
}

export function saveToLocalStorage(draft) {
  saveDraftToStorage(draft)
}

export function loadFromLocalStorage() {
  const result = loadDraftFromStorage()
  return result.success ? result.draft : null
}

export function clearFromLocalStorage() {
  clearDraftFromStorage()
}
