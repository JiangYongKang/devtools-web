const RISK_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
}

const RISK_FLAGS = {
  PUNYCODE: {
    id: 'punycode',
    level: RISK_LEVEL.MEDIUM,
    message: '包含 Punycode 编码的国际化域名',
    suggestion: '建议核对原始域名是否为预期的国际化域名',
  },
  IPV6_LITERAL: {
    id: 'ipv6_literal',
    level: RISK_LEVEL.LOW,
    message: '使用 IPv6 字面量地址',
    suggestion: '确认是否为预期的内部服务地址',
  },
  USER_CREDENTIALS: {
    id: 'user_credentials',
    level: RISK_LEVEL.CRITICAL,
    message: 'URL 中嵌入了用户名/密码',
    suggestion: '敏感信息不应出现在 URL 中，请立即移除',
  },
  DOUBLE_SLASH_ABNORMAL: {
    id: 'double_slash_abnormal',
    level: RISK_LEVEL.HIGH,
    message: '检测到异常双斜杠结构',
    suggestion: '可能是钓鱼攻击尝试，建议谨慎访问',
  },
  CONTROL_CHARACTERS: {
    id: 'control_characters',
    level: RISK_LEVEL.HIGH,
    message: '包含不可见控制字符',
    suggestion: '高度可疑，可能是钓鱼或混淆攻击',
  },
  UNKNOWN_SCHEME: {
    id: 'unknown_scheme',
    level: RISK_LEVEL.MEDIUM,
    message: '使用了非标准协议方案',
    suggestion: '确认该自定义协议是否安全可信',
  },
  LONG_URL: {
    id: 'long_url',
    level: RISK_LEVEL.LOW,
    message: 'URL 长度超过建议阈值',
    suggestion: '部分浏览器或服务可能不支持超长 URL',
  },
  SUSPICIOUS_PORT: {
    id: 'suspicious_port',
    level: RISK_LEVEL.MEDIUM,
    message: '使用了非标准端口号',
    suggestion: '确认端口号是否正确，避免访问错误服务',
  },
  OAUTH_STATE: {
    id: 'oauth_state',
    level: RISK_LEVEL.LOW,
    message: '包含 OAuth state 参数',
    suggestion: 'state 参数用于 CSRF 防护，通常无需担心',
  },
  UTM_TAGS: {
    id: 'utm_tags',
    level: RISK_LEVEL.LOW,
    message: '包含 UTM 追踪参数',
    suggestion: '可选择剥离追踪参数后分享',
  },
}

const OPEN_STRATEGY = {
  EXTERNAL_BLANK: 'external_blank',
  DESKTOP_DEEPLINK: 'desktop_deeplink',
  MOBILE_UNIVERSAL: 'mobile_universal',
  SAME_TAB: 'same_tab',
}

const URL_SCHEMES = {
  HTTP: 'http:',
  HTTPS: 'https:',
  MAILTO: 'mailto:',
  TEL: 'tel:',
}

const DEFAULT_WHITELIST_SCHEMES = [
  URL_SCHEMES.HTTP,
  URL_SCHEMES.HTTPS,
  URL_SCHEMES.MAILTO,
  URL_SCHEMES.TEL,
  'ftp:',
  'sftp:',
  'ssh:',
  'slack:',
  'vscode:',
  'zoommtg:',
]

const SHORTLINK_DOMAINS = [
  'bit.ly',
  'goo.gl',
  't.co',
  'tinyurl.com',
  'is.gd',
  'buff.ly',
  'ow.ly',
  'j.mp',
  'fb.me',
  'youtu.be',
  'amzn.to',
  'git.io',
]

const UTM_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
]

const DEFAULT_OPTIONS = {
  maxUrlLength: 2048,
  schemeWhitelist: DEFAULT_WHITELIST_SCHEMES,
  shortlinkDomains: SHORTLINK_DOMAINS,
  utmParams: UTM_PARAMS,
  expandTimeout: 10000,
  maxRedirects: 5,
  maxResponseSize: 1024,
}

const ERROR_CODES = {
  EMPTY_INPUT: 'empty_input',
  INVALID_URL: 'invalid_url',
  URL_TOO_LONG: 'url_too_long',
  EXPAND_TIMEOUT: 'expand_timeout',
  EXPAND_CORS_ERROR: 'expand_cors_error',
  EXPAND_FAILED: 'expand_failed',
  MAX_REDIRECTS: 'max_redirects',
  COPY_FAILED: 'copy_failed',
}

const HASH_PREFIX_LENGTH = 8

export {
  RISK_LEVEL,
  RISK_FLAGS,
  OPEN_STRATEGY,
  URL_SCHEMES,
  DEFAULT_WHITELIST_SCHEMES,
  SHORTLINK_DOMAINS,
  UTM_PARAMS,
  DEFAULT_OPTIONS,
  ERROR_CODES,
  HASH_PREFIX_LENGTH,
}
