
const LOADING_STATES = {
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
}

const LOADING_MODES = {
  LOCAL: 'LOCAL',
  GLOBAL: 'GLOBAL',
}

const EMPTY_STATE_TYPES = {
  NO_DATA: 'NO_DATA',
  NO_RESULTS: 'NO_RESULTS',
  NO_PERMISSION: 'NO_PERMISSION',
  OFFLINE: 'OFFLINE',
}

const NOTIFICATION_SEVERITY = {
  SUCCESS: 'success',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
}

const NOTIFICATION_TYPES = {
  TOAST: 'toast',
  BANNER: 'banner',
}

const ARIA_LIVE_POLITE = 'polite'
const ARIA_LIVE_ASSERTIVE = 'assertive'

const DEFAULTS = {
  MAX_TOASTS: 5,
  MAX_BANNERS: 3,
  TOAST_DURATION: 4000,
  BANNER_DURATION: 8000,
  DEBOUNCE_DELAY: 300,
}

const LOADING_STATE_TRANSITIONS = {
  [LOADING_STATES.IDLE]: {
    START: LOADING_STATES.LOADING,
  },
  [LOADING_STATES.LOADING]: {
    SUCCEED: LOADING_STATES.SUCCESS,
    FAIL: LOADING_STATES.ERROR,
  },
  [LOADING_STATES.SUCCESS]: {
    RESET: LOADING_STATES.IDLE,
    START: LOADING_STATES.LOADING,
  },
  [LOADING_STATES.ERROR]: {
    RESET: LOADING_STATES.IDLE,
    START: LOADING_STATES.LOADING,
  },
}

const EMPTY_STATE_DICTIONARY = {
  [EMPTY_STATE_TYPES.NO_DATA]: {
    title: '暂无数据',
    description: '当前没有可用的数据',
    action: '添加数据',
  },
  [EMPTY_STATE_TYPES.NO_RESULTS]: {
    title: '没有找到结果',
    description: '请尝试调整筛选条件',
    action: '重置筛选',
  },
  [EMPTY_STATE_TYPES.NO_PERMISSION]: {
    title: '权限不足',
    description: '您没有访问此内容的权限',
    action: '联系管理员',
  },
  [EMPTY_STATE_TYPES.OFFLINE]: {
    title: '网络连接已断开',
    description: '请检查您的网络连接后重试',
    action: '重试连接',
  },
}

export {
  LOADING_STATES,
  LOADING_MODES,
  EMPTY_STATE_TYPES,
  NOTIFICATION_SEVERITY,
  NOTIFICATION_TYPES,
  ARIA_LIVE_POLITE,
  ARIA_LIVE_ASSERTIVE,
  DEFAULTS,
  LOADING_STATE_TRANSITIONS,
  EMPTY_STATE_DICTIONARY,
}
