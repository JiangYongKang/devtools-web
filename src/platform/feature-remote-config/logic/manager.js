import {
    DEFAULT_REFRESH_INTERVAL_MS,
    DEFAULT_TIMEOUT_MS,
    ENVIRONMENTS,
    ERROR_CODES,
    EXPONENTIAL_BACKOFF,
    SOURCES,
} from './constants.js'
import { fetchRemoteConfig, hasFetch } from './fetcher.js'
import { applyMergeRules, createDefaultRules, mergeConfigs } from './merge.js'
import { deepClone, redactSensitiveData } from './utils.js'

function calculateBackoffDelay(attempt, options = {}) {
  const {
    initialDelay = EXPONENTIAL_BACKOFF.INITIAL_DELAY_MS,
    maxDelay = EXPONENTIAL_BACKOFF.MAX_DELAY_MS,
    multiplier = EXPONENTIAL_BACKOFF.MULTIPLIER,
    jitterFactor = EXPONENTIAL_BACKOFF.JITTER_FACTOR,
  } = options

  const exponentialDelay = Math.min(initialDelay * Math.pow(multiplier, attempt), maxDelay)
  const jitter = exponentialDelay * jitterFactor * (Math.random() * 2 - 1)
  return Math.max(0, exponentialDelay + jitter)
}

class FeatureConfigManager {
  constructor(options = {}) {
    this.options = {
      environment: ENVIRONMENTS.DEV,
      cohort: 'default',
      staticConfig: null,
      defaultConfig: null,
      refreshIntervalMs: DEFAULT_REFRESH_INTERVAL_MS,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      baseURL: '',
      apiPath: '/api/devtools/config',
      ...options,
    }

    this.currentSnapshot = null
    this.lastSuccessfulSnapshot = null
    this.etag = null
    this.isOnline = typeof navigator !== 'undefined' && navigator.onLine !== undefined
      ? navigator.onLine
      : true

    this.refreshTimer = null
    this.refreshCountdownTimer = null
    this.nextRefreshAt = null
    this.backoffAttempt = 0
    this.lastFetchError = null

    this.abortController = null

    this.listeners = new Set()

    if (typeof navigator !== 'undefined' && typeof window !== 'undefined') {
      window.addEventListener('online', this._handleOnline.bind(this))
      window.addEventListener('offline', this._handleOffline.bind(this))
    }
  }

  async initialize() {
    const configs = []

    if (this.options.defaultConfig) {
      configs.push({
        ...this.options.defaultConfig,
        source: SOURCES.DEFAULT,
      })
    }

    if (this.options.staticConfig) {
      configs.push({
        ...this.options.staticConfig,
        source: SOURCES.STATIC,
      })
    }

    const mergeOptions = {
      environment: this.options.environment,
      cohort: this.options.cohort,
    }

    const rules = createDefaultRules(this.options.environment, this.options.cohort)
    const orderedConfigs = applyMergeRules(configs, rules)
    const initialSnapshot = mergeConfigs(orderedConfigs, mergeOptions)

    this.currentSnapshot = initialSnapshot
    this.lastSuccessfulSnapshot = initialSnapshot

    if (hasFetch()) {
      await this.refresh(true)
    }

    this._startRefreshTimer()
    return this.getSnapshot()
  }

  async refresh(force = false) {
    if (!hasFetch()) {
      this.lastFetchError = ERROR_CODES.SSR_NO_FETCH
      return this.currentSnapshot
    }

    if (this.abortController) {
      this.abortController.abort()
    }

    this.abortController = new AbortController()

    try {
      const result = await fetchRemoteConfig({
        baseURL: this.options.baseURL,
        apiPath: this.options.apiPath,
        timeout: this.options.timeoutMs,
        etag: force ? null : this.etag,
        abortController: this.abortController,
      })

      if (result.notModified) {
        this._resetBackoff()
        this._scheduleNextRefresh()
        this._notifyListeners('not-modified', { etag: result.etag })
        return this.currentSnapshot
      }

      if (result.isEmpty || !result.data) {
        this._resetBackoff()
        this._scheduleNextRefresh()
        this._notifyListeners('empty', {})
        return this.currentSnapshot
      }

      const configs = []

      if (this.options.defaultConfig) {
        configs.push({
          ...this.options.defaultConfig,
          source: SOURCES.DEFAULT,
        })
      }

      if (this.options.staticConfig) {
        configs.push({
          ...this.options.staticConfig,
          source: SOURCES.STATIC,
        })
      }

      configs.push(result.data)

      const mergeOptions = {
        environment: this.options.environment,
        cohort: this.options.cohort,
      }

      const rules = createDefaultRules(this.options.environment, this.options.cohort)
      const orderedConfigs = applyMergeRules(configs, rules)
      const newSnapshot = mergeConfigs(orderedConfigs, mergeOptions)

      this.currentSnapshot = newSnapshot
      this.lastSuccessfulSnapshot = newSnapshot
      this.etag = result.etag

      this._resetBackoff()
      this._scheduleNextRefresh()
      this._notifyListeners('refreshed', { snapshot: newSnapshot })

      return newSnapshot
    } catch (error) {
      this.lastFetchError = error

      if (this.currentSnapshot === null) {
        this.currentSnapshot = this.lastSuccessfulSnapshot
      }

      if (this.isOnline) {
        this._incrementBackoff()
        const delay = calculateBackoffDelay(this.backoffAttempt)
        this._scheduleBackoffRefresh(delay)
      }

      this._notifyListeners('error', { error })
      throw error
    } finally {
      this.abortController = null
    }
  }

