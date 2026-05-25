const CSRF_STRATEGIES = {
  DOUBLE_SUBMIT_COOKIE: 'doubleSubmitCookie',
  SYNCHRONIZER_TOKEN: 'synchronizerToken',
  SAMESITE_COOKIE: 'sameSiteCookie',
}

const REQUEST_TYPES = {
  LEGITIMATE: 'legitimate',
  CSRF: 'csrf',
}

const SAME_SITE_VALUES = {
  STRICT: 'Strict',
  LAX: 'Lax',
  NONE: 'None',
}

const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
}

function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length]
  }
  return result
}

function compareTokens(token1, token2) {
  if (!token1 || !token2) return false
  if (token1.length !== token2.length) return false
  let result = 0
  for (let i = 0; i < token1.length; i++) {
    result |= token1.charCodeAt(i) ^ token2.charCodeAt(i)
  }
  return result === 0
}

function validateDoubleSubmitCookie(cookieToken, requestToken, options = {}) {
  const {
    requireCustomHeader = false,
    customHeaderPresent = false,
  } = options

  if (requireCustomHeader && !customHeaderPresent) {
    return {
      valid: false,
      reason: '缺少自定义请求头',
    }
  }

  if (!cookieToken) {
    return {
      valid: false,
      reason: 'Cookie 中缺少 CSRF Token',
    }
  }

  if (!requestToken) {
    return {
      valid: false,
      reason: '请求中缺少 CSRF Token',
    }
  }

  const valid = compareTokens(cookieToken, requestToken)
  return {
    valid,
    reason: valid ? 'Token 匹配成功' : 'Token 不匹配',
  }
}

function validateSynchronizerToken(sessionToken, requestToken, options = {}) {
  const {
    requireCustomHeader = false,
    customHeaderPresent = false,
  } = options

  if (requireCustomHeader && !customHeaderPresent) {
    return {
      valid: false,
      reason: '缺少自定义请求头',
    }
  }

  if (!sessionToken) {
    return {
      valid: false,
      reason: '会话中缺少 CSRF Token',
    }
  }

  if (!requestToken) {
    return {
      valid: false,
      reason: '请求中缺少 CSRF Token',
    }
  }

  const valid = compareTokens(sessionToken, requestToken)
  return {
    valid,
    reason: valid ? 'Token 匹配成功' : 'Token 不匹配',
  }
}

function shouldSendSameSiteCookie(sameSite, requestType, isTopLevelNavigation = false, method = 'POST') {
  const isCrossSite = requestType === REQUEST_TYPES.CSRF

  switch (sameSite) {
    case SAME_SITE_VALUES.STRICT:
      return !isCrossSite

    case SAME_SITE_VALUES.LAX:
      if (!isCrossSite) return true
      if (isTopLevelNavigation && method === HTTP_METHODS.GET) return true
      return false

    case SAME_SITE_VALUES.NONE:
      return true

    default:
      return true
  }
}

function validateSameSiteCookie(sameSite, requestType, cookieSent, options = {}) {
  const {
    isTopLevelNavigation = false,
    method = 'POST',
  } = options

  const shouldSend = shouldSendSameSiteCookie(sameSite, requestType, isTopLevelNavigation, method)

  if (shouldSend && !cookieSent) {
    return {
      valid: false,
      reason: 'Cookie 未发送，认证失败',
    }
  }

  if (!shouldSend && cookieSent) {
    return {
      valid: false,
      reason: 'SameSite 规则异常：跨站请求不应携带 Cookie',
    }
  }

  if (!shouldSend && !cookieSent) {
    return {
      valid: true,
      reason: `SameSite=${sameSite} 阻止了跨站 Cookie，防护成功`,
      protected: true,
    }
  }

  return {
    valid: true,
    reason: 'Cookie 正常发送',
  }
}

function extractOrigin(url) {
  if (!url) return null
  try {
    const urlObj = new URL(url)
    return urlObj.origin
  } catch {
    return null
  }
}

function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return false
  return allowedOrigins.some((allowed) => {
    if (allowed instanceof RegExp) {
      return allowed.test(origin)
    }
    return origin === allowed
  })
}

function validateOrigin(requestOrigin, referer, allowedOrigins, options = {}) {
  const {
    allowMissingReferer = false,
  } = options

  const originToCheck = requestOrigin || extractOrigin(referer)

  if (!originToCheck) {
    if (allowMissingReferer) {
      return {
        valid: true,
        reason: '缺失 Origin/Referer，但配置允许降级通过',
        warning: true,
      }
    }
    return {
      valid: false,
      reason: '缺失 Origin 和 Referer，无法验证请求来源',
    }
  }

  const allowed = isOriginAllowed(originToCheck, allowedOrigins)
  return {
    valid: allowed,
    reason: allowed ? `来源 ${originToCheck} 在白名单中` : `来源 ${originToCheck} 不在白名单中`,
    origin: originToCheck,
  }
}

