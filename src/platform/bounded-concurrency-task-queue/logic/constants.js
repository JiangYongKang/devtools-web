export const VERSION = '1.0.0'

export const OVERFLOW_STRATEGIES = {
  BLOCK: 'block',
  DROP_OLDEST: 'drop-oldest',
  REJECT: 'reject',
}

export const EXAMPLE_TASK_PRESETS = {
  cpuHeavy: {
    name: 'CPU 密集型任务',
    description: '质数筛选、矩阵乘法等',
  },
  ioHeavy: {
    name: 'IO 密集型任务',
    description: '模拟网络请求',
  },
  mixed: {
    name: '混合任务',
    description: 'CPU 和 IO 任务混合',
  },
}

export const ERROR_CODES = {
  POOL_CLOSED: 'POOL_CLOSED',
  QUEUE_FULL: 'QUEUE_FULL',
  TASK_CANCELLED: 'TASK_CANCELLED',
  TASK_TIMEOUT: 'TASK_TIMEOUT',
  INVALID_TASK: 'INVALID_TASK',
  WORKER_ERROR: 'WORKER_ERROR',
  FAIR_RATE_LIMIT_EXCEEDED: 'FAIR_RATE_LIMIT_EXCEEDED',
}

export const ERROR_MESSAGES = {
  [ERROR_CODES.POOL_CLOSED]: 'Pool is closed',
  [ERROR_CODES.QUEUE_FULL]: 'Queue is full',
  [ERROR_CODES.TASK_CANCELLED]: 'Task was cancelled',
  [ERROR_CODES.TASK_TIMEOUT]: 'Task timed out',
  [ERROR_CODES.INVALID_TASK]: 'Invalid task: must be a function',
  [ERROR_CODES.WORKER_ERROR]: 'Worker error occurred',
  [ERROR_CODES.FAIR_RATE_LIMIT_EXCEEDED]: 'Fair rate limit exceeded for source',
}

export const DEFAULT_POOL_OPTIONS = {
  concurrency: 4,
  taskTimeout: null,
  maxQueueSize: 100,
  overflowStrategy: OVERFLOW_STRATEGIES.BLOCK,
  fairRateLimit: null,
  fairRateLimitWindow: 1000,
  fairRateLimitPerSource: 10,
}

export const TASK_STATES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout',
  DROPPED: 'dropped',
}

export const EVENT_TYPES = {
  TASK_ENQUEUED: 'task:enqueued',
  TASK_STARTED: 'task:started',
  TASK_COMPLETED: 'task:completed',
  TASK_FAILED: 'task:failed',
  TASK_CANCELLED: 'task:cancelled',
  TASK_TIMEOUT: 'task:timeout',
  TASK_DROPPED: 'task:dropped',
  POOL_RESIZED: 'pool:resized',
  POOL_DRAINED: 'pool:drained',
  QUEUE_OVERFLOW: 'queue:overflow',
}
