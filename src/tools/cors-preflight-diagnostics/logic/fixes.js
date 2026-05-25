import { ERROR_TYPES } from './constants.js'

function generateFixSuggestions(request, responseConfig, validationResult) {
  const { origin, method, headers = [], withCredentials = false } = request
  const { errors = [] } = validationResult
  const fixes = []

  const missingOriginError = errors.find(e => e.type === ERROR_TYPES.MISSING_ALLOW_ORIGIN)
  if (missingOriginError) {
    fixes.push({
      id: 'fix-origin',
      title: '添加 Access-Control-Allow-Origin 响应头',
      description: '服务器必须在响应中包含此头才能允许跨域请求',
      codeExample: `Access-Control-Allow-Origin: ${withCredentials ? origin : '*'}`,
      severity: 'critical',
      category: 'origin',
    })
  }

  const originNotAllowedError = errors.find(e => e.type === ERROR_TYPES.ORIGIN_NOT_ALLOWED)
  if (originNotAllowedError) {
    fixes.push({
      id: 'fix-origin-allow',
      title: `将 Origin "${origin}" 添加到允许列表`,
      description: '当前配置的 Origin 不匹配请求的 Origin',
      codeExample: `Access-Control-Allow-Origin: ${origin}`,
      severity: 'critical',
      category: 'origin',
    })
  }

  const credentialsConflictError = errors.find(e => e.type === ERROR_TYPES.CREDENTIALS_WILDCARD_CONFLICT)
  if (credentialsConflictError) {
    fixes.push({
      id: 'fix-credentials-wildcard',
      title: '替换通配符 (*) 为具体的 Origin',
      description: '当请求携带凭证（withCredentials: true）时，不能使用 * 通配符',
      codeExample: `Access-Control-Allow-Origin: ${origin}
Access-Control-Allow-Credentials: true`,
      severity: 'critical',
      category: 'credentials',
    })
  }

  const credentialsMissingError = errors.find(e => e.type === ERROR_TYPES.CREDENTIALS_REQUIRED_BUT_MISSING)
  if (credentialsMissingError) {
    fixes.push({
      id: 'fix-credentials-missing',
      title: '添加 Access-Control-Allow-Credentials: true',
      description: '请求携带凭证时，服务器必须显式允许',
      codeExample: 'Access-Control-Allow-Credentials: true',
      severity: 'critical',
      category: 'credentials',
    })
  }

  const methodNotAllowedError = errors.find(e => e.type === ERROR_TYPES.METHOD_NOT_ALLOWED)
  if (methodNotAllowedError) {
    const currentMethods = responseConfig.allowMethods || []
    const newMethods = [...new Set([...currentMethods, method])].sort()
    fixes.push({
      id: 'fix-method',
      title: `将方法 "${method}" 添加到 Access-Control-Allow-Methods`,
      description: '预检请求验证实际请求的方法是否被允许',
      codeExample: `Access-Control-Allow-Methods: ${newMethods.join(', ')}`,
      severity: 'high',
      category: 'method',
    })
  }

  const headersNotAllowedError = errors.find(e => e.type === ERROR_TYPES.HEADERS_NOT_ALLOWED)
  if (headersNotAllowedError) {
    const missingHeaders = headersNotAllowedError.missingHeaders || []
    const currentHeaders = (responseConfig.allowHeaders || []).map(h => h.toLowerCase())
    const newHeaders = [...new Set([...currentHeaders, ...missingHeaders])].sort()
    fixes.push({
      id: 'fix-headers',
      title: `将请求头添加到 Access-Control-Allow-Headers`,
      description: `缺少的请求头: ${missingHeaders.join(', ')}`,
      codeExample: `Access-Control-Allow-Headers: ${newHeaders.join(', ')}`,
      severity: 'high',
      category: 'headers',
    })
  }

  return fixes
}

function generateMultiOriginConfig(origins, baseConfig = {}) {
  if (!Array.isArray(origins) || origins.length === 0) {
    return []
  }

  return origins.map(origin => {
    const config = {
      ...baseConfig,
      allowOrigin: origin,
    }

    return {
      origin,
      config,
      responseHeaders: {
        'Access-Control-Allow-Origin': origin,
        ...(baseConfig.allowCredentials && { 'Access-Control-Allow-Credentials': 'true' }),
        'Vary': 'Origin',
      },
    }
  })
}

function generateWildcardVsSpecificComparison(origin, withCredentials = false) {
  return [
    {
      type: 'wildcard',
      title: '使用通配符 (*)',
      description: '允许所有 Origin 访问',
      config: { allowOrigin: '*', allowCredentials: false },
      advantages: [
        '配置简单',
        '无需维护 Origin 列表',
      ],
      disadvantages: [
        '不能与 credentials 同时使用',
        '安全性较低',
      ],
      supported: !withCredentials,
      codeExample: 'Access-Control-Allow-Origin: *',
    },
    {
      type: 'specific',
      title: '使用具体 Origin',
      description: `只允许 ${origin} 访问`,
      config: { allowOrigin: origin, allowCredentials: withCredentials },
      advantages: [
        '更安全',
        '支持 credentials',
      ],
      disadvantages: [
        '需要动态设置响应头',
        '需要 Vary: Origin 避免缓存问题',
      ],
      supported: true,
      codeExample: `Access-Control-Allow-Origin: ${origin}
Vary: Origin${withCredentials ? '\nAccess-Control-Allow-Credentials: true' : ''}`,
    },
  ]
}

export {
  generateFixSuggestions,
  generateMultiOriginConfig,
  generateWildcardVsSpecificComparison,
}