function evaluateStrategy(strategy, scenario) {
  const {
    requestType,
    cookieToken,
    requestToken,
    sessionToken,
    sameSite,
    cookieSent,
    isTopLevelNavigation,
    method,
    requireCustomHeader,
    customHeaderPresent,
  } = scenario

  switch (strategy) {
    case CSRF_STRATEGIES.DOUBLE_SUBMIT_COOKIE:
      return validateDoubleSubmitCookie(cookieToken, requestToken, {
        requireCustomHeader,
        customHeaderPresent,
      })

    case CSRF_STRATEGIES.SYNCHRONIZER_TOKEN:
      return validateSynchronizerToken(sessionToken, requestToken, {
        requireCustomHeader,
        customHeaderPresent,
      })

    case CSRF_STRATEGIES.SAMESITE_COOKIE:
      return validateSameSiteCookie(sameSite, requestType, cookieSent, {
        isTopLevelNavigation,
        method,
      })

    default:
      return { valid: false, reason: '未知策略' }
  }
}

function generateChecklist(config) {
  const checklist = []

  checklist.push({
    id: 'csrf_token',
    label: '启用 CSRF Token 防护',
    checked: config.useDoubleSubmit || config.useSynchronizerToken,
    severity: 'high',
    description: config.useDoubleSubmit
      ? '已启用 Double Submit Cookie 模式'
      : config.useSynchronizerToken
        ? '已启用 Synchronizer Token 模式'
        : '建议启用 Double Submit Cookie 或 Synchronizer Token',
  })

  checklist.push({
    id: 'samesite',
    label: '设置合理的 SameSite Cookie 属性',
    checked: config.sameSite === SAME_SITE_VALUES.STRICT || config.sameSite === SAME_SITE_VALUES.LAX,
    severity: 'high',
    description: config.sameSite === SAME_SITE_VALUES.STRICT
      ? 'SameSite=Strict 提供最强防护'
      : config.sameSite === SAME_SITE_VALUES.LAX
        ? 'SameSite=Lax 提供均衡防护'
        : 'SameSite=None 容易受到 CSRF 攻击',
  })

  checklist.push({
    id: 'secure',
    label: '启用 Secure Cookie 属性',
    checked: config.secure,
    severity: 'medium',
    description: config.secure
      ? 'Cookie 仅通过 HTTPS 传输'
      : '建议启用 Secure 防止 Cookie 被窃听',
  })

  checklist.push({
    id: 'httponly',
    label: '启用 HttpOnly Cookie 属性',
    checked: config.httpOnly,
    severity: 'medium',
    description: config.httpOnly
      ? 'Cookie 无法被 JS 读取，防止 XSS 窃取'
      : '建议启用 HttpOnly 防止 XSS 攻击窃取 Cookie',
  })

  checklist.push({
    id: 'custom_header',
    label: '使用自定义请求头验证',
    checked: config.requireCustomHeader,
    severity: 'medium',
    description: config.requireCustomHeader
      ? '自定义请求头提供额外防护层'
      : '考虑添加自定义请求头（如 X-CSRF-Token）',
  })

  checklist.push({
    id: 'origin_check',
    label: '启用 Origin/Referer 校验',
    checked: config.checkOrigin,
    severity: 'medium',
    description: config.checkOrigin
      ? 'Origin/Referer 校验可防御跨站请求'
      : '建议启用 Origin/Referer 白名单校验',
  })

  checklist.push({
    id: 'cors_config',
    label: 'CORS 配置正确',
    checked: config.corsCorrect,
    severity: 'high',
    description: config.corsCorrect
      ? 'CORS 配置正确，不会误放行危险请求'
      : '检查 CORS 配置，避免 Access-Control-Allow-Origin: *',
  })

  return checklist
}

