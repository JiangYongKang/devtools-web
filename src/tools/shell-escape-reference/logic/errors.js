const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  EMPTY_INPUT: 'EMPTY_INPUT',
  INPUT_TOO_LARGE: 'INPUT_TOO_LARGE',
  UNBALANCED_QUOTES: 'UNBALANCED_QUOTES',
  AMBIGUOUS_ESCAPE: 'AMBIGUOUS_ESCAPE',
  UNSUPPORTED_SHELL_FEATURE: 'UNSUPPORTED_SHELL_FEATURE',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: '输入值为 null 或 undefined',
  [ERROR_CODES.EMPTY_INPUT]: '输入为空字符串或仅包含空白字符',
  [ERROR_CODES.INPUT_TOO_LARGE]: '输入文本过长，超出处理限制',
  [ERROR_CODES.UNBALANCED_QUOTES]: '引号不匹配，请检查引号是否成对闭合',
  [ERROR_CODES.AMBIGUOUS_ESCAPE]: '存在无法无二义解析的转义序列',
  [ERROR_CODES.UNSUPPORTED_SHELL_FEATURE]: '检测到当前 shell 配置不支持的高级特性',
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

function isShellProfileValid(profile) {
  const validProfiles = [
    'POSIX_BASH_LITE',
    'ZSH_EXTENDED',
    'STRICT_POSIX',
  ]
  return validProfiles.includes(profile)
}

function isQuoteStrategyValid(strategy) {
  const validStrategies = ['double', 'single', 'bare']
  return validStrategies.includes(strategy)
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  isShellProfileValid,
  isQuoteStrategyValid,
}
