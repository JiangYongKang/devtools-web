import { ERROR_CODES, WARNING_CODES } from './constants.js'

function createError(errorCode, message = '', details = {}) {
  return {
    success: false,
    error: {
      errorCode,
      errorMessage: message || getErrorMessageForCode(errorCode),
      userMessage: getUserMessageForCode(errorCode),
      recoveryHint: getRecoveryHintForCode(errorCode),
      details,
    },
  }
}

function createSuccess(data, warnings = []) {
  return {
    success: true,
    data,
    warnings,
  }
}

function createWarning(warningCode, message = '', details = {}) {
  return {
    warningCode,
    warningMessage: message || getWarningMessageForCode(warningCode),
    userMessage: getUserWarningForCode(warningCode),
    details,
  }
}

function getErrorMessageForCode(errorCode) {
  const messages = {
    [ERROR_CODES.INVALID_INPUT]: '输入格式无效',
    [ERROR_CODES.INVALID_CURRENCY]: '无效的货币代码',
    [ERROR_CODES.AMBIGUOUS_DATE]: '日期格式歧义',
    [ERROR_CODES.INVALID_RATIO]: '无效的比率格式',
    [ERROR_CODES.SCIENTIFIC_NOTATION_REJECTED]: '不支持科学计数法',
    [ERROR_CODES.PARSING_FAILED]: '解析失败',
    [ERROR_CODES.OUT_OF_RANGE]: '数值超出有效范围',
  }
  return messages[errorCode] || '未知错误'
}

function getUserMessageForCode(errorCode) {
  const messages = {
    [ERROR_CODES.INVALID_INPUT]: '请检查输入格式是否正确',
    [ERROR_CODES.INVALID_CURRENCY]: '请使用有效的 ISO 4217 货币代码（如 USD、EUR）',
    [ERROR_CODES.AMBIGUOUS_DATE]: '请明确指定日期格式策略',
    [ERROR_CODES.INVALID_RATIO]: '请输入有效的百分比、千分比、小数或分数',
    [ERROR_CODES.SCIENTIFIC_NOTATION_REJECTED]: '请使用常规数字格式',
    [ERROR_CODES.PARSING_FAILED]: '无法解析输入内容',
    [ERROR_CODES.OUT_OF_RANGE]: '数值超出支持范围',
  }
  return messages[errorCode] || '遇到解析错误'
}

function getRecoveryHintForCode(errorCode) {
  const hints = {
    [ERROR_CODES.INVALID_CURRENCY]: '参考 ISO 4217 标准货币代码列表',
    [ERROR_CODES.AMBIGUOUS_DATE]: '选择「优先日期」或「优先月份」策略',
    [ERROR_CODES.SCIENTIFIC_NOTATION_REJECTED]: '例如：1,234.56 或 1234.56',
  }
  return hints[errorCode] || null
}

function getWarningMessageForCode(warningCode) {
  const messages = {
    [WARNING_CODES.CURRENCY_GUESSED]: '货币已根据符号推断',
    [WARNING_CODES.FRACTION_APPROXIMATED]: '分数已近似为小数',
    [WARNING_CODES.DATE_AMBIGUITY_RESOLVED]: '日期歧义已按选定策略解析',
    [WARNING_CODES.NEGATIVE_BRACKET_NOTATION]: '检测到括号负数表示法',
    [WARNING_CODES.THOUSAND_SEPARATOR_DETECTED]: '检测到千位分隔符',
    [WARNING_CODES.DST_BOUNDARY]: '日期位于夏令时切换边界',
  }
  return messages[warningCode] || '警告'
}

function getUserWarningForCode(warningCode) {
  const messages = {
    [WARNING_CODES.CURRENCY_GUESSED]: '根据符号自动识别货币',
    [WARNING_CODES.FRACTION_APPROXIMATED]: '有理数近似可能存在微小误差',
    [WARNING_CODES.DATE_AMBIGUITY_RESOLVED]: '如解析结果不符合预期，请调整策略',
    [WARNING_CODES.NEGATIVE_BRACKET_NOTATION]: '括号内数字表示负数',
    [WARNING_CODES.DST_BOUNDARY]: '夏令时切换可能影响时间计算',
  }
  return messages[warningCode] || '请注意解析结果'
}

export {
  createError,
  createSuccess,
  createWarning,
  getErrorMessageForCode,
  getUserMessageForCode,
  getRecoveryHintForCode,
  getWarningMessageForCode,
  getUserWarningForCode,
}
