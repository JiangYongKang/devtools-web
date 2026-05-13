const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  EMPTY_VALUE: 'EMPTY_VALUE',
  INVALID_NUMBER: 'INVALID_NUMBER',
  INVALID_UNIT: 'INVALID_UNIT',
  UNRECOGNIZED_INPUT: 'UNRECOGNIZED_INPUT',
  NEGATIVE_NOT_ALLOWED: 'NEGATIVE_NOT_ALLOWED',
  NOT_FINITE: 'NOT_FINITE',
  OVERFLOW: 'OVERFLOW',
  UNDERFLOW: 'UNDERFLOW',
  EXPONENT_TOO_LARGE: 'EXPONENT_TOO_LARGE',
  BATCH_TOO_LARGE: 'BATCH_TOO_LARGE',
  INVALID_BASE: 'INVALID_BASE',
  INVALID_ROUNDING_MODE: 'INVALID_ROUNDING_MODE',
  INVALID_DECIMALS: 'INVALID_DECIMALS',
  INCOMPATIBLE_CATEGORIES: 'INCOMPATIBLE_CATEGORIES',
  CLIPBOARD_READ_FAILED: 'CLIPBOARD_READ_FAILED',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: '输入值为 null 或 undefined',
  [ERROR_CODES.EMPTY_VALUE]: '输入值为空',
  [ERROR_CODES.INVALID_NUMBER]: '数值格式无效',
  [ERROR_CODES.INVALID_UNIT]: '单位无效或不被支持',
  [ERROR_CODES.UNRECOGNIZED_INPUT]: '无法识别输入格式',
  [ERROR_CODES.NEGATIVE_NOT_ALLOWED]: '负数未被允许',
  [ERROR_CODES.NOT_FINITE]: '数值不是有限数（无穷或 NaN）',
  [ERROR_CODES.OVERFLOW]: '数值超出可表示范围（上溢）',
  [ERROR_CODES.UNDERFLOW]: '数值过小超出表示精度（下溢）',
  [ERROR_CODES.EXPONENT_TOO_LARGE]: '科学计数法指数过大',
  [ERROR_CODES.BATCH_TOO_LARGE]: '批量转换条目数超出限制',
  [ERROR_CODES.INVALID_BASE]: '基数无效，应为 1000 (SI) 或 1024 (IEC)',
  [ERROR_CODES.INVALID_ROUNDING_MODE]: '舍入模式无效',
  [ERROR_CODES.INVALID_DECIMALS]: '小数位数配置无效',
  [ERROR_CODES.INCOMPATIBLE_CATEGORIES]: '源单位与目标单位类别不兼容',
  [ERROR_CODES.CLIPBOARD_READ_FAILED]: '剪贴板读取失败',
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

function isBaseValid(base) {
  return base === 1000 || base === 1024
}

function isRoundingModeValid(mode) {
  const validModes = ['round', 'floor', 'ceil', 'bankers']
  return validModes.includes(mode)
}

function isDecimalsValid(decimals) {
  if (decimals == null) return false
  const num = Number(decimals)
  if (!Number.isInteger(num)) return false
  return num >= 0 && num <= 20
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  isBaseValid,
  isRoundingModeValid,
  isDecimalsValid,
}
