import { ERROR_CODES } from './constants.js'

class WebhookSignatureError extends Error {
  constructor(message, errorCode, details = {}) {
    super(message)
    this.name = 'WebhookSignatureError'
    this.errorCode = errorCode
    this.details = details
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      details: this.details,
    }
  }
}

function createError(errorCode, details = {}) {
  const messages = {
    [ERROR_CODES.BODY_TOO_LARGE]: `请求体过大，超过 ${details.maxSize} 字节`,
    [ERROR_CODES.MISSING_SECRET]: '缺少签名密钥',
    [ERROR_CODES.MISSING_TIMESTAMP]: 'Stripe v1 签名需要时间戳',
    [ERROR_CODES.INVALID_PROVIDER]: `不支持的签名提供方: ${details.provider}`,
    [ERROR_CODES.CRYPTO_NOT_SUPPORTED]: '浏览器不支持 Web Crypto API',
  }

  return new WebhookSignatureError(
    messages[errorCode] || '发生未知错误',
    errorCode,
    details
  )
}

export { WebhookSignatureError, createError }
