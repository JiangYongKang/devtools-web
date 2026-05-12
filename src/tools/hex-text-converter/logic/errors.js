const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  EMPTY_VALUE: 'EMPTY_VALUE',
  INVALID_HEX_CHAR: 'INVALID_HEX_CHAR',
  ODD_LENGTH: 'ODD_LENGTH',
  INVALID_UTF8: 'INVALID_UTF8',
  INPUT_TOO_LARGE: 'INPUT_TOO_LARGE',
  INVALID_SEPARATOR: 'INVALID_SEPARATOR',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: '输入值为 null 或 undefined',
  [ERROR_CODES.EMPTY_VALUE]: '输入值为空',
  [ERROR_CODES.INVALID_HEX_CHAR]: '输入包含非法十六进制字符',
  [ERROR_CODES.ODD_LENGTH]: '十六进制串长度为奇数，缺少半个字节',
  [ERROR_CODES.INVALID_UTF8]: '解码后字节序列不是有效的 UTF-8',
  [ERROR_CODES.INPUT_TOO_LARGE]: '输入体量超出安全处理上限',
  [ERROR_CODES.INVALID_SEPARATOR]: '分隔符格式无效',
}

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || '未知错误'
}

function createError(code, customMessage = null, context = null) {
  return {
    errorCode: code,
    errorMessage: customMessage || getErrorMessage(code),
    context,
  }
}

function isHexChar(char) {
  const code = char.toLowerCase().charCodeAt(0)
  return (code >= 48 && code <= 57) || (code >= 97 && code <= 102)
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  isHexChar,
}
