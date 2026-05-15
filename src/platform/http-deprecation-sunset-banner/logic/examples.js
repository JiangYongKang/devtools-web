export function createUpcomingDeprecationHeaders() {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 15)
  
  return {
    'Deprecation': futureDate.toUTCString(),
    'Link': '<https://api.example.com/docs/deprecation>; rel="deprecation"; type="text/html"',
    'Warning': `299 - "此 API 端点即将废弃"`,
  }
}

export function createDeprecatedStillAvailableHeaders() {
  const pastDate = new Date()
  pastDate.setMonth(pastDate.getMonth() - 2)
  
  return {
    'Deprecation': pastDate.toUTCString(),
    'Sunset': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString(),
    'Link': '<https://api.example.com/docs/v2-migration>; rel="sunset"; type="text/html"',
    'Warning': `299 - "此 API 已废弃，请迁移到 v2 版本。"`,
  }
}

export function createSunsetHardFailureHeaders() {
  const pastDate = new Date()
  pastDate.setDate(pastDate.getDate() - 5)
  
  return {
    'Sunset': pastDate.toUTCString(),
    'Link': '<https://api.example.com/docs/removed>; rel="sunset"; type="text/html"',
    'Warning': `298 - "此 API 端点已过期，不再可用"`,
  }
}

export function createVersionedDeprecationHeaders() {
  return {
    'Deprecation': '"v1"',
    'Link': '<https://api.example.com/docs/v1-deprecation>; rel="deprecation"; type="text/html"',
    'Warning': `299 - "API v1 即将废弃，请升级到 v2 版本。"`,
  }
}

export const EXAMPLE_SCENARIOS = [
  {
    id: 'upcoming',
    name: '即将废弃',
    description: '15 天后即将废弃的 API',
    createHeaders: createUpcomingDeprecationHeaders,
  },
  {
    id: 'deprecated-still-works',
    name: '已废弃仍可用',
    description: '已标记废弃但 30 天后才停止服务',
    createHeaders: createDeprecatedStillAvailableHeaders,
  },
  {
    id: 'sunset-failure',
    name: '已过期硬失败',
    description: '已过期且不再可用的 API',
    createHeaders: createSunsetHardFailureHeaders,
  },
  {
    id: 'versioned',
    name: '版本号废弃',
    description: '使用版本号标记废弃的 API',
    createHeaders: createVersionedDeprecationHeaders,
  },
]

export function getExampleScenario(id) {
  return EXAMPLE_SCENARIOS.find(s => s.id === id)
}

export function createMockResponse(headers) {
  return {
    headers: {
      forEach(callback) {
        for (const [key, value] of Object.entries(headers)) {
          callback(value, key)
        }
      },
    },
  }
}
