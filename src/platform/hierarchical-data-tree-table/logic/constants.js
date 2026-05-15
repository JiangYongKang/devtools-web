const CHECK_STATE = {
  UNCHECKED: 'unchecked',
  CHECKED: 'checked',
  INDETERMINATE: 'indeterminate',
}

const SORT_STRATEGY = {
  STABLE_SUBTREE: 'stable_subtree',
  FLAT: 'flat',
}

const VIEW_MODE = {
  TREE: 'tree',
  TABLE: 'table',
}

const DATA_TYPE = {
  DEEP_CHAIN: 'deep_chain',
  WIDE_FANOUT: 'wide_fanout',
  RANDOM_ID: 'random_id',
}

const ERROR_CODES = {
  INVALID_NODE_ID: 'InvalidNodeId',
  INVALID_TREE_STATE: 'InvalidTreeState',
  UNDO_STACK_EMPTY: 'UndoStackEmpty',
  REDO_STACK_EMPTY: 'RedoStackEmpty',
  OPERATION_CANCELLED: 'OperationCancelled',
}

const DEFAULT_CONFIG = {
  virtualizationThreshold: 100,
  rowHeight: 32,
  maxUndoStackSize: 50,
  debounceMs: 300,
  expandBatchSize: 100,
}

const KEY_CODES = {
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  SPACE: ' ',
  ENTER: 'Enter',
}

const SCHEMA_VERSION = '1.0.0'

export {
  CHECK_STATE,
  SORT_STRATEGY,
  VIEW_MODE,
  DATA_TYPE,
  ERROR_CODES,
  DEFAULT_CONFIG,
  KEY_CODES,
  SCHEMA_VERSION,
}
