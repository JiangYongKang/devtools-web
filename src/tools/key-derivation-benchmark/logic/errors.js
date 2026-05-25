const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  EMPTY_PASSWORD: 'EMPTY_PASSWORD',
  INVALID_SALT: 'INVALID_SALT',
  INVALID_ITERATIONS: 'INVALID_ITERATIONS',
  INVALID_KEY_LENGTH: 'INVALID_KEY_LENGTH',
  INVALID_SCRYPT_PARAMS: 'INVALID_SCRYPT_PARAMS',
  UNSUPPORTED_ALGORITHM: 'UNSUPPORTED_ALGORITHM',
  DERIVATION_FAILED: 'DERIVATION_FAILED',
  INVALID_HEX: 'INVALID_HEX',
  INVALID_BASE64: 'INVALID_BASE64',
  WEAK_PARAMETERS: 'WEAK_PARAMETERS',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: '输入值为 null 或 undefined',
  [ERROR_CODES.EMPTY_PASSWORD]: '密码不能为空',
  [ERROR_CODES.INVALID_SALT]: '盐值无效，应为非空字符串或有效的十六进制',
  [ERROR_CODES.INVALID_ITERATIONS]: '迭代次数无效，应为正整数',
  [ERROR_CODES.INVALID_KEY_LENGTH]: '密钥长度无效，应为正整数（字节数）',
  [ERROR_CODES.INVALID_SCRYPT_PARAMS]: 'scrypt 参数无效',
  [ERROR_CODES.UNSUPPORTED_ALGORITHM]: '不支持的算法',
  [ERROR_CODES.DERIVATION_FAILED]: '密钥派生失败',
  [ERROR_CODES.INVALID_HEX]: '无效的十六进制字符串',
  [ERROR_CODES.INVALID_BASE64]: '无效的 Base64 字符串',
  [ERROR_CODES.WEAK_PARAMETERS]: '参数强度不足，存在安全风险',
}

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || '未知错误'
}

function createError(code, customMessage = null) {
  return {
    errorCode: code,
    errorMessage: customMessage || getErrorMessage(code),
  }
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
}
