const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  SELECTION_OUT_OF_RANGE: 'SELECTION_OUT_OF_RANGE',
  WORKER_UNAVAILABLE_FALLBACK: 'WORKER_UNAVAILABLE_FALLBACK',
  INPUT_TOO_LARGE: 'INPUT_TOO_LARGE',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: '输入不能为空',
  [ERROR_CODES.SELECTION_OUT_OF_RANGE]: '选中范围超出文本边界',
  [ERROR_CODES.WORKER_UNAVAILABLE_FALLBACK]: 'Web Worker 不可用，已回退到主线程处理',
  [ERROR_CODES.INPUT_TOO_LARGE]: '输入过大，可能导致性能问题',
}

const MAX_SAFE_INPUT_SIZE = 10 * 1024 * 1024

function createError(code, details = null) {
  return {
    code,
    message: ERROR_MESSAGES[code] || '未知错误',
    details,
  }
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  MAX_SAFE_INPUT_SIZE,
  createError,
}
