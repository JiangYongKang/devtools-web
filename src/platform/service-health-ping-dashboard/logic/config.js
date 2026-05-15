
import {
  DEFAULT_PROBE_OPTIONS,
  ALLOWED_PROTOCOLS,
  FORBIDDEN_PROTOCOLS,
  HTTP_METHODS,
} from './constants.js'
import { createError, ERROR_CODES } from './errors.js'

export function validateTargetUrl(url, insecureDevOk = false) {
  if (!url || typeof url !== 'string') {
    return {
      valid: false,
      error: 'URL is required',
    }
  }

  try {
    const urlObj = new URL(url)

    if (FORBIDDEN_PROTOCOLS.includes(urlObj.protocol)) {
      return {
        valid: false,
        error: `Protocol ${urlObj.protocol} is not allowed`,
      }
    }

    if (!ALLOWED_PROTOCOLS.includes(urlObj.protocol) && !insecureDevOk) {
      return {
        valid: false,
        error: `Protocol ${urlObj.protocol} is not allowed. Use http: or https:.`,
      }
    }

    return {
      valid: true,
      url: urlObj.toString(),
    }
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format',
    }
  }
}

export function validateProbeConfig(config, insecureDevOk = false) {
  const errors = []

  if (!config || typeof config !== 'object') {
    errors.push('Config must be an object')
    return { valid: false, errors }
  }

  const urlValidation = validateTargetUrl(config.url, insecureDevOk)
  if (!urlValidation.valid) {
    errors.push(urlValidation.error)
  }

  if (config.method && !HTTP_METHODS.includes(config.method)) {
    errors.push(`Invalid HTTP method. Allowed: ${HTTP_METHODS.join(', ')}`)
  }

  if (config.expectedStatus) {
    if (!Array.isArray(config.expectedStatus)) {
      errors.push('expectedStatus must be an array of numbers')
    } else if (config.expectedStatus.some((s) => typeof s !== 'number' || s < 100 || s > 599)) {
      errors.push('expectedStatus contains invalid HTTP status codes')
    }
  }

  if (config.maxLatencyMs != null && (typeof config.maxLatencyMs !== 'number' || config.maxLatencyMs < 0)) {
    errors.push('maxLatencyMs must be a positive number')
  }

  if (config.timeoutMs != null && (typeof config.timeoutMs !== 'number' || config.timeoutMs < 100)) {
    errors.push('timeoutMs must be at least 100ms')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function createDefaultTarget(overrides = {}) {
  const id = `target_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  return {
    id,
    name: 'New Target',
    url: 'https://example.com',
    method: DEFAULT_PROBE_OPTIONS.method,
    expectedStatus: [...DEFAULT_PROBE_OPTIONS.expectedStatus],
    maxLatencyMs: DEFAULT_PROBE_OPTIONS.maxLatencyMs,
    timeoutMs: DEFAULT_PROBE_OPTIONS.timeoutMs,
    insecureDevOk: false,
    group: null,
    tags: [],
    enabled: true,
    ...overrides,
  }
}

export function exportConfig(targets, options = {}) {
  const config = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    targets: targets.map((target) => ({
      id: target.id,
      name: target.name,
      url: target.url,
      method: target.method,
      expectedStatus: target.expectedStatus,
      maxLatencyMs: target.maxLatencyMs,
      timeoutMs: target.timeoutMs,
      insecureDevOk: target.insecureDevOk || false,
      group: target.group,
      tags: target.tags || [],
      enabled: target.enabled !== false,
    })),
    metadata: options.metadata || {},
  }

  if (options.format === 'json') {
    return JSON.stringify(config, null, 2)
  }

  return config
}

export function importConfig(data, options = {}) {
  let config

  try {
    if (typeof data === 'string') {
      config = JSON.parse(data)
    } else {
      config = data
    }
  } catch (error) {
    throw createError(ERROR_CODES.INVALID_CONFIG, 'Invalid JSON format', { originalError: error.message })
  }

  if (!config || !Array.isArray(config.targets)) {
    throw createError(ERROR_CODES.INVALID_CONFIG, 'Config must contain a targets array')
  }

  const validatedTargets = config.targets.map((target, index) => {
    const validation = validateProbeConfig(target, options.insecureDevOk)
    if (!validation.valid) {
      throw createError(
        ERROR_CODES.INVALID_CONFIG,
        `Target at index ${index} is invalid: ${validation.errors.join(', ')}`,
        { targetIndex: index, errors: validation.errors }
      )
    }

    return {
      ...createDefaultTarget(),
      ...target,
      id: target.id || `imported_${Date.now()}_${index}`,
    }
  })

  return {
    version: config.version || '1.0',
    importedAt: new Date().toISOString(),
    targets: validatedTargets,
    metadata: config.metadata || {},
  }
}

export function filterTargetsByGroup(targets, groupName) {
  if (!groupName) {
    return targets.filter((t) => !t.group)
  }
  return targets.filter((t) => t.group === groupName)
}

export function filterTargetsByTag(targets, tag) {
  if (!tag) {
    return targets
  }
  return targets.filter((t) => t.tags && t.tags.includes(tag))
}

export function getAllGroups(targets) {
  const groups = new Set()
  targets.forEach((t) => {
    if (t.group) {
      groups.add(t.group)
    }
  })
  return Array.from(groups).sort()
}

export function getAllTags(targets) {
  const tags = new Set()
  targets.forEach((t) => {
    if (t.tags && Array.isArray(t.tags)) {
      t.tags.forEach((tag) => tags.add(tag))
    }
  })
  return Array.from(tags).sort()
}
