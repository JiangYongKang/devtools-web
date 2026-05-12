const SOCKET_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}

const SOCKET_STATE_LABELS = {
  [SOCKET_STATES.CONNECTING]: 'CONNECTING',
  [SOCKET_STATES.OPEN]: 'OPEN',
  [SOCKET_STATES.CLOSING]: 'CLOSING',
  [SOCKET_STATES.CLOSED]: 'CLOSED',
}

const SOCKET_STATE_CHINESE = {
  [SOCKET_STATES.CONNECTING]: '连接中',
  [SOCKET_STATES.OPEN]: '已连接',
  [SOCKET_STATES.CLOSING]: '关闭中',
  [SOCKET_STATES.CLOSED]: '已断开',
}

const MESSAGE_DIRECTION = {
  SENT: 'sent',
  RECEIVED: 'received',
  SYSTEM: 'system',
}

const MESSAGE_TYPE = {
  TEXT: 'text',
  BINARY: 'binary',
  PING: 'ping',
  PONG: 'pong',
}

const ERROR_CODES = {
  NULL_URL: 'NULL_URL',
  INVALID_URL: 'INVALID_URL',
  INVALID_PROTOCOL: 'INVALID_PROTOCOL',
  NOT_CONNECTED: 'NOT_CONNECTED',
  CONNECTING_STATE: 'CONNECTING_STATE',
  CLOSING_STATE: 'CLOSING_STATE',
  SEND_FAILED: 'SEND_FAILED',
  CONNECT_FAILED: 'CONNECT_FAILED',
  HANDSHAKE_FAILED: 'HANDSHAKE_FAILED',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  MAX_RETRIES_EXCEEDED: 'MAX_RETRIES_EXCEEDED',
  MIXED_CONTENT_BLOCKED: 'MIXED_CONTENT_BLOCKED',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  EMPTY_MESSAGE: 'EMPTY_MESSAGE',
  ENCODE_FAILED: 'ENCODE_FAILED',
  DECODE_FAILED: 'DECODE_FAILED',
}

const DEFAULT_PARAMS = {
  url: 'wss://echo.websocket.org',
  protocols: [],
  binaryType: 'blob',
  autoReconnect: true,
  maxRetries: 5,
  reconnectDelay: 1000,
  reconnectDelayMax: 30000,
  connectionTimeout: 10000,
  heartbeatEnabled: false,
  heartbeatInterval: 30000,
  heartbeatMessage: 'ping',
  heartbeatType: 'text',
}

const CLOSE_CODE_DESCRIPTIONS = {
  1000: {
    name: 'CLOSE_NORMAL',
    meaning: '正常关闭，连接已完成其目的',
    suggestion: '无操作需求，这是预期的正常关闭。',
  },
  1001: {
    name: 'CLOSE_GOING_AWAY',
    meaning: '终端离开（服务器停机、浏览器页面关闭）',
    suggestion: '检查服务器状态或页面导航情况。',
  },
  1002: {
    name: 'CLOSE_PROTOCOL_ERROR',
    meaning: '协议错误',
    suggestion: '检查 WebSocket 协议实现是否正确。',
  },
  1003: {
    name: 'CLOSE_UNSUPPORTED',
    meaning: '收到不支持的数据类型',
    suggestion: '验证 binaryType 设置和发送的数据格式。',
  },
  1005: {
    name: 'CLOSE_NO_STATUS',
    meaning: '未收到状态码（预留，不应由端点发送）',
    suggestion: '这是浏览器内部使用的状态码，通常表示连接异常中断。',
  },
  1006: {
    name: 'CLOSE_ABNORMAL',
    meaning: '异常关闭（未发送/接收 close 帧）',
    suggestion: '可能是网络中断、防火墙拦截或混合内容被浏览器阻止。检查网络连接和 URL 协议（wss 或 ws）。',
  },
  1007: {
    name: 'CLOSE_INVALID_PAYLOAD',
    meaning: '消息数据不一致（非 UTF-8 文本）',
    suggestion: '确保文本消息使用有效的 UTF-8 编码。',
  },
  1008: {
    name: 'CLOSE_POLICY_VIOLATION',
    meaning: '违反策略',
    suggestion: '检查服务器安全策略和消息内容。',
  },
  1009: {
    name: 'CLOSE_TOO_LARGE',
    meaning: '消息过大',
    suggestion: '减少消息大小或检查服务器最大消息限制。',
  },
  1010: {
    name: 'CLOSE_MANDATORY_EXT',
    meaning: '服务器未协商必需的扩展',
    suggestion: '检查请求的扩展是否被服务器支持。',
  },
  1011: {
    name: 'CLOSE_INTERNAL_ERROR',
    meaning: '服务器内部错误',
    suggestion: '联系服务器管理员或检查服务器日志。',
  },
  1012: {
    name: 'CLOSE_SERVICE_RESTART',
    meaning: '服务重启',
    suggestion: '等待服务恢复后重试。',
  },
  1013: {
    name: 'CLOSE_TRY_AGAIN_LATER',
    meaning: '临时过载，请稍后重试',
    suggestion: '等待一段时间后重试连接。',
  },
  1014: {
    name: 'CLOSE_BAD_GATEWAY',
    meaning: '网关错误',
    suggestion: '检查网关服务器状态。',
  },
  1015: {
    name: 'CLOSE_TLS_HANDSHAKE',
    meaning: 'TLS 握手失败（如证书验证失败）',
    suggestion: '检查 wss URL 的 SSL 证书是否有效。',
  },
}

const CLOSE_CODE_FALLBACK = {
  name: 'UNKNOWN_CODE',
  meaning: '未知关闭码',
  suggestion: '检查服务器日志或联系服务提供商。',
}

const ECHO_SERVER_EXAMPLES = [
  {
    label: 'echo.websocket.org',
    url: 'wss://echo.websocket.org',
    description: 'WebSocket 测试服务器（可能需要翻墙）',
  },
  {
    label: 'ws.vi-server.org',
    url: 'wss://ws.vi-server.org/mirror',
    description: '另一个公开的 WebSocket 回声服务',
  },
  {
    label: 'demos.kaazing.com',
    url: 'wss://demos.kaazing.com/echo',
    description: 'Kaazing 提供的 WebSocket 测试服务',
  },
]

const MAX_MESSAGE_SIZE = 1024 * 1024 * 10

const LARGE_MESSAGE_CHUNK_SIZE = 8192

export {
  SOCKET_STATES,
  SOCKET_STATE_LABELS,
  SOCKET_STATE_CHINESE,
  MESSAGE_DIRECTION,
  MESSAGE_TYPE,
  ERROR_CODES,
  DEFAULT_PARAMS,
  CLOSE_CODE_DESCRIPTIONS,
  CLOSE_CODE_FALLBACK,
  ECHO_SERVER_EXAMPLES,
  MAX_MESSAGE_SIZE,
  LARGE_MESSAGE_CHUNK_SIZE,
}
