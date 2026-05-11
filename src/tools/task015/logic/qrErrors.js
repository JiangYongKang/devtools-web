const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  CONTENT_TOO_SHORT: 'CONTENT_TOO_SHORT',
  CONTENT_TOO_LONG: 'CONTENT_TOO_LONG',
  INVALID_MARGIN: 'INVALID_MARGIN',
  INVALID_MODULE_SIZE: 'INVALID_MODULE_SIZE',
  INVALID_NOMINAL_SIZE: 'INVALID_NOMINAL_SIZE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  OPTION_CONFLICT: 'OPTION_CONFLICT',
  OUTPUT_TOO_LARGE: 'OUTPUT_TOO_LARGE',
  ENCODE_FAILED: 'ENCODE_FAILED',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: '内容不能为空',
  [ERROR_CODES.CONTENT_TOO_SHORT]: '内容太短',
  [ERROR_CODES.CONTENT_TOO_LONG]: '内容太长，无法在指定参数下编码',
  [ERROR_CODES.INVALID_MARGIN]: '边距值无效，应为 0-20 之间的整数',
  [ERROR_CODES.INVALID_MODULE_SIZE]: '模块大小无效，应为 1-50 之间的整数',
  [ERROR_CODES.INVALID_NOMINAL_SIZE]: '标称尺寸无效，应为 10-500 之间的数值（毫米）',
  [ERROR_CODES.INVALID_FORMAT]: '输出格式无效，支持 PNG、SVG、JPEG',
  [ERROR_CODES.OPTION_CONFLICT]: '参数冲突：moduleSize 和 nominalSizeMm 只能指定其中一个',
  [ERROR_CODES.OUTPUT_TOO_LARGE]: '输出图像尺寸过大（最大 4096 x 4096 像素）',
  [ERROR_CODES.ENCODE_FAILED]: '二维码编码失败',
  [ERROR_CODES.INVALID_PARAMETER]: '参数无效',
}

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.INVALID_PARAMETER]
}

function createQRError(code, detail = null) {
  const message = detail ? `${getErrorMessage(code)}：${detail}` : getErrorMessage(code)
  const error = new Error(message)
  error.code = code
  return error
}

export { ERROR_CODES, ERROR_MESSAGES, getErrorMessage, createQRError }
