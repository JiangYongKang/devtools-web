const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  EMPTY_INPUT: 'EMPTY_INPUT',
  INVALID_FIELD_COUNT: 'INVALID_FIELD_COUNT',
  INVALID_FIELD: 'INVALID_FIELD',
  INVALID_VALUE: 'INVALID_VALUE',
  INVALID_TIMEZONE: 'INVALID_TIMEZONE',
  UNSUPPORTED_LANGUAGE: 'UNSUPPORTED_LANGUAGE',
  UNSUPPORTED_COMBINATION: 'UNSUPPORTED_COMBINATION',
}

const ERROR_MESSAGES_ZH = {
  [ERROR_CODES.NULL_INPUT]: '表达式不能为空',
  [ERROR_CODES.EMPTY_INPUT]: '表达式不能为空',
  [ERROR_CODES.INVALID_FIELD_COUNT]: '字段数量无效。五域表达式需要 5 个字段，六域表达式需要 6 个字段',
  [ERROR_CODES.INVALID_FIELD]: '字段格式无效',
  [ERROR_CODES.INVALID_VALUE]: '字段值超出有效范围',
  [ERROR_CODES.INVALID_TIMEZONE]: '无效的时区',
  [ERROR_CODES.UNSUPPORTED_LANGUAGE]: '不支持的语言',
  [ERROR_CODES.UNSUPPORTED_COMBINATION]: '不支持的字段组合',
}

const ERROR_MESSAGES_EN = {
  [ERROR_CODES.NULL_INPUT]: 'Expression cannot be null',
  [ERROR_CODES.EMPTY_INPUT]: 'Expression cannot be empty',
  [ERROR_CODES.INVALID_FIELD_COUNT]: 'Invalid field count. 5-field expression needs 5 fields, 6-field expression needs 6 fields',
  [ERROR_CODES.INVALID_FIELD]: 'Invalid field format',
  [ERROR_CODES.INVALID_VALUE]: 'Field value out of valid range',
  [ERROR_CODES.INVALID_TIMEZONE]: 'Invalid timezone',
  [ERROR_CODES.UNSUPPORTED_LANGUAGE]: 'Unsupported language',
  [ERROR_CODES.UNSUPPORTED_COMBINATION]: 'Unsupported field combination',
}

const SUPPORTED_LANGUAGES = ['zh', 'en']

function getErrorMessage(code, language = 'zh', fieldName = null) {
  const messages = language === 'en' ? ERROR_MESSAGES_EN : ERROR_MESSAGES_ZH
  let message = messages[code] || messages[ERROR_CODES.INVALID_FIELD]
  if (fieldName) {
    message = `${fieldName}：${message}`
  }
  return message
}

function createError(code, fieldName = null, details = null) {
  return {
    code,
    fieldName,
    details,
  }
}

export {
  ERROR_CODES,
  ERROR_MESSAGES_ZH,
  ERROR_MESSAGES_EN,
  SUPPORTED_LANGUAGES,
  getErrorMessage,
  createError,
}
