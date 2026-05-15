const ERROR_CODES = {
  INVALID_PATH_SYNTAX: 'InvalidPathSyntax',
  PATH_NOT_FOUND: 'PathNotFound',
  INVALID_SCHEMA: 'InvalidSchema',
  VALIDATION_ERROR: 'ValidationError',
  PROTOTYPE_POLLUTION_ATTEMPT: 'PrototypePollutionAttempt',
}

const PATH_TYPES = {
  PROPERTY: 'property',
  ARRAY_INDEX: 'array_index',
  WILDCARD: 'wildcard',
}

const VALIDATION_RULES = {
  REQUIRED: 'required',
  TYPE: 'type',
  MIN: 'min',
  MAX: 'max',
  MIN_LENGTH: 'minLength',
  MAX_LENGTH: 'maxLength',
  PATTERN: 'pattern',
}

const DIFF_TYPES = {
  ADD: 'add',
  REMOVE: 'remove',
  UPDATE: 'update',
  MOVE: 'move',
}

const DEFAULT_GET_OPTIONS = {
  default: undefined,
  strict: false,
}

const DEFAULT_SET_OPTIONS = {
  createMissing: true,
}

const SCHEMA_VERSION = '1.0.0'

export {
  ERROR_CODES,
  PATH_TYPES,
  VALIDATION_RULES,
  DIFF_TYPES,
  DEFAULT_GET_OPTIONS,
  DEFAULT_SET_OPTIONS,
  SCHEMA_VERSION,
}
