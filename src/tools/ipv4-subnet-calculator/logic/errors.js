const ERROR_CODES = {
  INVALID_IPV4: 'INVALID_IPV4',
  INVALID_MASK: 'INVALID_MASK',
  NON_CONTIGUOUS_MASK: 'NON_CONTIGUOUS_MASK',
  PREFIX_OUT_OF_RANGE: 'PREFIX_OUT_OF_RANGE',
  CONFLICTING_INPUT: 'CONFLICTING_INPUT',
  NULL_INPUT: 'NULL_INPUT',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_IPV4]: 'IPv4地址格式无效',
  [ERROR_CODES.INVALID_MASK]: '子网掩码格式无效',
  [ERROR_CODES.NON_CONTIGUOUS_MASK]: '子网掩码主机位非连续',
  [ERROR_CODES.PREFIX_OUT_OF_RANGE]: '前缀长度超出范围（应在1-32之间）',
  [ERROR_CODES.CONFLICTING_INPUT]: '掩码与前缀长度冲突',
  [ERROR_CODES.NULL_INPUT]: '缺少必要输入',
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
