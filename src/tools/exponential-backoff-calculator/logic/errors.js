const ERROR_CODES = {
  NEGATIVE_PARAMETER: 'NEGATIVE_PARAMETER',
  ZERO_MULTIPLIER: 'ZERO_MULTIPLIER',
  INVALID_JITTER_RANGE: 'INVALID_JITTER_RANGE',
  OVERFLOW_DETECTED: 'OVERFLOW_DETECTED',
  NON_FINITE_VALUE: 'NON_FINITE_VALUE',
  MAX_STEPS_EXCEEDED: 'MAX_STEPS_EXCEEDED',
  MAX_INTERVAL_EXCEEDED: 'MAX_INTERVAL_EXCEEDED',
  INVALID_ALGORITHM: 'INVALID_ALGORITHM',
  INVALID_JITTER_TYPE: 'INVALID_JITTER_TYPE',
  NO_SOLUTION: 'NO_SOLUTION',
  INVALID_UNIT: 'INVALID_UNIT',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NEGATIVE_PARAMETER]: '参数不能为负数',
  [ERROR_CODES.ZERO_MULTIPLIER]: '乘数不能为零',
  [ERROR_CODES.INVALID_JITTER_RANGE]: '抖动范围无效（最小应小于等于最大）',
  [ERROR_CODES.OVERFLOW_DETECTED]: '数值溢出，计算结果超过可表示范围',
  [ERROR_CODES.NON_FINITE_VALUE]: '计算产生非有限值（Infinity 或 NaN）',
  [ERROR_CODES.MAX_STEPS_EXCEEDED]: '步数超过最大限制',
  [ERROR_CODES.MAX_INTERVAL_EXCEEDED]: '间隔超过最大限制',
  [ERROR_CODES.INVALID_ALGORITHM]: '无效的算法类型',
  [ERROR_CODES.INVALID_JITTER_TYPE]: '无效的抖动类型',
  [ERROR_CODES.NO_SOLUTION]: '无法找到满足条件的数学解',
  [ERROR_CODES.INVALID_UNIT]: '无效的单位类型',
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
