import { CORS_TEMPLATES } from './constants.js'

export function generateCurlExample(rule, baseUrl = 'http://localhost:3000') {
  if (!rule) return ''

  const method = rule.methods?.[0] || 'GET'
  const path = rule.path || '/'
  const url = `${baseUrl}${path}`

  const parts = [`curl -X ${method}`]

  parts.push(`"${url}"`)

  if (rule.headers && Object.keys(rule.headers).length > 0) {
    for (const [key, value] of Object.entries(rule.headers)) {
      parts.push(`-H "${key}: ${value}"`)
    }
  }

  if (rule.corsTemplate && CORS_TEMPLATES[rule.corsTemplate]) {
    const corsHeaders = CORS_TEMPLATES[rule.corsTemplate].headers
    for (const [key, value] of Object.entries(corsHeaders)) {
      parts.push(`-H "${key}: ${value}"`)
    }
  }

  if (rule.body && typeof rule.body === 'string' && rule.body.trim()) {
    if (rule.bodyType === 'json') {
      parts.push(`-H "Content-Type: application/json"`)
      parts.push(`-d '${rule.body.replace(/'/g, "'\"'\"'")}'`)
    } else {
      parts.push(`-d '${rule.body.replace(/'/g, "'\"'\"'")}'`)
    }
  }

  if (rule.delayMs && rule.delayMs > 0) {
    parts.push(`# 预计延迟: ${rule.delayMs}ms`)
  }

  if (rule.probability && rule.probability < 100) {
    parts.push(`# 触发概率: ${rule.probability}%`)
  }

  return parts.join(' \\\n  ')
}

export function generateAllCurlExamples(rules, baseUrl = 'http://localhost:3000') {
  if (!Array.isArray(rules) || rules.length === 0) return []

  return rules.map((rule) => ({
    ruleId: rule.id,
    name: rule.name || rule.path,
    method: rule.methods?.[0] || 'GET',
    path: rule.path,
    curl: generateCurlExample(rule, baseUrl),
  }))
}

export function generateNginxLocationBlock(rule) {
  if (!rule) return ''

  const path = rule.path || '/'

  let locationModifier = '='
  if (rule.pathMatchType === 'prefix') {
    locationModifier = ''
  } else if (rule.pathMatchType === 'regex') {
    locationModifier = '~'
  }

  const lines = []
  lines.push(`location ${locationModifier} ${path} {`)

  if (rule.methods && rule.methods.length > 0 && !rule.methods.includes('GET')) {
    lines.push(`    limit_except ${rule.methods.join(' ')} { deny all; }`)
  }

  if (rule.delayMs && rule.delayMs > 0) {
    lines.push(`    # 延迟: ${rule.delayMs}ms (需要 ngx_http_sleep_module)`)
  }

  if (rule.statusCode) {
    lines.push(`    return ${rule.statusCode};`)
  }

  if (rule.headers && Object.keys(rule.headers).length > 0) {
    for (const [key, value] of Object.entries(rule.headers)) {
      lines.push(`    add_header ${key} "${value}";`)
    }
  }

  if (rule.corsTemplate && CORS_TEMPLATES[rule.corsTemplate]) {
    lines.push(`    # CORS Template: ${CORS_TEMPLATES[rule.corsTemplate].name}`)
    for (const [key, value] of Object.entries(CORS_TEMPLATES[rule.corsTemplate].headers)) {
      lines.push(`    add_header ${key} "${value}";`)
    }
  }

  if (rule.body && rule.body.trim()) {
    lines.push(`    # 响应体: ${rule.body.length} 字符`)
  }

  lines.push('}')

  return lines.join('\n')
}

