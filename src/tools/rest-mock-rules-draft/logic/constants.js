export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT']

export const PATH_MATCH_TYPES = {
  EXACT: 'exact',
  PREFIX: 'prefix',
  REGEX: 'regex',
}

export const PATH_MATCH_TYPE_LABELS = {
  [PATH_MATCH_TYPES.EXACT]: '精确匹配',
  [PATH_MATCH_TYPES.PREFIX]: '前缀匹配',
  [PATH_MATCH_TYPES.REGEX]: '正则匹配',
}

export const CORS_TEMPLATES = {
  BASIC: {
    name: '基础 CORS',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Max-Age': '86400',
    },
  },
  CREDENTIALS: {
    name: '带凭据 CORS',
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
  },
  WILDCARD_HEADERS: {
    name: '通配符头',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Expose-Headers': 'X-Total-Count,X-Next-Page',
    },
  },
}

export const STORAGE_KEY = 'rest-mock-rules-draft:v1'

export const SHARE_PARAM_MAX_LENGTH = 4096

export const DEBOUNCE_DELAY_MS = 300

export const VIRTUAL_SCROLL_ITEM_HEIGHT = 48

export const DEFAULT_DELAY_MS = 0
export const DEFAULT_STATUS_CODE = 200
export const DEFAULT_PROBABILITY = 100

export const MAX_DELAY_MS = 60000

export const VALID_STATUS_CODES = {
  min: 100,
  max: 599,
}

export const PROBABILITY_RANGE = {
  min: 1,
  max: 100,
}

export const ERROR_CODES = {
  INVALID_JSON: 'INVALID_JSON',
  INVALID_YAML: 'INVALID_YAML',
  INVALID_PATH: 'INVALID_PATH',
  INVALID_REGEX: 'INVALID_REGEX',
  INVALID_STATUS_CODE: 'INVALID_STATUS_CODE',
  INVALID_DELAY: 'INVALID_DELAY',
  INVALID_PROBABILITY: 'INVALID_PROBABILITY',
  INVALID_METHOD: 'INVALID_METHOD',
  CONFLICT_PATH_METHOD: 'CONFLICT_PATH_METHOD',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  IMPORT_FAILED: 'IMPORT_FAILED',
  SHARE_URL_TOO_LONG: 'SHARE_URL_TOO_LONG',
}

export const SCHEMA_SUBSET = {
  type: 'object',
  properties: {
    rules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          path: { type: 'string' },
          pathMatchType: {
            type: 'string',
            enum: Object.values(PATH_MATCH_TYPES),
          },
          methods: {
            type: 'array',
            items: {
              type: 'string',
              enum: HTTP_METHODS,
            },
          },
          statusCode: { type: 'number' },
          headers: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
          body: { oneOf: [{ type: 'string' }, { type: 'object' }] },
          bodyType: { type: 'string', enum: ['json', 'raw'] },
          delayMs: { type: 'number' },
          probability: { type: 'number' },
          corsTemplate: { type: ['string', 'null'] },
          tags: { type: 'array', items: { type: 'string' } },
          priority: { type: 'number' },
        },
        required: ['id', 'path', 'pathMatchType', 'methods', 'statusCode'],
      },
    },
    metadata: {
      type: 'object',
      properties: {
        createdAt: { type: 'number' },
        updatedAt: { type: 'number' },
        version: { type: 'string' },
      },
    },
  },
  required: ['rules'],
}

export const PLACEHOLDERS = {
  NOW: '{{now}}',
  UUID: '{{uuid}}',
}

export const PLACEHOLDER_DESCRIPTIONS = {
  [PLACEHOLDERS.NOW]: 'ISO 8601 当前时间戳',
  [PLACEHOLDERS.UUID]: '随机 UUID v4',
}
