export const PRELOAD_PRIORITY = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

export const CHUNK_TYPES = {
  MUTEX: 'mutex',
  SHARED: 'shared',
  VENDOR: 'vendor',
}

export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
}

export const ANNOUNCER_MESSAGES = {
  LOADING: (toolName) => `正在加载 ${toolName}...`,
  LOADED: (toolName) => `${toolName} 已加载完成`,
  ERROR: (toolName) => `${toolName} 加载失败，请重试`,
}

export const PRELOAD_TRIGGERS = {
  HOVER: 'hover',
  FOCUS: 'focus',
  NAV_HISTORY: 'nav_history',
}