export function generateJsonServerRoute(rule) {
  if (!rule) return null

  const path = rule.path || '/'
  const method = rule.methods?.[0] || 'GET'

  let responseBody = {}
  if (rule.body && rule.body.trim()) {
    try {
      responseBody = JSON.parse(rule.body)
    } catch {
      responseBody = { rawBody: rule.body }
    }
  }

  return {
    method,
    path,
    status: rule.statusCode || 200,
    response: responseBody,
    delay: rule.delayMs || 0,
    probability: rule.probability || 100,
    headers: rule.headers || {},
  }
}

export function generateJsonServerRoutes(rules) {
  if (!Array.isArray(rules)) return '[]'

  const routes = []
  for (const rule of rules) {
    const route = generateJsonServerRoute(rule)
    if (route) routes.push(route)
  }

  return JSON.stringify(routes, null, 2)
}

export function getDraftSummary(draft) {
  if (!draft || !Array.isArray(draft.rules)) {
    return {
      totalRules: 0,
      uniquePaths: 0,
      methodsCovered: [],
      maxDelay: 0,
      totalDelay: 0,
      tags: [],
      statusCodes: {},
    }
  }

  const rules = draft.rules
  const paths = new Set()
  const methods = new Set()
  const tags = new Set()
  const statusCodes = {}
  let maxDelay = 0
  let totalDelay = 0

  for (const rule of rules) {
    paths.add(rule.path)

    if (Array.isArray(rule.methods)) {
      for (const m of rule.methods) {
        methods.add(m)
      }
    }

    if (Array.isArray(rule.tags)) {
      for (const t of rule.tags) {
        tags.add(t)
      }
    }

    if (rule.statusCode) {
      statusCodes[rule.statusCode] = (statusCodes[rule.statusCode] || 0) + 1
    }

    if (typeof rule.delayMs === 'number') {
      maxDelay = Math.max(maxDelay, rule.delayMs)
      totalDelay += rule.delayMs
    }
  }

  return {
    totalRules: rules.length,
    uniquePaths: paths.size,
    methodsCovered: Array.from(methods).sort(),
    maxDelay,
    totalDelay,
    avgDelay: rules.length > 0 ? Math.round(totalDelay / rules.length) : 0,
    tags: Array.from(tags).sort(),
    statusCodes,
  }
}

export function generateDocumentationMarkdown(rules, baseUrl = 'http://localhost:3000') {
  if (!Array.isArray(rules) || rules.length === 0) {
    return '# Mock Rules Documentation\n\n暂无规则'
  }

  const summary = getDraftSummary({ rules })

  const lines = []
  lines.push('# Mock Rules Documentation')
  lines.push('')
  lines.push(`## 摘要`)
  lines.push(`- 规则数量: ${summary.totalRules}`)
  lines.push(`- 唯一路径: ${summary.uniquePaths}`)
  lines.push(`- 覆盖方法: ${summary.methodsCovered.join(', ')}`)
  lines.push(`- 最大延迟: ${summary.maxDelay}ms`)
  lines.push(`- 平均延迟: ${summary.avgDelay}ms`)
  if (summary.tags.length > 0) {
    lines.push(`- 标签: ${summary.tags.join(', ')}`)
  }
  lines.push('')

  for (const rule of rules) {
    const name = rule.name || rule.path
    lines.push(`## ${name}`)
    lines.push('')
    lines.push(`- 路径: \`${rule.path}\` (${rule.pathMatchType})`)
    lines.push(`- 方法: ${rule.methods?.join(', ') || 'N/A'}`)
    lines.push(`- 状态码: ${rule.statusCode}`)
    lines.push(`- 延迟: ${rule.delayMs}ms`)
    if (rule.probability < 100) {
      lines.push(`- 概率: ${rule.probability}%`)
    }
    if (Array.isArray(rule.tags) && rule.tags.length > 0) {
      lines.push(`- 标签: ${rule.tags.join(', ')}`)
    }
    lines.push('')
    lines.push('```bash')
    lines.push(`# ${baseUrl}`)
    lines.push(generateCurlExample(rule, baseUrl))
    lines.push('```')
    lines.push('')
  }

  return lines.join('\n')
}
