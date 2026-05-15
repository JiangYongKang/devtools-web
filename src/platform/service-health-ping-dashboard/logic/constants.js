
// 错误分类类型
export const ERROR_TYPES = {
  HTTP: 'http',
  NETWORK: 'network',
  CORS: 'cors',
  TIMEOUT: 'timeout',
  ABORT: 'abort',
  SECURITY: 'security',
  UNKNOWN: 'unknown',
}

// 熔断状态
export const CIRCUIT_STATES = {
  CLOSED: 'closed',
  OPEN: 'open',
  HALF_OPEN: 'half_open',
}

// 默认探测配置
export const DEFAULT_PROBE_OPTIONS = {
  method: 'GET',
  expectedStatus: [200, 201, 204],
  maxLatencyMs: 5000,
  timeoutMs: 10000,
  insecureDevOk: false,
}

// 默认熔断配置
export const DEFAULT_CIRCUIT_OPTIONS = {
  failureThreshold: 5,
  successThreshold: 3,
  resetTimeoutMs: 30000,
  halfOpenMaxProbes: 1,
}

// 并发限制
export const MAX_CONCURRENT_PROBES = 10

// Sparkline 样本数量
export const SPARKLINE_SAMPLE_SIZE = 20

// HTTP 方法
export const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']

// 允许的 URL 协议
export const ALLOWED_PROTOCOLS = ['http:', 'https:']

// 禁止的协议
export const FORBIDDEN_PROTOCOLS = ['file:', 'ftp:', 'ssh:', 'javascript:', 'data:']

// 版本
export const VERSION = '1.0.0'