  async forceRefresh() {
    return this.refresh(true)
  }

  getSnapshot() {
    if (!this.currentSnapshot) {
      return {
        snapshot: {},
        flags: [],
        audit: [],
        errors: [],
        mergedAt: 0,
        environment: this.options.environment,
        cohort: this.options.cohort,
      }
    }
    return this.currentSnapshot
  }

  getFlag(key) {
    const snapshot = this.getSnapshot()
    return snapshot.snapshot[key] || null
  }

  getFlagValue(key, defaultValue = null) {
    const flag = this.getFlag(key)
    return flag ? flag.value : defaultValue
  }

  exportSnapshot(redact = true) {
    const snapshot = this.getSnapshot()
    const exportData = deepClone(snapshot)

    if (redact) {
      return {
        ...exportData,
        snapshot: redactSensitiveData(exportData.snapshot),
        flags: exportData.flags.map((flag) => ({
          ...flag,
          payload: flag.payload ? redactSensitiveData(flag.payload) : undefined,
        })),
      }
    }

    return exportData
  }

  getLastError() {
    return this.lastFetchError
  }

  getRefreshState() {
    return {
      isOnline: this.isOnline,
      nextRefreshAt: this.nextRefreshAt,
      backoffAttempt: this.backoffAttempt,
      lastFetchError: this.lastFetchError,
      hasLastSuccessfulSnapshot: this.lastSuccessfulSnapshot !== null,
    }
  }

  addListener(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  setEnvironment(environment) {
    this.options.environment = environment
    return this.refresh(true)
  }

  setCohort(cohort) {
    this.options.cohort = cohort
    return this.refresh(true)
  }

  destroy() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }

    if (this.refreshCountdownTimer) {
      clearInterval(this.refreshCountdownTimer)
      this.refreshCountdownTimer = null
    }

    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    if (typeof navigator !== 'undefined' && typeof window !== 'undefined') {
      window.removeEventListener('online', this._handleOnline.bind(this))
      window.removeEventListener('offline', this._handleOffline.bind(this))
    }

    this.listeners.clear()
  }

  _handleOnline() {
    this.isOnline = true
    this._notifyListeners('online', {})
    if (this.lastFetchError) {
      this.refresh(false)
    }
  }

  _handleOffline() {
    this.isOnline = false
    this._notifyListeners('offline', {})
  }

  _startRefreshTimer() {
    this._scheduleNextRefresh()
  }

  _scheduleNextRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    const interval = this.options.refreshIntervalMs
    this.nextRefreshAt = Date.now() + interval

    this.refreshTimer = setTimeout(() => {
      this.refresh(false)
    }, interval)
  }

  _scheduleBackoffRefresh(delay) {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    this.nextRefreshAt = Date.now() + delay

    this.refreshTimer = setTimeout(() => {
      this.refresh(false)
    }, delay)
  }

  _resetBackoff() {
    this.backoffAttempt = 0
    this.lastFetchError = null
  }

  _incrementBackoff() {
    this.backoffAttempt = Math.min(
      this.backoffAttempt + 1,
      EXPONENTIAL_BACKOFF.MAX_ATTEMPTS
    )
  }

  _notifyListeners(event, payload) {
    for (const listener of this.listeners) {
      try {
        listener(event, payload)
      } catch (e) {
        console.error('Listener error:', e)
      }
    }
  }
}

function createFeatureConfigManager(options = {}) {
  return new FeatureConfigManager(options)
}

export {
    calculateBackoffDelay, createFeatureConfigManager, FeatureConfigManager
}

