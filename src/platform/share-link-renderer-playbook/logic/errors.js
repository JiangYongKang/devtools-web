import { ERROR_CODES } from './constants.js'

class ShareLinkError extends Error {
  constructor(code, message, details = null) {
    super(message)
    this.name = 'ShareLinkError'
    this.code = code
    this.details = details
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

function createError(code, message, details = null) {
  return new ShareLinkError(code, message, details)
}

function emptyInputError() {
  return createError(ERROR_CODES.EMPTY_INPUT, '输入不能为空', {
    suggestion: '请输入有效的 URL 或链接',
  })
}

function invalidUrlError(rawUrl) {
  return createError(ERROR_CODES.INVALID_URL, '无法解析为有效的 URL', {
    rawInput: rawUrl,
    suggestion: '请检查 URL 格式是否正确，确保包含协议前缀（如 https://）',
  })
}

function urlTooLongError(length, maxLength) {
  return createError(ERROR_CODES.URL_TOO_LONG, 'URL 长度超过限制', {
    actualLength: length,
    maxLength,
    suggestion: `建议 URL 长度不超过 ${maxLength} 字符`,
  })
}

function expandTimeoutError(timeout) {
  return createError(ERROR_CODES.EXPAND_TIMEOUT, '短链展开超时', {
    timeout,
    suggestion: '网络连接较慢或短链服务响应超时',
  })
}

function expandCORSError(domain) {
  return createError(ERROR_CODES.EXPAND_CORS_ERROR, 'CORS 限制导致无法展开', {
    domain,
    suggestion: '这是浏览器安全限制，不是工具缺陷。可尝试手动在新标签页打开查看重定向目标',
  })
}

function expandFailedError(statusText) {
  return createError(ERROR_CODES.EXPAND_FAILED, '短链展开失败', {
    statusText,
    suggestion: '可能是短链已失效或服务暂时不可用',
  })
}

function maxRedirectsError(maxRedirects) {
  return createError(ERROR_CODES.MAX_REDIRECTS, '超过最大重定向次数', {
    maxRedirects,
    suggestion: '过多重定向可能存在安全风险，已停止追踪',
  })
}

function copyFailedError() {
  return createError(ERROR_CODES.COPY_FAILED, '复制到剪贴板失败', {
    suggestion: '请检查浏览器权限设置，或手动选中文本复制',
  })
}

export {
  ShareLinkError,
  createError,
  emptyInputError,
  invalidUrlError,
  urlTooLongError,
  expandTimeoutError,
  expandCORSError,
  expandFailedError,
  maxRedirectsError,
  copyFailedError,
}
