import { SOURCES, ERROR_CODES } from './constants.js'
import { createError } from './errors.js'
import {
  compareVersions,
  deepClone,
  validatePayload,
  isExpired,
} from './utils.js'

const SOURCE_PRIORITY = {
  [SOURCES.REMOTE]: 3,
  [SOURCES.STATIC]: 2,
  [SOURCES.DEFAULT]: 1,
}

function normalizeFlags(flags) {
  if (!flags) {
    return []
  }

  if (Array.isArray(flags)) {
    return flags.map((flag, index) => {
      if (typeof flag === 'object' && flag !== null) {
        return flag
      }
      return {
        key: `flag_${index}`,
        value: flag,
        source: SOURCES.DEFAULT,
      }
    })
  }

  if (typeof flags === 'object') {
    return Object.entries(flags).map(([key, value]) => {
      if (typeof value === 'object' && value !== null && 'value' in value) {
        return {
          key,
          ...value,
        }
      }
      return {
        key,
        value,
        source: SOURCES.DEFAULT,
      }
    })
  }

  return []
}

function shouldUseFlag(flag) {
  if (!flag || !flag.key) {
    return false
  }

  if (flag.expiresAt && isExpired(flag.expiresAt)) {
    return false
  }

  return true
}

function getSourcePriority(source) {
  return SOURCE_PRIORITY[source] || 0
}

function resolveConflict(existing, incoming, timestamp) {
  const existingVersion = existing?.version
  const incomingVersion = incoming?.version

  const versionComparison = compareVersions(incomingVersion, existingVersion)

  if (versionComparison > 0) {
    return {
      winner: incoming,
      reason: 'version_newer',
      timestamp,
    }
  }

  if (versionComparison === 0) {
    const incomingPriority = getSourcePriority(incoming?.source)
    const existingPriority = getSourcePriority(existing?.source)

    if (incomingPriority > existingPriority) {
      return {
        winner: incoming,
        reason: 'source_priority',
        timestamp,
      }
    }

    return {
      winner: existing,
      reason: 'source_priority',
      timestamp,
    }
  }

  return {
    winner: existing,
    reason: 'version_older',
    timestamp,
  }
}

function validateFlag(flag) {
  if (!flag || typeof flag !== 'object') {
    return {
      valid: false,
      error: createError(ERROR_CODES.INVALID_CONFIG, 'Flag must be an object'),
    }
  }

  if (!flag.key || typeof flag.key !== 'string') {
    return {
      valid: false,
      error: createError(ERROR_CODES.INVALID_CONFIG, 'Flag must have a string key'),
    }
  }

  if (flag.value === undefined) {
    return {
      valid: false,
      error: createError(ERROR_CODES.INVALID_CONFIG, 'Flag must have a value'),
    }
  }

  if (flag.payload !== undefined) {
    const payloadValidation = validatePayload(flag.payload)
    if (!payloadValidation.valid) {
      return payloadValidation
    }
  }

  return { valid: true }
}

function filterByEnvironmentAndCohort(flags, environment, cohort) {
  return flags.filter((flag) => {
    if (flag.environment && flag.environment !== environment) {
      return false
    }

    if (flag.cohort && flag.cohort !== cohort) {
      return false
    }

    return true
  })
}

function createAuditEntry(existing, incoming, resolution, flagKey) {
  return Object.freeze({
    key: flagKey,
    existing: existing
      ? {
          value: existing.value,
          source: existing.source,
          version: existing.version,
        }
      : null,
    incoming: incoming
      ? {
          value: incoming.value,
          source: incoming.source,
          version: incoming.version,
        }
      : null,
    winner: resolution.winner
      ? {
          value: resolution.winner.value,
          source: resolution.winner.source,
          version: resolution.winner.version,
        }
      : null,
    reason: resolution.reason,
    timestamp: resolution.timestamp,
  })
}

function mergeConfigs(configs, options = {}) {
  const { environment, cohort } = options
  const timestamp = Date.now()
  const mergedFlags = new Map()
  const audit = []
  const errors = []

  for (const config of configs) {
    if (!config) continue

    let flags = []
    try {
      flags = normalizeFlags(config.flags)
    } catch (e) {
      errors.push(createError(ERROR_CODES.INVALID_JSON, 'Failed to parse flags', { source: config.source }))
      continue
    }

    const filteredFlags = filterByEnvironmentAndCohort(flags, environment, cohort)

    for (const flag of filteredFlags) {
      if (!shouldUseFlag(flag)) {
        if (flag?.key && flag?.expiresAt) {
          errors.push(createError(ERROR_CODES.CONFIG_EXPIRED, `Flag ${flag.key} has expired`, { key: flag.key }))
        }
        continue
      }

      const validation = validateFlag(flag)
      if (!validation.valid) {
        errors.push(validation.error)
        continue
      }

      const flagWithSource = {
        ...flag,
        source: flag.source || config.source || SOURCES.DEFAULT,
      }

      const existingFlag = mergedFlags.get(flagWithSource.key)

      if (existingFlag) {
        const resolution = resolveConflict(existingFlag, flagWithSource, timestamp)
        const auditEntry = createAuditEntry(
          existingFlag,
          flagWithSource,
          resolution,
          flagWithSource.key
        )
        audit.push(auditEntry)

        if (resolution.winner !== existingFlag) {
          mergedFlags.set(flagWithSource.key, deepClone(resolution.winner))
        }
      } else {
        mergedFlags.set(flagWithSource.key, deepClone(flagWithSource))
      }
    }
  }

  const snapshot = {}
  const flagsArray = []

  for (const [key, flag] of mergedFlags.entries()) {
    snapshot[key] = {
      ...flag,
      key,
    }
    flagsArray.push({
      ...flag,
      key,
    })
  }

  return Object.freeze({
    snapshot,
    flags: flagsArray,
    audit: Object.freeze([...audit]),
    errors: Object.freeze([...errors]),
    mergedAt: timestamp,
    environment,
    cohort,
  })
}

function applyMergeRules(configs, rules = []) {
  const sourceOrder = [SOURCES.DEFAULT, SOURCES.STATIC, SOURCES.REMOTE]
  return [...configs].sort((a, b) => {
    const aOrder = sourceOrder.indexOf(a?.source || SOURCES.DEFAULT)
    const bOrder = sourceOrder.indexOf(b?.source || SOURCES.DEFAULT)
    return aOrder - bOrder
  })
}

function createDefaultRules(environment, cohort) {
  return [
    {
      type: 'environment_filter',
      environment,
    },
    {
      type: 'cohort_filter',
      cohort,
    },
    {
      type: 'merge_order',
      order: [SOURCES.DEFAULT, SOURCES.STATIC, SOURCES.REMOTE],
    },
    {
      type: 'conflict_resolution',
      strategy: 'version_then_source',
    },
  ]
}

export {
  normalizeFlags,
  shouldUseFlag,
  getSourcePriority,
  resolveConflict,
  validateFlag,
  filterByEnvironmentAndCohort,
  createAuditEntry,
  mergeConfigs,
  applyMergeRules,
  createDefaultRules,
}
