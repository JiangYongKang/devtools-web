export const ERROR_CODES = {
  STATE_MISMATCH: 'STATE_MISMATCH',
  MISSING_CODE: 'MISSING_CODE',
  CANCELED: 'CANCELED',
  INVALID_CONFIG: 'INVALID_CONFIG',
  STORAGE_NOT_AVAILABLE: 'STORAGE_NOT_AVAILABLE',
  STATE_EXPIRED: 'STATE_EXPIRED',
  STATE_CONSUMED: 'STATE_CONSUMED',
  WELL_KNOWN_PARSE_FAILED: 'WELL_KNOWN_PARSE_FAILED',
  INVALID_CODE_VERIFIER: 'INVALID_CODE_VERIFIER',
  MISSING_NONCE: 'MISSING_NONCE',
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_SCOPE: 'INVALID_SCOPE',
  SERVER_ERROR: 'SERVER_ERROR',
  TEMPORARILY_UNAVAILABLE: 'TEMPORARILY_UNAVAILABLE',
  UNAUTHORIZED_CLIENT: 'UNAUTHORIZED_CLIENT',
  UNSUPPORTED_RESPONSE_TYPE: 'UNSUPPORTED_RESPONSE_TYPE',
  IDP_ERROR: 'IDP_ERROR',
}

export const ERROR_MESSAGES = {
  [ERROR_CODES.STATE_MISMATCH]: 'state 参数不匹配，可能是重放攻击或会话过期',
  [ERROR_CODES.MISSING_CODE]: '授权码缺失，授权流程可能被中断',
  [ERROR_CODES.CANCELED]: '用户取消了授权',
  [ERROR_CODES.INVALID_CONFIG]: '无效的配置参数',
  [ERROR_CODES.STORAGE_NOT_AVAILABLE]: 'sessionStorage 不可用，已降级到内存存储，刷新页面将丢失数据',
  [ERROR_CODES.STATE_EXPIRED]: 'state 已过期，请重新发起授权',
  [ERROR_CODES.STATE_CONSUMED]: 'state 已被使用，防止重放攻击',
  [ERROR_CODES.WELL_KNOWN_PARSE_FAILED]: 'OIDC 配置解析失败',
  [ERROR_CODES.INVALID_CODE_VERIFIER]: '无效的 code_verifier',
  [ERROR_CODES.MISSING_NONCE]: 'nonce 缺失，可能遭受重放攻击',
  [ERROR_CODES.INVALID_REQUEST]: '无效的授权请求参数',
  [ERROR_CODES.INVALID_SCOPE]: '请求的权限范围无效、未知或格式错误',
  [ERROR_CODES.SERVER_ERROR]: 'Identity Provider 服务器内部错误',
  [ERROR_CODES.TEMPORARILY_UNAVAILABLE]: 'Identity Provider 暂时不可用，请稍后重试',
  [ERROR_CODES.UNAUTHORIZED_CLIENT]: '客户端未被授权使用此授权类型',
  [ERROR_CODES.UNSUPPORTED_RESPONSE_TYPE]: '不支持此响应类型',
  [ERROR_CODES.IDP_ERROR]: 'Identity Provider 返回未知错误',
}

