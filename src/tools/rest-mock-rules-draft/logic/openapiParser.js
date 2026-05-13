import { HTTP_METHODS, PATH_MATCH_TYPES, ERROR_CODES } from './constants.js'
import { createError } from './errors.js'
import { generateId } from './normalization.js'

const HTTP_METHODS_LOWER = HTTP_METHODS.map((m) => m.toLowerCase())

export function parseOpenApiFragment(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return {
      success: false,
      error: createError(ERROR_CODES.IMPORT_FAILED, 'OpenAPI 片段为空'),
      suggestions: [],
    }
  }

  let parsed

  try {
    parsed = JSON.parse(text)
  } catch {
    try {
      parsed = tryYamlParse(text)
    } catch {
      return {
        success: false,
        error: createError(ERROR_CODES.IMPORT_FAILED, '无法解析为 JSON 或 YAML'),
        suggestions: [
          '请检查 JSON/YAML 语法是否正确',
          '确保粘贴的是完整的 OpenAPI/Swagger 文档片段',
          '至少需要包含 paths 或 openapi/swagger 字段',
        ],
      }
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      success: false,
      error: createError(ERROR_CODES.IMPORT_FAILED, '解析结果不是有效的对象'),
      suggestions: ['确保片段包含 paths 字段'],
    }
  }

  const rules = []
  const warnings = []
  const suggestions = []

  if (parsed.paths && typeof parsed.paths === 'object') {
    for (const [path, pathItem] of Object.entries(parsed.paths)) {
      if (!pathItem || typeof pathItem !== 'object') continue

      for (const [method, operation] of Object.entries(pathItem)) {
        if (!HTTP_METHODS_LOWER.includes(method.toLowerCase())) continue
        if (!operation || typeof operation !== 'object') continue

        const rule = extractRuleFromOperation(path, method.toUpperCase(), operation)
        if (rule) {
          rules.push(rule)
        }
      }
    }
  }

  if (rules.length === 0) {
    return {
      success: false,
      error: createError(ERROR_CODES.IMPORT_FAILED, '未找到可转换的路径和方法定义'),
      suggestions: [
        '确保片段包含 paths 字段',
        'paths 下需要定义具体的 HTTP 方法（get, post 等）',
        '检查方法定义是否包含 responses',
      ],
      warnings,
    }
  }

  suggestions.push(`成功提取 ${rules.length} 条规则`)
  suggestions.push('这是弱提示预填，建议手动检查和完善规则')
  if (rules.length > 20) {
    warnings.push('提取规则较多（>20），建议精简后再导入')
  }

  return {
    success: true,
    rules,
    warnings,
    suggestions,
  }
}

function extractRuleFromOperation(path, method, operation) {
  const rule = {
    id: generateId(),
    name: operation.summary || operation.operationId || `${method} ${path}`,
    path,
    pathMatchType: path.includes('{') ? PATH_MATCH_TYPES.REGEX : PATH_MATCH_TYPES.EXACT,
    methods: [method],
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: '',
    bodyType: 'json',
    delayMs: 0,
    probability: 100,
    corsTemplate: null,
    tags: operation.tags || [],
    priority: 0,
  }

  if (path.includes('{')) {
    rule.path = path.replace(/\{[^}]+\}/g, '[^/]+')
  }

  if (operation.responses && typeof operation.responses === 'object') {
    const successCodes = ['200', '201', '204', '202', 'default']
    let bestResponse = null

    for (const code of successCodes) {
      if (operation.responses[code]) {
        bestResponse = operation.responses[code]
        if (code !== 'default') {
          rule.statusCode = parseInt(code, 10)
        }
        break
      }
    }

    if (bestResponse && bestResponse.content) {
      const jsonContent =
        bestResponse.content['application/json'] ||
        bestResponse.content['application/json; charset=utf-8']

      if (jsonContent && jsonContent.example) {
        try {
          rule.body = JSON.stringify(jsonContent.example, null, 2)
        } catch {
          rule.body = String(jsonContent.example)
        }
      } else if (jsonContent && jsonContent.schema) {
        rule.body = JSON.stringify(generateExampleFromSchema(jsonContent.schema), null, 2)
      }
    }
  }

  if (operation.description) {
    rule.description = operation.description.substring(0, 200)
  }

  return rule
}

function generateExampleFromSchema(schema) {
  if (!schema || typeof schema !== 'object') return null

  if (schema.example !== undefined) {
    return schema.example
  }

  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0]
  }

  switch (schema.type) {
    case 'object': {
      const obj = {}
      if (schema.properties && typeof schema.properties === 'object') {
        for (const [key, value] of Object.entries(schema.properties)) {
          obj[key] = generateExampleFromSchema(value)
        }
      }
      return obj
    }
    case 'array':
      return [generateExampleFromSchema(schema.items)]
    case 'string':
      if (schema.format === 'date-time') return '2024-01-01T00:00:00.000Z'
      if (schema.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000'
      if (schema.format === 'email') return 'user@example.com'
      if (schema.format === 'uri') return 'https://example.com'
      return schema.default || 'string'
    case 'number':
    case 'integer':
      return schema.default || 0
    case 'boolean':
      return schema.default !== undefined ? schema.default : true
    case 'null':
      return null
    default:
      return null
  }
}

function tryYamlParse(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty text')
  }

  const lines = text.split('\n')
  const colonLines = lines.filter((l) => l.trim().includes(':')).length
  const bracketLines = lines.filter((l) => l.includes('{') || l.includes('[')).length

  if (bracketLines > colonLines) {
    throw new Error('Looks like JSON, not YAML')
  }

  throw new Error('YAML parsing requires yaml library')
}

export function tryExtractFromClipboardContent(text) {
  const trimmed = text?.trim() || ''

  if (trimmed === '') {
    return null
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.includes('openapi:') || trimmed.includes('swagger:')) {
    return parseOpenApiFragment(trimmed)
  }

  return null
}
