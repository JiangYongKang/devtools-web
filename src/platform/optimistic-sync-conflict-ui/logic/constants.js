const VERSION = '1.0.0'

const SYNC_STATES = {
  SYNCED: 'synced',
  PENDING: 'pending',
  REJECTED: 'rejected',
  CONFLICT: 'conflict',
}

const ERROR_TYPES = {
  TIMEOUT: 'TIMEOUT',
  NETWORK: 'NETWORK',
  SERVER_5XX: 'SERVER_5XX',
  CONFLICT_412: 'CONFLICT_412',
  BUSINESS_422: 'BUSINESS_422',
  VALIDATION: 'VALIDATION',
  UNKNOWN: 'UNKNOWN',
}

const RESOLUTION_STRATEGIES = {
  KEEP_LOCAL: 'keep_local',
  ADOPT_REMOTE: 'adopt_remote',
  MERGE: 'merge',
  LAST_WRITE_WINS: 'last_write_wins',
}

const EVENT_TYPES = {
  MUTATION_CREATED: 'mutation_created',
  MUTATION_APPLIED: 'mutation_applied',
  MUTATION_REJECTED: 'mutation_rejected',
  CONFLICT_DETECTED: 'conflict_detected',
  CONFLICT_RESOLVED: 'conflict_resolved',
  ROLLBACK_PERFORMED: 'rollback_performed',
  RETRY_ATTEMPTED: 'retry_attempted',
  STATE_CHANGED: 'state_changed',
}

const ACTORS = [
  { id: 'user_alice', name: 'Alice (当前用户)', color: '#3b82f6' },
  { id: 'user_bob', name: 'Bob', color: '#10b981' },
  { id: 'user_charlie', name: 'Charlie', color: '#f59e0b' },
  { id: 'system', name: 'System', color: '#6b7280' },
]

const DEFAULT_DEMO_DATA = [
  {
    id: 'item_1',
    title: '设计系统组件库',
    description: '完成 Button、Input、Modal 等基础组件',
    status: 'in_progress',
    priority: 'high',
    assignee: 'user_alice',
  },
  {
    id: 'item_2',
    title: 'API 文档编写',
    description: '编写 REST API 接口文档和示例',
    status: 'todo',
    priority: 'medium',
    assignee: 'user_bob',
  },
  {
    id: 'item_3',
    title: '性能优化',
    description: '优化首页加载速度和渲染性能',
    status: 'done',
    priority: 'high',
    assignee: 'user_charlie',
  },
]

const STATUS_OPTIONS = [
  { value: 'todo', label: '待办', color: '#6b7280' },
  { value: 'in_progress', label: '进行中', color: '#3b82f6' },
  { value: 'review', label: '审核中', color: '#f59e0b' },
  { value: 'done', label: '已完成', color: '#10b981' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: '低', color: '#6b7280' },
  { value: 'medium', label: '中', color: '#f59e0b' },
  { value: 'high', label: '高', color: '#ef4444' },
]

const MAX_EVENT_LOG_ENTRIES = 50

const DEFAULT_RETRY_DELAY_MS = 1000

const DEFAULT_CONFLICT_PROBABILITY = 0.3

const DEFAULT_NETWORK_DELAY_MS = 800

const MIN_DELAY_MS = 0

const MAX_DELAY_MS = 5000

const ARIA_LABELS = {
  zh: {
    pending: '同步中',
    synced: '已同步',
    rejected: '同步失败',
    conflict: '存在冲突',
    editButton: '编辑',
    saveButton: '保存',
    cancelButton: '取消',
    retryButton: '重试',
    rollbackButton: '回滚',
    keepLocalButton: '保留本地',
    adoptRemoteButton: '采用远端',
    mergeButton: '合并',
    conflictPanel: '冲突解决面板',
    eventTimeline: '事件时间线',
    unsavedChanges: '有未保存的更改',
  },
  en: {
    pending: 'Syncing',
    synced: 'Synced',
    rejected: 'Sync failed',
    conflict: 'Conflict detected',
    editButton: 'Edit',
    saveButton: 'Save',
    cancelButton: 'Cancel',
    retryButton: 'Retry',
    rollbackButton: 'Rollback',
    keepLocalButton: 'Keep Local',
    adoptRemoteButton: 'Adopt Remote',
    mergeButton: 'Merge',
    conflictPanel: 'Conflict Resolution Panel',
    eventTimeline: 'Event Timeline',
    unsavedChanges: 'Unsaved changes',
  },
}

export {
  VERSION,
  SYNC_STATES,
  ERROR_TYPES,
  RESOLUTION_STRATEGIES,
  EVENT_TYPES,
  ACTORS,
  DEFAULT_DEMO_DATA,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  MAX_EVENT_LOG_ENTRIES,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_CONFLICT_PROBABILITY,
  DEFAULT_NETWORK_DELAY_MS,
  MIN_DELAY_MS,
  MAX_DELAY_MS,
  ARIA_LABELS,
}