function checklistToMarkdown(checklist, config) {
  let markdown = '# CSRF 防护配置 Checklist\n\n'
  markdown += `生成时间：${new Date().toLocaleString()}\n\n`
  markdown += '## 当前配置\n\n'
  markdown += `- Token 策略：${config.useDoubleSubmit ? 'Double Submit Cookie' : config.useSynchronizerToken ? 'Synchronizer Token' : '未启用'}\n`
  markdown += `- SameSite：${config.sameSite || '未设置'}\n`
  markdown += `- Secure：${config.secure ? '是' : '否'}\n`
  markdown += `- HttpOnly：${config.httpOnly ? '是' : '否'}\n`
  markdown += `- 自定义请求头：${config.requireCustomHeader ? '是' : '否'}\n`
  markdown += `- Origin 校验：${config.checkOrigin ? '是' : '否'}\n\n`
  markdown += '## 检查项\n\n'

  const severityMap = { high: '🔴 高', medium: '🟡 中', low: '🟢 低' }

  checklist.forEach((item) => {
    const status = item.checked ? '✅' : '❌'
    markdown += `### ${status} ${item.label}\n\n`
    markdown += `- 严重程度：${severityMap[item.severity] || item.severity}\n`
    markdown += `- 说明：${item.description}\n\n`
  })

  const passed = checklist.filter((item) => item.checked).length
  const total = checklist.length
  const score = Math.round((passed / total) * 100)

  markdown += '## 评分\n\n'
  markdown += `总分：${score}/100 (${passed}/${total} 通过)\n\n`

  if (score < 60) {
    markdown += '⚠️ **建议立即改进 CSRF 防护配置**\n'
  } else if (score < 80) {
    markdown += '📝 **建议逐步优化防护配置**\n'
  } else {
    markdown += '✅ **CSRF 防护配置良好**\n'
  }

  return markdown
}

const PRESET_SCENARIOS = {
  legitimateDoubleSubmit: {
    name: '合法请求 - Double Submit Cookie',
    strategy: CSRF_STRATEGIES.DOUBLE_SUBMIT_COOKIE,
    requestType: REQUEST_TYPES.LEGITIMATE,
    cookieToken: 'abc123xyz789',
    requestToken: 'abc123xyz789',
    sameSite: SAME_SITE_VALUES.LAX,
    cookieSent: true,
    requireCustomHeader: false,
    customHeaderPresent: false,
  },
  csrfDoubleSubmit: {
    name: '跨站伪造 - Double Submit Cookie',
    strategy: CSRF_STRATEGIES.DOUBLE_SUBMIT_COOKIE,
    requestType: REQUEST_TYPES.CSRF,
    cookieToken: 'abc123xyz789',
    requestToken: '',
    sameSite: SAME_SITE_VALUES.LAX,
    cookieSent: true,
    requireCustomHeader: false,
    customHeaderPresent: false,
  },
  legitimateSynchronizer: {
    name: '合法请求 - Synchronizer Token',
    strategy: CSRF_STRATEGIES.SYNCHRONIZER_TOKEN,
    requestType: REQUEST_TYPES.LEGITIMATE,
    sessionToken: 'session_token_123',
    requestToken: 'session_token_123',
    sameSite: SAME_SITE_VALUES.LAX,
    cookieSent: true,
    requireCustomHeader: false,
    customHeaderPresent: false,
  },
  csrfSynchronizer: {
    name: '跨站伪造 - Synchronizer Token',
    strategy: CSRF_STRATEGIES.SYNCHRONIZER_TOKEN,
    requestType: REQUEST_TYPES.CSRF,
    sessionToken: 'session_token_123',
    requestToken: '',
    sameSite: SAME_SITE_VALUES.LAX,
    cookieSent: true,
    requireCustomHeader: false,
    customHeaderPresent: false,
  },
  legitimateSameSiteStrict: {
    name: '合法请求 - SameSite=Strict',
    strategy: CSRF_STRATEGIES.SAMESITE_COOKIE,
    requestType: REQUEST_TYPES.LEGITIMATE,
    sameSite: SAME_SITE_VALUES.STRICT,
    cookieSent: true,
    method: 'POST',
    isTopLevelNavigation: false,
  },
  csrfSameSiteStrict: {
    name: '跨站伪造 - SameSite=Strict',
    strategy: CSRF_STRATEGIES.SAMESITE_COOKIE,
    requestType: REQUEST_TYPES.CSRF,
    sameSite: SAME_SITE_VALUES.STRICT,
    cookieSent: false,
    method: 'POST',
    isTopLevelNavigation: false,
  },
}

export {
  CSRF_STRATEGIES,
  REQUEST_TYPES,
  SAME_SITE_VALUES,
  HTTP_METHODS,
  generateToken,
  compareTokens,
  validateDoubleSubmitCookie,
  validateSynchronizerToken,
  shouldSendSameSiteCookie,
  validateSameSiteCookie,
  extractOrigin,
  isOriginAllowed,
  validateOrigin,
  evaluateStrategy,
  generateChecklist,
  checklistToMarkdown,
  PRESET_SCENARIOS,
}
