const ERROR_CODES = {
  EMPTY_INPUT: 'EMPTY_INPUT',
  NO_VALID_BLOCKS: 'NO_VALID_BLOCKS',
  INVALID_BASE64: 'INVALID_BASE64',
  MALFORMED_ASN1: 'MALFORMED_ASN1',
  NOT_A_CERTIFICATE: 'NOT_A_CERTIFICATE',
  CERTIFICATE_PARSE_FAILED: 'CERTIFICATE_PARSE_FAILED',
  INVALID_PEM_FORMAT: 'INVALID_PEM_FORMAT',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.EMPTY_INPUT]: '请输入 PEM 格式的证书内容',
  [ERROR_CODES.NO_VALID_BLOCKS]: '未检测到有效的 PEM 证书块，请检查输入格式',
  [ERROR_CODES.INVALID_BASE64]: 'Base64 解码失败，证书内容可能已损坏',
  [ERROR_CODES.MALFORMED_ASN1]: 'ASN.1 结构解析失败，证书格式异常',
  [ERROR_CODES.NOT_A_CERTIFICATE]: '检测到的 PEM 块不是 X.509 证书',
  [ERROR_CODES.CERTIFICATE_PARSE_FAILED]: '证书解析失败，内容可能已损坏',
  [ERROR_CODES.INVALID_PEM_FORMAT]: 'PEM 格式不完整或不正确',
}

const MAX_SAFE_INPUT_LENGTH = 500 * 1024

function createError(code, details = null) {
  return {
    code,
    message: ERROR_MESSAGES[code] || '未知错误',
    details,
  }
}

function getErrorMessage(code, language = 'zh') {
  return ERROR_MESSAGES[code] || '未知错误'
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  MAX_SAFE_INPUT_LENGTH,
  createError,
  getErrorMessage,
}
