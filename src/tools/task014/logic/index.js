const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  EMPTY_TOKEN: 'EMPTY_TOKEN',
  INVALID_SEGMENTS: 'INVALID_SEGMENTS',
  MISSING_HEADER: 'MISSING_HEADER',
  MISSING_PAYLOAD: 'MISSING_PAYLOAD',
  MISSING_SIGNATURE: 'MISSING_SIGNATURE',
  BASE64URL_DECODE_FAILED: 'BASE64URL_DECODE_FAILED',
  JSON_PARSE_FAILED: 'JSON_PARSE_FAILED',
  ALGORITHM_SEGMENT_INVALID: 'ALGORITHM_SEGMENT_INVALID',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: '输入为 null 或 undefined',
  [ERROR_CODES.EMPTY_TOKEN]: 'Token 不能为空',
  [ERROR_CODES.INVALID_SEGMENTS]: 'Token 分段无效，应为 header.payload.signature 格式',
  [ERROR_CODES.MISSING_HEADER]: '缺少 Header 段',
  [ERROR_CODES.MISSING_PAYLOAD]: '缺少 Payload 段',
  [ERROR_CODES.MISSING_SIGNATURE]: '缺少 Signature 段',
  [ERROR_CODES.BASE64URL_DECODE_FAILED]: 'Base64URL 解码失败',
  [ERROR_CODES.JSON_PARSE_FAILED]: 'JSON 解析失败',
  [ERROR_CODES.ALGORITHM_SEGMENT_INVALID]: '算法段无效，Header 必须包含有效的 "alg" 字段',
  [ERROR_CODES.INVALID_PARAMETER]: '参数无效',
}

const SECURITY_WARNING = '仅解码未验签，不可用于安全决策'

const AUDIT_NOTE = '本工具仅在浏览器本地解码 JWT 载荷，不验证签名有效性。' +
  '解码结果仅供调试和开发分析使用，' +
  '请不要将未验签的解码结果作为安全性判断依据。'

const PAYLOAD_DISPLAY_LIMIT = 1024 * 10

function getErrorMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] || '未知错误'
}

function base64UrlDecode(str) {
  if (typeof str !== 'string') {
    throw new Error(ERROR_CODES.BASE64URL_DECODE_FAILED)
  }

  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')

  while (base64.length % 4) {
    base64 += '='
  }

  try {
    const binary = atob(base64)
    return binary
  } catch (e) {
    throw new Error(ERROR_CODES.BASE64URL_DECODE_FAILED)
  }
}

function stringToUtf8(binary) {
  return decodeURIComponent(
    binary
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  )
}

function decodeJsonSegment(segment) {
  try {
    const decoded = base64UrlDecode(segment)
    const utf8String = stringToUtf8(decoded)
    return {
      raw: decoded,
      json: JSON.parse(utf8String),
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(ERROR_CODES.JSON_PARSE_FAILED)
    }
    throw e
  }
}

function parseToken(token) {
  if (token === null || token === undefined) {
    return {
      success: false,
      errorCode: ERROR_CODES.NULL_INPUT,
      errorMessage: getErrorMessage(ERROR_CODES.NULL_INPUT),
    }
  }

  if (typeof token !== 'string') {
    return {
      success: false,
      errorCode: ERROR_CODES.INVALID_PARAMETER,
      errorMessage: getErrorMessage(ERROR_CODES.INVALID_PARAMETER),
    }
  }

  const trimmed = token.trim()

  if (!trimmed) {
    return {
      success: false,
      errorCode: ERROR_CODES.EMPTY_TOKEN,
      errorMessage: getErrorMessage(ERROR_CODES.EMPTY_TOKEN),
    }
  }

  const segments = trimmed.split('.')

  if (segments.length !== 3) {
    return {
      success: false,
      errorCode: ERROR_CODES.INVALID_SEGMENTS,
      errorMessage: getErrorMessage(ERROR_CODES.INVALID_SEGMENTS),
    }
  }

  const [headerSegment, payloadSegment, signatureSegment] = segments

  if (!headerSegment) {
    return {
      success: false,
      errorCode: ERROR_CODES.MISSING_HEADER,
      errorMessage: getErrorMessage(ERROR_CODES.MISSING_HEADER),
    }
  }

  if (!payloadSegment) {
    return {
      success: false,
      errorCode: ERROR_CODES.MISSING_PAYLOAD,
      errorMessage: getErrorMessage(ERROR_CODES.MISSING_PAYLOAD),
    }
  }

  if (!signatureSegment) {
    return {
      success: false,
      errorCode: ERROR_CODES.MISSING_SIGNATURE,
      errorMessage: getErrorMessage(ERROR_CODES.MISSING_SIGNATURE),
    }
  }

  let headerDecoded
  try {
    headerDecoded = decodeJsonSegment(headerSegment)
  } catch (e) {
    const errorCode = e.message
    return {
      success: false,
      errorCode,
      errorMessage: getErrorMessage(errorCode),
    }
  }

  if (!headerDecoded.json || !headerDecoded.json.alg) {
    return {
      success: false,
      errorCode: ERROR_CODES.ALGORITHM_SEGMENT_INVALID,
      errorMessage: getErrorMessage(ERROR_CODES.ALGORITHM_SEGMENT_INVALID),
    }
  }

  let payloadDecoded
  try {
    payloadDecoded = decodeJsonSegment(payloadSegment)
  } catch (e) {
    const errorCode = e.message
    return {
      success: false,
      errorCode,
      errorMessage: getErrorMessage(errorCode),
    }
  }

  const payloadJson = JSON.stringify(payloadDecoded.json, null, 2)

  let payloadDisplayedLength = payloadJson.length
  let payloadTruncated = false
  let payloadDisplay = payloadJson

  if (payloadJson.length > PAYLOAD_DISPLAY_LIMIT) {
    payloadDisplay = payloadJson.slice(0, PAYLOAD_DISPLAY_LIMIT)
    payloadTruncated = true
    payloadDisplayedLength = PAYLOAD_DISPLAY_LIMIT
  }

  return {
    success: true,
    isUnverifiedDecodeOnly: true,
    rawToken: trimmed,
    headerSegment,
    headerJson: JSON.stringify(headerDecoded.json, null, 2),
    payloadSegment,
    payloadJson: payloadDisplay,
    payloadRaw: payloadDecoded.raw,
    signatureSegment,
    securityWarning: SECURITY_WARNING,
    payloadDisplayedLength,
    payloadTruncated,
    auditNote: AUDIT_NOTE,
  }
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  SECURITY_WARNING,
  AUDIT_NOTE,
  PAYLOAD_DISPLAY_LIMIT,
  getErrorMessage,
  base64UrlDecode,
  stringToUtf8,
  decodeJsonSegment,
  parseToken,
}
