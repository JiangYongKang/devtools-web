const ALGORITHM_TYPES = {
  EXPONENTIAL: 'exponential',
  LINEAR: 'linear',
}

const JITTER_TYPES = {
  NONE: 'none',
  FULL: 'full',
  EQUAL: 'equal',
}

const UNIT_TYPES = {
  MS: 'ms',
  SECONDS: 's',
}

const PRESETS = {
  HTTP_429: {
    label: 'HTTP 429 建议',
    description: '适用于 HTTP 429 Too Many Requests 重试策略',
    params: {
      algorithm: ALGORITHM_TYPES.EXPONENTIAL,
      initial: 1000,
      multiplier: 2,
      max: 30000,
      maxSteps: 5,
      jitter: JITTER_TYPES.FULL,
      jitterMin: 0.5,
      jitterMax: 1.0,
      alignToSecond: false,
      alignGridMs: 0,
    },
  },
  CLOUD_SDK: {
    label: '云 SDK 默认',
    description: '常见云服务 SDK 推荐参数',
    params: {
      algorithm: ALGORITHM_TYPES.EXPONENTIAL,
      initial: 500,
      multiplier: 1.5,
      max: 60000,
      maxSteps: 10,
      jitter: JITTER_TYPES.EQUAL,
      jitterMin: 0.75,
      jitterMax: 1.25,
      alignToSecond: false,
      alignGridMs: 0,
    },
  },
  CUSTOM_WORKFLOW: {
    label: '自定义工作流',
    description: '自定义参数配置',
    params: {
      algorithm: ALGORITHM_TYPES.EXPONENTIAL,
      initial: 100,
      multiplier: 2,
      max: 10000,
      maxSteps: 8,
      jitter: JITTER_TYPES.NONE,
      jitterMin: 0.5,
      jitterMax: 1.0,
      alignToSecond: false,
      alignGridMs: 0,
    },
  },
}

const DEFAULT_PARAMS = {
  algorithm: ALGORITHM_TYPES.EXPONENTIAL,
  initial: 1000,
  multiplier: 2,
  max: 30000,
  maxSteps: 5,
  jitter: JITTER_TYPES.NONE,
  jitterMin: 0.5,
  jitterMax: 1.0,
  alignToSecond: false,
  alignGridMs: 0,
  unit: UNIT_TYPES.MS,
  decimalPlaces: 0,
}

const MAX_ALLOWED = {
  MAX_STEPS: 1000,
  MAX_INTERVAL: 86400000,
}

export {
  ALGORITHM_TYPES,
  JITTER_TYPES,
  UNIT_TYPES,
  PRESETS,
  DEFAULT_PARAMS,
  MAX_ALLOWED,
}
