const SAFELIST_METHODS = new Set(['GET', 'HEAD', 'POST'])

const SAFELIST_HEADERS_LOWERCASE = new Set([
  'accept',
  'accept-language',
  'content-language',
  'content-type',
])

const SAFELIST_CONTENT_TYPES_LOWERCASE = new Set([
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
])



const PREFLIGHT_TRIGGER_REASONS = {
  NON_SAFELIST_METHOD: 'non_safelist_method',
  NON_SAFELIST_HEADER: 'non_safelist_header',
  NON_SAFELIST_CONTENT_TYPE: 'non_safelist_content_type',
  CUSTOM_HEADERS_PRESENT: 'custom_headers_present',
}

const ERROR_TYPES = {
  MISSING_ALLOW_ORIGIN: 'missing_allow_origin',
  ORIGIN_NOT_ALLOWED: 'origin_not_allowed',
  METHOD_NOT_ALLOWED: 'method_not_allowed',
  HEADERS_NOT_ALLOWED: 'headers_not_allowed',
  CREDENTIALS_WILDCARD_CONFLICT: 'credentials_wildcard_conflict',
  CREDENTIALS_REQUIRED_BUT_MISSING: 'credentials_required_but_missing',
}

const EXAMPLES = {
  SIMPLE_GET: {
    name: 'GET 简单请求',
    description: '无自定义头，Content-Type 为 safelist',
    origin: 'https://example.com',
    method: 'GET',
    headers: [
      { name: 'Accept', value: 'application/json' },
    ],
    responseConfig: {
      allowOrigin: 'https://example.com',
      allowMethods: ['GET', 'POST'],
      allowHeaders: [],
      allowCredentials: false,
      maxAge: 86400,
    },
  },
  POST_JSON_PREFLIGHT: {
    name: 'POST application/json 预检',
    description: 'Content-Type 非 safelist，触发预检',
    origin: 'https://example.com',
    method: 'POST',
    headers: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Accept', value: 'application/json' },
    ],
    responseConfig: {
      allowOrigin: 'https://example.com',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowHeaders: ['Content-Type'],
      allowCredentials: false,
      maxAge: 86400,
    },
  },
  AUTH_PREFLIGHT: {
    name: '带 Authorization 预检',
    description: '自定义 Authorization 头，触发预检',
    origin: 'https://app.example.com',
    method: 'GET',
    headers: [
      { name: 'Authorization', value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      { name: 'Accept', value: 'application/json' },
    ],
    withCredentials: true,
    responseConfig: {
      allowOrigin: 'https://app.example.com',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowHeaders: ['Authorization', 'Content-Type'],
      allowCredentials: true,
      maxAge: 86400,
    },
  },
}

export {
  SAFELIST_METHODS,
  SAFELIST_HEADERS_LOWERCASE,
  SAFELIST_CONTENT_TYPES_LOWERCASE,
  PREFLIGHT_TRIGGER_REASONS,
  ERROR_TYPES,
  EXAMPLES,
}
