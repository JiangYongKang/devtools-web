const VERSION = '1.0.0'

const DEFAULT_TIMEOUT_MS = 30000
const MAX_TIMEOUT_MS = 300000
const MAX_BODY_PREVIEW_LENGTH = 500 * 1024

const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]

const BODY_MODES = [
  'none',
  'raw',
  'json',
  'form-data',
  'x-www-form-urlencoded',
]

const ERROR_CODES = {
  INVALID_URL: 'INVALID_URL',
  INVALID_HEADER: 'INVALID_HEADER',
  INVALID_QUERY: 'INVALID_QUERY',
  INVALID_JSON: 'INVALID_JSON',
  INVALID_FORM_DATA: 'INVALID_FORM_DATA',
  JAVASCRIPT_SCHEMA_DETECTED: 'JAVASCRIPT_SCHEMA_DETECTED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CORS_ERROR: 'CORS_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  ABORTED: 'ABORTED',
  DNS_ERROR: 'DNS_ERROR',
  HTTP_ERROR: 'HTTP_ERROR',
  BODY_PARSE_ERROR: 'BODY_PARSE_ERROR',
  BODY_TOO_LARGE: 'BODY_TOO_LARGE',
  SENSITIVE_HEADER_WARNING: 'SENSITIVE_HEADER_WARNING',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_URL]: 'URL 格式无效，请检查协议、域名和路径是否正确',
  [ERROR_CODES.INVALID_HEADER]: '请求头格式无效，Header 名称或值包含非法字符',
  [ERROR_CODES.INVALID_QUERY]: '查询参数格式无效',
  [ERROR_CODES.INVALID_JSON]: 'JSON 格式无效，请检查语法',
  [ERROR_CODES.INVALID_FORM_DATA]: '表单数据格式无效',
  [ERROR_CODES.JAVASCRIPT_SCHEMA_DETECTED]: '检测到 javascript: 协议，为安全起见已阻止请求',
  [ERROR_CODES.NETWORK_ERROR]: '网络错误，可能是目标服务器不可达或被防火墙拦截',
  [ERROR_CODES.CORS_ERROR]: '跨域请求被拒绝 (CORS)。浏览器安全策略限制从脚本访问其他域名的响应。请确保目标服务器返回了正确的 CORS 头（Access-Control-Allow-Origin）',
  [ERROR_CODES.TIMEOUT_ERROR]: '请求超时，可尝试调整超时时间或检查网络连接',
  [ERROR_CODES.ABORTED]: '请求已被用户取消',
  [ERROR_CODES.DNS_ERROR]: 'DNS 解析失败，无法解析目标域名',
  [ERROR_CODES.HTTP_ERROR]: '服务器返回了非 2xx 状态码',
  [ERROR_CODES.BODY_PARSE_ERROR]: '响应体解析失败',
  [ERROR_CODES.BODY_TOO_LARGE]: '响应体过大，已截断预览，可选择下载完整内容',
  [ERROR_CODES.SENSITIVE_HEADER_WARNING]: '检测到敏感头（如 Cookie），请注意安全',
  [ERROR_CODES.UNKNOWN_ERROR]: '发生未知错误',
}

const SENSITIVE_HEADERS = new Set([
  'cookie',
  'set-cookie',
  'authorization',
  'proxy-authorization',
  'x-api-key',
  'api-key',
  'secret',
  'token',
  'access-token',
  'refresh-token',
  'x-auth-token',
])

const BROWSER_FORBIDDEN_HEADERS = new Set([
  'accept-charset',
  'accept-encoding',
  'access-control-request-headers',
  'access-control-request-method',
  'connection',
  'content-length',
  'cookie',
  'cookie2',
  'date',
  'dnt',
  'expect',
  'host',
  'keep-alive',
  'origin',
  'referer',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'via',
])

const CORS_SAFELISTED_RESPONSE_HEADERS = new Set([
  'cache-control',
  'content-language',
  'content-length',
  'content-type',
  'expires',
  'last-modified',
  'pragma',
])

const PRESET_TEMPLATES = [
  {
    id: 'get-json',
    name: 'GET JSON API',
    description: '典型的 GET 请求示例，获取 JSON 数据',
    params: {
      method: 'GET',
      url: 'https://httpbin.org/get',
      queryParams: [{ key: 'foo', value: 'bar', enabled: true }],
      headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
      bodyMode: 'none',
      rawBody: '',
      jsonBody: '',
      formData: [],
      formUrlEncoded: [],
      timeout: 30000,
    },
  },
  {
    id: 'post-json',
    name: 'POST JSON',
    description: 'POST JSON 数据到服务器',
    params: {
      method: 'POST',
      url: 'https://httpbin.org/post',
      queryParams: [],
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'Accept', value: 'application/json', enabled: true },
      ],
      bodyMode: 'json',
      rawBody: '',
      jsonBody: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }, null, 2),
      formData: [],
      formUrlEncoded: [],
      timeout: 30000,
    },
  },
  {
    id: 'post-form',
    name: 'POST Form',
    description: 'POST 表单数据',
    params: {
      method: 'POST',
      url: 'https://httpbin.org/post',
      queryParams: [],
      headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
      bodyMode: 'x-www-form-urlencoded',
      rawBody: '',
      jsonBody: '',
      formData: [],
      formUrlEncoded: [
        { key: 'username', value: 'john_doe', enabled: true },
        { key: 'password', value: '••••••••', enabled: true, sensitive: true },
      ],
      timeout: 30000,
    },
  },
  {
    id: 'auth-bearer',
    name: 'Bearer Token 认证',
    description: '带有 Authorization 头的请求示例',
    params: {
      method: 'GET',
      url: 'https://httpbin.org/bearer',
      queryParams: [],
      headers: [
        { key: 'Authorization', value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', enabled: true, sensitive: true },
        { key: 'Accept', value: 'application/json', enabled: true },
      ],
      bodyMode: 'none',
      rawBody: '',
      jsonBody: '',
      formData: [],
      formUrlEncoded: [],
      timeout: 30000,
    },
  },
  {
    id: 'error-404',
    name: '错误 URL (404)',
    description: '演示 404 错误的处理',
    params: {
      method: 'GET',
      url: 'https://httpbin.org/status/404',
      queryParams: [],
      headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
      bodyMode: 'none',
      rawBody: '',
      jsonBody: '',
      formData: [],
      formUrlEncoded: [],
      timeout: 30000,
    },
  },
  {
    id: 'error-500',
    name: '服务器错误 (500)',
    description: '演示 500 错误的处理',
    params: {
      method: 'GET',
      url: 'https://httpbin.org/status/500',
      queryParams: [],
      headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
      bodyMode: 'none',
      rawBody: '',
      jsonBody: '',
      formData: [],
      formUrlEncoded: [],
      timeout: 30000,
    },
  },
]

const DEFAULT_PARAMS = {
  method: 'GET',
  url: '',
  queryParams: [],
  headers: [],
  bodyMode: 'none',
  rawBody: '',
  jsonBody: '',
  formData: [],
  formUrlEncoded: [],
  timeout: 30000,
}

export {
  VERSION,
  DEFAULT_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
  MAX_BODY_PREVIEW_LENGTH,
  HTTP_METHODS,
  BODY_MODES,
  ERROR_CODES,
  ERROR_MESSAGES,
  SENSITIVE_HEADERS,
  BROWSER_FORBIDDEN_HEADERS,
  CORS_SAFELISTED_RESPONSE_HEADERS,
  PRESET_TEMPLATES,
  DEFAULT_PARAMS,
}
