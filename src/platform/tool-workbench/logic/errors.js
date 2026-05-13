const ERROR_CODES = {
  INVALID_TOPOLOGY: 'INVALID_TOPOLOGY',
  INVALID_OUTPUT_FORMAT: 'INVALID_OUTPUT_FORMAT',
  OUTPUT_TOO_LARGE: 'OUTPUT_TOO_LARGE',
  INVALID_DRAG_POSITION: 'INVALID_DRAG_POSITION',
  INVALID_EXAMPLE_SIZE: 'INVALID_EXAMPLE_SIZE',
  TREE_STATE_CORRUPTED: 'TREE_STATE_CORRUPTED',
  SESSION_STORAGE_READ_ERROR: 'SESSION_STORAGE_READ_ERROR',
  INVALID_DISPLAY_STATE: 'INVALID_DISPLAY_STATE',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_TOPOLOGY]: 'Invalid layout topology. Must be either "side-by-side" or "stacked".',
  [ERROR_CODES.INVALID_OUTPUT_FORMAT]: 'Invalid output format. Must be either "plain-text" or "json".',
  [ERROR_CODES.OUTPUT_TOO_LARGE]: 'Output exceeds maximum display size. Please use download option.',
  [ERROR_CODES.INVALID_DRAG_POSITION]: 'Invalid drag position. Cannot be negative or exceed container bounds.',
  [ERROR_CODES.INVALID_EXAMPLE_SIZE]: 'Invalid example size. Must be "small", "medium", or "large".',
  [ERROR_CODES.TREE_STATE_CORRUPTED]: 'Tree collapse state is corrupted.',
  [ERROR_CODES.SESSION_STORAGE_READ_ERROR]: 'Failed to read from sessionStorage.',
  [ERROR_CODES.INVALID_DISPLAY_STATE]: 'Invalid display state.',
}

function createError(errorCode, customMessage) {
  const message = customMessage || ERROR_MESSAGES[errorCode] || 'Unknown error'
  const error = new Error(message)
  error.errorCode = errorCode
  return error
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  createError,
}
