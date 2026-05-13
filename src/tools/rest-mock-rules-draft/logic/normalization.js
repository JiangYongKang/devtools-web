import {
  DEFAULT_DELAY_MS,
  DEFAULT_STATUS_CODE,
  DEFAULT_PROBABILITY,
  PATH_MATCH_TYPES,
  HTTP_METHODS,
} from './constants.js'

export function generateId() {
  return 'rule_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9)
}

export function normalizeRule(rule, index = 0) {
  if (!rule || typeof rule !== 'object') {
    return createDefaultRule(index)
  }

  const normalized = {
    id: rule.id || generateId(),
    name: typeof rule.name === 'string' ? rule.name.trim() : '',
    path: typeof rule.path === 'string' ? rule.path.trim() : '/',
    pathMatchType:
      rule.pathMatchType && Object.values(PATH_MATCH_TYPES).includes(rule.pathMatchType)
        ? rule.pathMatchType
        : PATH_MATCH_TYPES.EXACT,
    methods: Array.isArray(rule.methods)
      ? rule.methods
          .filter((m) => typeof m === 'string' && HTTP_METHODS.includes(m.toUpperCase()))
          .map((m) => m.toUpperCase())
      : ['GET'],
    statusCode:
      typeof rule.statusCode === 'number' && Number.isInteger(rule.statusCode)
        ? rule.statusCode
        : DEFAULT_STATUS_CODE,
    headers:
      rule.headers && typeof rule.headers === 'object' && !Array.isArray(rule.headers)
        ? Object.fromEntries(
            Object.entries(rule.headers).filter(
              ([k, v]) => typeof k === 'string' && k.trim() && typeof v === 'string'
            )
          )
        : {},
    body: rule.body !== undefined ? rule.body : '',
    bodyType: rule.bodyType === 'raw' ? 'raw' : 'json',
    delayMs:
      typeof rule.delayMs === 'number' && Number.isInteger(rule.delayMs) && rule.delayMs >= 0
        ? rule.delayMs
        : DEFAULT_DELAY_MS,
    probability:
      typeof rule.probability === 'number' &&
      Number.isInteger(rule.probability) &&
      rule.probability >= 1 &&
      rule.probability <= 100
        ? rule.probability
        : DEFAULT_PROBABILITY,
    corsTemplate:
      typeof rule.corsTemplate === 'string' && rule.corsTemplate.trim() ? rule.corsTemplate : null,
    tags: Array.isArray(rule.tags)
      ? rule.tags.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim())
      : [],
    priority:
      typeof rule.priority === 'number' && Number.isInteger(rule.priority) ? rule.priority : index,
  }

  if (normalized.methods.length === 0) {
    normalized.methods = ['GET']
  }

  return normalized
}

export function normalizeRules(rules) {
  if (!Array.isArray(rules)) return []
  return rules.map((rule, index) => normalizeRule(rule, index))
}

export function normalizeDraft(draft) {
  if (!draft || typeof draft !== 'object') {
    return createEmptyDraft()
  }

  const now = Date.now()

  return {
    rules: normalizeRules(draft.rules),
    metadata: {
      createdAt: draft.metadata?.createdAt || now,
      updatedAt: now,
      version: '1.0.0',
    },
  }
}

export function createDefaultRule(index = 0) {
  return {
    id: generateId(),
    name: '',
    path: '/',
    pathMatchType: PATH_MATCH_TYPES.EXACT,
    methods: ['GET'],
    statusCode: DEFAULT_STATUS_CODE,
    headers: {},
    body: '',
    bodyType: 'json',
    delayMs: DEFAULT_DELAY_MS,
    probability: DEFAULT_PROBABILITY,
    corsTemplate: null,
    tags: [],
    priority: index,
  }
}

export function createEmptyDraft() {
  return {
    rules: [],
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: '1.0.0',
    },
  }
}

export function reorderRules(rules, fromIndex, toIndex) {
  if (!Array.isArray(rules) || rules.length === 0) return rules
  if (fromIndex < 0 || fromIndex >= rules.length) return rules
  if (toIndex < 0 || toIndex >= rules.length) return rules

  const result = [...rules]
  const [removed] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, removed)

  return result.map((rule, index) => ({
    ...rule,
    priority: index,
  }))
}