export const ERROR_RECOVERY_SUGGESTIONS = {
  [ERROR_CODES.STATE_MISMATCH]: '请清除浏览器缓存，重新发起授权请求',
  [ERROR_CODES.MISSING_CODE]: '请返回 Identity Provider 重新授权',
  [ERROR_CODES.CANCELED]: '您可以随时重新发起授权',
  [ERROR_CODES.INVALID_CONFIG]: '请检查 client_id、redirect_uri、scope 等参数是否正确',
  [ERROR_CODES.STORAGE_NOT_AVAILABLE]: '启用第三方 Cookie 或使用隐私浏览模式可能导致此问题',
  [ERROR_CODES.STATE_EXPIRED]: '授权会话超时，请重新发起授权',
  [ERROR_CODES.STATE_CONSUMED]: '请勿刷新回调页面，请重新发起授权',
  [ERROR_CODES.WELL_KNOWN_PARSE_FAILED]: '请检查 .well-known/openid-configuration URL 是否可访问',
  [ERROR_CODES.INVALID_CODE_VERIFIER]: 'code_verifier 长度应为 43-128 字符',
  [ERROR_CODES.MISSING_NONCE]: '请检查 OIDC 配置是否要求 nonce',
  [ERROR_CODES.INVALID_REQUEST]: '请检查 client_id、redirect_uri 等必填参数是否正确',
  [ERROR_CODES.INVALID_SCOPE]: '请检查请求的 scope 是否在 IdP 支持的范围内',
  [ERROR_CODES.SERVER_ERROR]: 'IdP 服务器异常，请联系管理员或稍后重试',
  [ERROR_CODES.TEMPORARILY_UNAVAILABLE]: 'IdP 负载过高或维护中，请稍后重试',
  [ERROR_CODES.UNAUTHORIZED_CLIENT]: '请联系 IdP 管理员启用该客户端的授权码流程',
  [ERROR_CODES.UNSUPPORTED_RESPONSE_TYPE]: '请检查 IdP 是否支持授权码 (code) 响应类型',
  [ERROR_CODES.IDP_ERROR]: '请查看 IdP 返回的具体错误描述或联系管理员',
}

export const DEFAULT_STORAGE_KEYS = {
  STATE: 'oauth_state',
  NONCE: 'oauth_nonce',
  CODE_VERIFIER: 'oauth_code_verifier',
  AUTH_PARAMS: 'oauth_auth_params',
}

export const PKCE = {
  CODE_VERIFIER_MIN_LENGTH: 43,
  CODE_VERIFIER_MAX_LENGTH: 128,
  DEFAULT_CODE_CHALLENGE_METHOD: 'S256',
}

export const STATE = {
  DEFAULT_LENGTH: 32,
  DEFAULT_TTL_MS: 10 * 60 * 1000,
}

export const NONCE = {
  DEFAULT_LENGTH: 32,
}

export const SCOPE = {
  DEFAULT_OPENID: 'openid profile email',
}

export const RESPONSE_MODE = {
  QUERY: 'query',
  FRAGMENT: 'fragment',
  FORM_POST: 'form_post',
}

export const PROMPT = {
  NONE: 'none',
  LOGIN: 'login',
  CONSENT: 'consent',
  SELECT_ACCOUNT: 'select_account',
}

export const GRANT_TYPES = {
  AUTHORIZATION_CODE: 'authorization_code',
  REFRESH_TOKEN: 'refresh_token',
}

export const TOKEN_ENDPOINT_AUTH_METHODS = {
  CLIENT_SECRET_BASIC: 'client_secret_basic',
  CLIENT_SECRET_POST: 'client_secret_post',
  NONE: 'none',
}

export const MOCK_TOKEN_ENDPOINT = '/mock/token'

export const DEMO_CONFIG = {
  ISSUER: 'https://idp.example.com',
  AUTHORIZATION_ENDPOINT: 'https://idp.example.com/authorize',
  TOKEN_ENDPOINT: 'https://idp.example.com/token',
  CLIENT_ID: 'demo-client-12345',
  REDIRECT_URI: 'https://app.example.com/callback',
}

export const WELL_KNOWN_REQUIRED_FIELDS = [
  'issuer',
  'authorization_endpoint',
  'token_endpoint',
]

export const WELL_KNOWN_RECOMMENDED_FIELDS = [
  'response_types_supported',
  'code_challenge_methods_supported',
  'grant_types_supported',
  'scopes_supported',
  'token_endpoint_auth_methods_supported',
]

export const IFRAME_WARNING = '出于安全考虑，OAuth2 授权流程不应在 iframe 中进行，可能导致安全漏洞或被浏览器阻止'

export const CORS_WARNING = '令牌交换请求必须从后端发起，浏览器直接请求会受到 CORS 限制。请使用下方的 cURL 模板或后端代理。'

export const CSP_WARNING = '内容安全策略(CSP)禁止内联脚本时，请确保授权重定向 URL 在 connect-src 或 form-action 白名单中。'
