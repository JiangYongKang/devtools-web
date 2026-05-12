import { ERROR_CODES, CLOSE_CODE_DESCRIPTIONS, CLOSE_CODE_FALLBACK } from './constants.js'

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_URL]: 'URL 不能为空 (NULL_URL)',
  [ERROR_CODES.INVALID_URL]: 'URL 格式无效 (INVALID_URL)',
  [ERROR_CODES.INVALID_PROTOCOL]: 'URL 协议必须是 ws: 或 wss: (INVALID_PROTOCOL)',
  [ERROR_CODES.NOT_CONNECTED]: '连接未建立 (NOT_CONNECTED)',
  [ERROR_CODES.CONNECTING_STATE]: '连接正在建立中，请等待 (CONNECTING_STATE)',
  [ERROR_CODES.CLOSING_STATE]: '连接正在关闭中，请等待 (CLOSING_STATE)',
  [ERROR_CODES.SEND_FAILED]: '消息发送失败 (SEND_FAILED)',
  [ERROR_CODES.CONNECT_FAILED]: '连接失败 (CONNECT_FAILED)',
  [ERROR_CODES.HANDSHAKE_FAILED]: 'WebSocket 握手失败 (HANDSHAKE_FAILED)',
  [ERROR_CODES.CONNECTION_TIMEOUT]: '连接超时 (CONNECTION_TIMEOUT)',
  [ERROR_CODES.MAX_RETRIES_EXCEEDED]: '超过最大重试次数 (MAX_RETRIES_EXCEEDED)',
  [ERROR_CODES.MIXED_CONTENT_BLOCKED]: '混合内容被浏览器阻止：https 页面无法连接 ws: URL (MIXED_CONTENT_BLOCKED)',
  [ERROR_CODES.INVALID_PARAMETER]: '参数无效 (INVALID_PARAMETER)',
  [ERROR_CODES.EMPTY_MESSAGE]: '消息内容为空 (EMPTY_MESSAGE)',
  [ERROR_CODES.ENCODE_FAILED]: '编码失败 (ENCODE_FAILED)',
  [ERROR_CODES.DECODE_FAILED]: '解码失败 (DECODE_FAILED)',
}

const ERROR_SUGGESTIONS = {
  [ERROR_CODES.NULL_URL]: '请输入有效的 WebSocket URL。',
  [ERROR_CODES.INVALID_URL]: '请检查 URL 格式，确保包含主机名和路径。',
  [ERROR_CODES.INVALID_PROTOCOL]: '请将 URL 协议修改为 ws: 或 wss:。如果在 https 页面，请使用 wss:。',
  [ERROR_CODES.NOT_CONNECTED]: '请先点击"连接"按钮建立连接。',
  [ERROR_CODES.CONNECTING_STATE]: '请等待连接完成后再尝试。',
  [ERROR_CODES.CLOSING_STATE]: '请等待连接关闭完成后再尝试。',
  [ERROR_CODES.SEND_FAILED]: '检查网络连接或服务器状态，稍后重试。',
  [ERROR_CODES.CONNECT_FAILED]: '检查 URL 是否正确、服务器是否在线、防火墙是否阻止了连接。',
  [ERROR_CODES.HANDSHAKE_FAILED]: '这通常是浏览器无法建立安全连接或服务器返回非 WebSocket 响应。检查 URL 协议（wss 或 ws）。',
  [ERROR_CODES.CONNECTION_TIMEOUT]: '增加超时时间或检查网络连接。',
  [ERROR_CODES.MAX_RETRIES_EXCEEDED]: '连接无法恢复。检查服务器状态或增加重试次数。',
  [ERROR_CODES.MIXED_CONTENT_BLOCKED]: '这是浏览器的安全策略。请使用 wss: 协议或在 http: 页面上使用 ws:。',
  [ERROR_CODES.INVALID_PARAMETER]: '检查输入参数是否符合要求。',
  [ERROR_CODES.EMPTY_MESSAGE]: '请输入要发送的消息内容。',
  [ERROR_CODES.ENCODE_FAILED]: '检查二进制数据是否有效。',
  [ERROR_CODES.DECODE_FAILED]: '检查二进制数据编码是否正确。',
}

function getErrorMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES[ERROR_CODES.INVALID_PARAMETER]
}

function getErrorSuggestion(errorCode) {
  return ERROR_SUGGESTIONS[errorCode] || ERROR_SUGGESTIONS[ERROR_CODES.INVALID_PARAMETER]
}

function getCloseCodeDescription(code) {
  return CLOSE_CODE_DESCRIPTIONS[code] || CLOSE_CODE_FALLBACK
}

function isCloseCodeNormal(code) {
  return code === 1000 || code === 1001
}

function isCloseCodeError(code) {
  if (code >= 1002 && code <= 1015) {
    return true
  }
  if (code >= 4000) {
    return false
  }
  return false
}

function createError(errorCode, extraInfo = {}) {
  const { code, message, suggestion, ...safeExtra } = extraInfo
  return {
    code: errorCode,
    message: getErrorMessage(errorCode),
    suggestion: getErrorSuggestion(errorCode),
    ...safeExtra,
  }
}

export {
  ERROR_CODES,
  CLOSE_CODE_DESCRIPTIONS,
  CLOSE_CODE_FALLBACK,
  ERROR_MESSAGES,
  ERROR_SUGGESTIONS,
  getErrorMessage,
  getErrorSuggestion,
  getCloseCodeDescription,
  isCloseCodeNormal,
  isCloseCodeError,
  createError,
}
