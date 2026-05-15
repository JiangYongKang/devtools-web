import { SCHEMA_VERSION } from './constants.js'
import { createClockRollbackError, createInvalidParameterError } from './errors.js'

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function createMonotonicClock() {
  let lastTimestamp = now()

  return {
    now() {
      const current = now()
      if (current < lastTimestamp) {
        lastTimestamp = current
        throw createClockRollbackError({ previous: lastTimestamp, current })
      }
      lastTimestamp = current
      return current
    },
    getLastTimestamp() {
      return lastTimestamp
    },
  }
}

function msToSeconds(ms) {
  return Math.ceil(ms / 1000)
}

function secondsToMs(seconds) {
  return seconds * 1000
}

function formatRemainingSeconds(remainingMs) {
  const seconds = Math.max(0, msToSeconds(remainingMs))
  if (seconds < 60) {
    return `${seconds}秒`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (remainingSeconds === 0) {
    return `${minutes}分钟`
  }
  return `${minutes}分${remainingSeconds}秒`
}

function calculateProgress(startTimeMs, endTimeMs, currentTimeMs = null) {
  const current = currentTimeMs ?? now()
  const totalDuration = endTimeMs - startTimeMs
  if (totalDuration <= 0) return 1

  const elapsed = Math.max(0, current - startTimeMs)
  return Math.min(1, elapsed / totalDuration)
}

function calculateRemainingCooldown(startTimeMs, cooldownMs, currentTimeMs = null) {
  const current = currentTimeMs ?? now()
  const endTime = startTimeMs + cooldownMs
  return Math.max(0, endTime - current)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createSnapshot(data) {
  return {
    version: SCHEMA_VERSION,
    timestamp: now(),
    ...data,
  }
}

function validatePositiveNumber(value, paramName) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw createInvalidParameterError(paramName, { value })
  }
  return true
}

function validateConfig(config, defaults) {
  const validated = { ...defaults, ...config }
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (typeof defaultValue === 'number') {
      validatePositiveNumber(validated[key], key)
    }
  }
  return validated
}

function dedupeByKey(array, keyFn) {
  const seen = new Set()
  return array.filter((item) => {
    const key = keyFn(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function isVisibilityHidden() {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
}

function onVisibilityChange(callback) {
  if (typeof document === 'undefined') return () => {}

  const handler = () => callback(document.visibilityState)
  document.addEventListener('visibilitychange', handler)
  return () => document.removeEventListener('visibilitychange', handler)
}

function generateId(prefix = 'otp') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

export {
  calculateProgress,
  calculateRemainingCooldown,
  clamp,
  createMonotonicClock,
  createSnapshot,
  dedupeByKey,
  formatRemainingSeconds,
  generateId,
  isVisibilityHidden,
  msToSeconds,
  now,
  onVisibilityChange,
  safeJsonParse,
  secondsToMs,
  sleep,
  validateConfig,
  validatePositiveNumber,
}
