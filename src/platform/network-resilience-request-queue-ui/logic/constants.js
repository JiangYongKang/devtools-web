const NETWORK_STATES = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  DEGRADED: 'Degraded',
}

const REQUEST_STATES = {
  PENDING: 'pending',
  QUEUED: 'queued',
  RUNNING: 'running',
  RETRYING: 'retrying',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

const ERROR_CODES = {
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  NETWORK_ERROR: 'NETWORK_ERROR',
  QUEUE_FULL: 'QUEUE_FULL',
  STORAGE_ERROR: 'STORAGE_ERROR',
  PERSISTENCE_SIZE_EXCEEDED: 'PERSISTENCE_SIZE_EXCEEDED',
  OBSERVATION_FAILED: 'OBSERVATION_FAILED',
}

const DEFAULT_OPTIONS = {
  healthCheckUrl: '',
  healthCheckIntervalMs: 30000,
  healthCheckTimeoutMs: 5000,
  degradedRttThresholdMs: 1000,
  maxQueueSize: 100,
  maxConcurrency: 3,
  defaultPriority: 5,
  enablePersistence: false,
  persistenceKey: 'network_queue_snapshot',
  maxPersistenceSizeBytes: 500 * 1024,
  retryOnWifiOnly: false,
  sensitiveHeaders: ['authorization', 'cookie', 'x-auth-token'],
  backoff: {
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    factor: 2,
    jitterRatio: 0.5,
    maxRetries: 5,
  },
}

const STORAGE_KEYS = {
  QUEUE_SNAPSHOT: 'network_queue_snapshot',
}

export {
  NETWORK_STATES,
  REQUEST_STATES,
  ERROR_CODES,
  DEFAULT_OPTIONS,
  STORAGE_KEYS,
}
