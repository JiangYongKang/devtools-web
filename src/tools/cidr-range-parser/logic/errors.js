const ERROR_CODES = {
  INVALID_CIDR: 'INVALID_CIDR',
  RANGE_NOT_ORDERED: 'RANGE_NOT_ORDERED',
  NO_SINGLE_CIDR_AGGREGATE: 'NO_SINGLE_CIDR_AGGREGATE',
  ENUMERATION_LIMIT_EXCEEDED: 'ENUMERATION_LIMIT_EXCEEDED',
  INVALID_IP: 'INVALID_IP',
  INVALID_PREFIX: 'INVALID_PREFIX',
  EMPTY_INPUT: 'EMPTY_INPUT',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_CIDR]: '无效的 CIDR 记法，格式应为 a.b.c.d/n',
  [ERROR_CODES.RANGE_NOT_ORDERED]: '起始 IP 大于结束 IP，请检查输入顺序',
  [ERROR_CODES.NO_SINGLE_CIDR_AGGREGATE]: '无法用单一 CIDR 覆盖该范围，建议使用多个 CIDR',
  [ERROR_CODES.ENUMERATION_LIMIT_EXCEEDED]: '地址数量超过枚举限制，已启用智能展示策略',
  [ERROR_CODES.INVALID_IP]: '无效的 IP 地址格式',
  [ERROR_CODES.INVALID_PREFIX]: '前缀长度应在 0~32 之间',
  [ERROR_CODES.EMPTY_INPUT]: '输入不能为空',
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

function isValidPrefix(prefix) {
  const num = Number(prefix)
  return Number.isInteger(num) && num >= 0 && num <= 32
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  isValidPrefix,
}
