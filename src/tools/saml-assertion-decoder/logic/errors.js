const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  EMPTY_INPUT: 'EMPTY_INPUT',
  INVALID_BASE64: 'INVALID_BASE64',
  INVALID_DEFLATE: 'INVALID_DEFLATE',
  INVALID_XML: 'INVALID_XML',
  XML_PARSE_ERROR: 'XML_PARSE_ERROR',
  NOT_SAML_RESPONSE: 'NOT_SAML_RESPONSE',
  MISSING_ASSERTION: 'MISSING_ASSERTION',
  MISSING_ISSUER: 'MISSING_ISSUER',
  MISSING_SUBJECT: 'MISSING_SUBJECT',
  MISSING_NAMEID: 'MISSING_NAMEID',
  MISSING_CONDITIONS: 'MISSING_CONDITIONS',
  MISSING_AUTHN_STATEMENT: 'MISSING_AUTHN_STATEMENT',
  INVALID_TIMESTAMP: 'INVALID_TIMESTAMP',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: '输入不能为空',
  [ERROR_CODES.EMPTY_INPUT]: '输入不能为空字符串',
  [ERROR_CODES.INVALID_BASE64]: '无效的 Base64 编码',
  [ERROR_CODES.INVALID_DEFLATE]: '无效的 DEFLATE 压缩数据',
  [ERROR_CODES.INVALID_XML]: '无效的 XML 格式',
  [ERROR_CODES.XML_PARSE_ERROR]: 'XML 解析错误',
  [ERROR_CODES.NOT_SAML_RESPONSE]: '不是有效的 SAML 响应或断言',
  [ERROR_CODES.MISSING_ASSERTION]: '未找到 Assertion 元素',
  [ERROR_CODES.MISSING_ISSUER]: '未找到 Issuer 元素',
  [ERROR_CODES.MISSING_SUBJECT]: '未找到 Subject 元素',
  [ERROR_CODES.MISSING_NAMEID]: '未找到 NameID 元素',
  [ERROR_CODES.MISSING_CONDITIONS]: '未找到 Conditions 元素',
  [ERROR_CODES.MISSING_AUTHN_STATEMENT]: '未找到 AuthnStatement 元素',
  [ERROR_CODES.INVALID_TIMESTAMP]: '无效的时间戳格式',
}

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || '未知错误'
}

function createError(code, customMessage) {
  return {
    errorCode: code,
    errorMessage: customMessage || getErrorMessage(code),
  }
}

function createErrorWithLocation(code, location, customMessage) {
  return {
    errorCode: code,
    errorMessage: customMessage || getErrorMessage(code),
    location,
  }
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  createErrorWithLocation,
}
