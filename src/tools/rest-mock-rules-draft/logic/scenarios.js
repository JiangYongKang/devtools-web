import { PATH_MATCH_TYPES } from './constants.js'
import { generateId } from './normalization.js'

export const SCENARIOS = {
  CRUD_SUCCESS: {
    id: 'crud_success',
    name: 'CRUD 成功场景',
    description: '包含 GET/POST/PUT/DELETE 基本操作的成功响应',
    rules: [
      {
        path: '/api/users',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['GET'],
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          {
            data: [
              { id: 1, name: '张三', email: 'zhangsan@example.com' },
              { id: 2, name: '李四', email: 'lisi@example.com' },
            ],
            total: 2,
            page: 1,
            pageSize: 10,
          },
          null,
          2
        ),
        delayMs: 100,
        tags: ['users', 'crud', 'success'],
      },
      {
        path: '/api/users',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['POST'],
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          Location: '/api/users/3',
        },
        body: JSON.stringify(
          {
            id: 3,
            name: '新用户',
            email: 'newuser@example.com',
            createdAt: '{{now}}',
          },
          null,
          2
        ),
        delayMs: 200,
        tags: ['users', 'crud', 'create'],
      },
      {
        path: '/api/users/1',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['GET'],
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          {
            id: 1,
            name: '张三',
            email: 'zhangsan@example.com',
            profile: {
              avatar: 'https://example.com/avatar.png',
              bio: 'Hello World',
            },
          },
          null,
          2
        ),
        delayMs: 50,
        tags: ['users', 'crud', 'read'],
      },
      {
        path: '/api/users/1',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['PUT', 'PATCH'],
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          {
            id: 1,
            name: '张三(已更新)',
            email: 'zhangsan@example.com',
            updatedAt: '{{now}}',
          },
          null,
          2
        ),
        delayMs: 150,
        tags: ['users', 'crud', 'update'],
      },
      {
        path: '/api/users/1',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['DELETE'],
        statusCode: 204,
        headers: {},
        body: '',
        delayMs: 100,
        tags: ['users', 'crud', 'delete'],
      },
    ],
  },
  PAGINATION: {
    id: 'pagination',
    name: '分页场景',
    description: '包含分页参数和分页响应的示例',
    rules: [
      {
        path: '/api/items',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['GET'],
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Total-Count': '100',
          'X-Total-Pages': '10',
          'X-Current-Page': '1',
          Link: '</api/items?page=2>; rel="next", </api/items?page=10>; rel="last"',
        },
        body: JSON.stringify(
          {
            data: [
              { id: 1, title: '项目 1', status: 'active' },
              { id: 2, title: '项目 2', status: 'active' },
              { id: 3, title: '项目 3', status: 'inactive' },
            ],
            pagination: {
              page: 1,
              pageSize: 10,
              totalItems: 100,
              totalPages: 10,
              hasNext: true,
              hasPrev: false,
            },
          },
          null,
          2
        ),
        delayMs: 200,
        tags: ['pagination', 'list'],
      },
      {
        path: '/api/items/search',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['GET', 'POST'],
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          {
            data: [{ id: 1, title: '搜索结果 1', score: 0.95 }],
            query: 'example',
            hits: 1,
          },
          null,
          2
        ),
        delayMs: 300,
        tags: ['pagination', 'search'],
      },
    ],
  },
  ERROR_401: {
    id: 'error_401',
    name: '401 未授权',
    description: '认证失败场景示例',
    rules: [
      {
        path: '/api/protected',
        pathMatchType: PATH_MATCH_TYPES.PREFIX,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer realm="api"',
        },
        body: JSON.stringify(
          {
            error: 'unauthorized',
            error_description: '缺少或无效的认证令牌',
            code: 'AUTH_REQUIRED',
            timestamp: '{{now}}',
          },
          null,
          2
        ),
        delayMs: 50,
        probability: 100,
        tags: ['error', 'auth', '401'],
      },
      {
        path: '/api/token/refresh',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['POST'],
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          {
            error: 'invalid_token',
            error_description: '刷新令牌已过期',
            code: 'REFRESH_TOKEN_EXPIRED',
          },
          null,
          2
        ),
        delayMs: 50,
        tags: ['error', 'auth', '401'],
      },
    ],
  },
  ERROR_429: {
    id: 'error_429',
    name: '429 限流',
    description: '请求频率限制场景示例',
    rules: [
      {
        path: '/api/rate-limited',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['GET', 'POST'],
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '3600',
        },
        body: JSON.stringify(
          {
            error: 'rate_limit_exceeded',
            error_description: '请求频率超过限制',
            limit: 100,
            remaining: 0,
            resetIn: 60,
            retryAfter: 60,
          },
          null,
          2
        ),
        delayMs: 20,
        probability: 30,
        tags: ['error', 'rate-limit', '429'],
      },
    ],
  },
  ERROR_500: {
    id: 'error_500',
    name: '500 服务器错误',
    description: '服务器内部错误场景示例',
    rules: [
      {
        path: '/api/unstable',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['GET', 'POST'],
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          {
            error: 'internal_server_error',
            error_description: '服务器内部错误，请稍后重试',
            code: 'INTERNAL_ERROR',
            requestId: '{{uuid}}',
            timestamp: '{{now}}',
          },
          null,
          2
        ),
        delayMs: 500,
        probability: 20,
        tags: ['error', 'server', '500'],
      },
      {
        path: '/api/timeout',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['GET'],
        statusCode: 504,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          {
            error: 'gateway_timeout',
            error_description: '上游服务超时',
            code: 'GATEWAY_TIMEOUT',
          },
          null,
          2
        ),
        delayMs: 1000,
        tags: ['error', 'timeout', '504'],
      },
    ],
  },
}

export function getScenarioById(id) {
  return SCENARIOS[id] || null
}

export function getAllScenarios() {
  return Object.values(SCENARIOS)
}

export function mergeScenarioToRules(existingRules, scenario) {
  if (!scenario || !Array.isArray(scenario.rules)) {
    return existingRules || []
  }

  const newRules = scenario.rules.map((rule, index) => ({
    ...rule,
    id: generateId(),
    name: rule.name || `${scenario.name} - 规则 ${index + 1}`,
    priority: (existingRules?.length || 0) + index,
  }))

  return [...(existingRules || []), ...newRules]
}

export function getAllTagsFromRules(rules) {
  const tags = new Set()
  if (!Array.isArray(rules)) return []

  for (const rule of rules) {
    if (Array.isArray(rule.tags)) {
      for (const tag of rule.tags) {
        tags.add(tag)
      }
    }
  }

  return Array.from(tags).sort()
}

export function filterRulesByTag(rules, tag) {
  if (!tag || !Array.isArray(rules)) return rules || []
  return rules.filter(
    (rule) => Array.isArray(rule.tags) && rule.tags.includes(tag)
  )
}

export function filterRulesBySearch(rules, searchText) {
  if (!searchText || searchText.trim() === '' || !Array.isArray(rules)) {
    return rules || []
  }

  const lowerSearch = searchText.toLowerCase()

  return rules.filter((rule) => {
    const searchFields = [
      rule.name,
      rule.path,
      ...(rule.methods || []),
      String(rule.statusCode),
      ...(rule.tags || []),
    ]

    return searchFields.some((field) => {
      if (!field) return false
      return String(field).toLowerCase().includes(lowerSearch)
    })
  })
}
