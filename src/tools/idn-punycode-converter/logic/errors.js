const ERROR_CODES = {
  EMPTY: 'EMPTY',
  NULL_INPUT: 'NULL_INPUT',
  INVALID_PUNYCODE: 'INVALID_PUNYCODE',
  EMPTY_LABEL: 'EMPTY_LABEL',
  LABEL_TOO_LONG: 'LABEL_TOO_LONG',
  DOMAIN_TOO_LONG: 'DOMAIN_TOO_LONG',
  INVALID_CHAR: 'INVALID_CHAR',
  INVALID_DOMAIN: 'INVALID_DOMAIN',
  PUNYCODE_DECODE_ERROR: 'PUNYCODE_DECODE_ERROR',
  PUNYCODE_ENCODE_ERROR: 'PUNYCODE_ENCODE_ERROR',
  INVALID_IDNA: 'INVALID_IDNA',
  CONSECUTIVE_DOTS: 'CONSECUTIVE_DOTS',
  LEADING_DOT: 'LEADING_DOT',
  TRAILING_DOT: 'TRAILING_DOT',
  HYPHEN_AT_EDGE: 'HYPHEN_AT_EDGE',
  ALL_HYPHENS: 'ALL_HYPHENS',
  INVALID_ACE_PREFIX: 'INVALID_ACE_PREFIX',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.EMPTY]: '输入为空',
  [ERROR_CODES.NULL_INPUT]: '输入为 null 或 undefined',
  [ERROR_CODES.INVALID_PUNYCODE]: '非法 Punycode 序列',
  [ERROR_CODES.EMPTY_LABEL]: '存在空标签',
  [ERROR_CODES.LABEL_TOO_LONG]: '标签长度超过 63 字符',
  [ERROR_CODES.DOMAIN_TOO_LONG]: '域名总长度超过 253 字节',
  [ERROR_CODES.INVALID_CHAR]: '包含非法字符',
  [ERROR_CODES.INVALID_DOMAIN]: '非法域名格式',
  [ERROR_CODES.PUNYCODE_DECODE_ERROR]: 'Punycode 解码失败',
  [ERROR_CODES.PUNYCODE_ENCODE_ERROR]: 'Punycode 编码失败',
  [ERROR_CODES.INVALID_IDNA]: 'IDNA 处理失败',
  [ERROR_CODES.CONSECUTIVE_DOTS]: '存在连续点号',
  [ERROR_CODES.LEADING_DOT]: '域名以点号开头',
  [ERROR_CODES.TRAILING_DOT]: '域名以点号结尾',
  [ERROR_CODES.HYPHEN_AT_EDGE]: '标签以连字符开头或结尾',
  [ERROR_CODES.ALL_HYPHENS]: '标签全部为连字符',
  [ERROR_CODES.INVALID_ACE_PREFIX]: 'ACE 前缀位置错误',
}

function getErrorMessage(code, customDetails = null) {
  const baseMessage = ERROR_MESSAGES[code] || '未知错误'
  return customDetails ? `${baseMessage}：${customDetails}` : baseMessage
}

function createError(code, customMessage = null, details = {}) {
  return {
    errorCode: code,
    errorMessage: customMessage || getErrorMessage(code),
    details,
  }
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
}
