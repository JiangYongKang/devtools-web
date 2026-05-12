const ERROR_CODES = {
  EMPTY_RULE_SET: 'EMPTY_RULE_SET',
  ZERO_LENGTH: 'ZERO_LENGTH',
  MIN_LENGTH_GREATER_THAN_MAX: 'MIN_LENGTH_GREATER_THAN_MAX',
  LENGTH_OUT_OF_RANGE: 'LENGTH_OUT_OF_RANGE',
  NO_CHARACTER_CLASSES_SELECTED: 'NO_CHARACTER_CLASSES_SELECTED',
  INSUFFICIENT_LENGTH_FOR_REQUIRED_CLASSES: 'INSUFFICIENT_LENGTH_FOR_REQUIRED_CLASSES',
  ALL_CHARACTERS_EXCLUDED: 'ALL_CHARACTERS_EXCLUDED',
  BATCH_COUNT_OUT_OF_RANGE: 'BATCH_COUNT_OUT_OF_RANGE',
  TOTAL_OUTPUT_TOO_LARGE: 'TOTAL_OUTPUT_TOO_LARGE',
  INVALID_CUSTOM_EXCLUSIONS: 'INVALID_CUSTOM_EXCLUSIONS',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.EMPTY_RULE_SET]: '规则集为空，请至少选择一个字符类',
  [ERROR_CODES.ZERO_LENGTH]: '密码长度不能为零，请设置有效的长度范围',
  [ERROR_CODES.MIN_LENGTH_GREATER_THAN_MAX]: '最小长度不能大于最大长度，请调整长度范围',
  [ERROR_CODES.LENGTH_OUT_OF_RANGE]: '长度范围超出页面限制，请检查长度设置',
  [ERROR_CODES.NO_CHARACTER_CLASSES_SELECTED]: '未选择任何字符类，请至少选择一个必选或可选字符类',
  [ERROR_CODES.INSUFFICIENT_LENGTH_FOR_REQUIRED_CLASSES]: '最小长度不足以容纳所有必选字符类，请增加最小长度或减少必选字符类数量',
  [ERROR_CODES.ALL_CHARACTERS_EXCLUDED]: '所有可选字符都被排除，请放宽排除条件',
  [ERROR_CODES.BATCH_COUNT_OUT_OF_RANGE]: '批量生成数量超出页面限制，请调整数量',
  [ERROR_CODES.TOTAL_OUTPUT_TOO_LARGE]: '总输出长度超出页面限制，请减少批量数量或缩短密码长度',
  [ERROR_CODES.INVALID_CUSTOM_EXCLUSIONS]: '自定义排除子串格式无效，请检查输入',
}

function getErrorMessage(code, suggestions = []) {
  const baseMessage = ERROR_MESSAGES[code] || '未知错误'
  if (suggestions.length === 0) return baseMessage
  return `${baseMessage}。建议：${suggestions.join('；')}`
}

function createError(code, customMessage = null, suggestions = []) {
  return {
    errorCode: code,
    errorMessage: customMessage || getErrorMessage(code, suggestions),
    suggestions,
  }
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
}
