export {
  VERSION,
  DOMAINS,
  SEVERITY,
  ERROR_CODES,
  DEFAULT_LOCALES,
  DEFAULT_RETRYABLE_HTTP_STATUS,
  DEFAULT_RETRY_DELAY_SECONDS,
  DEFAULT_RETRY_MAX_DELAY_SECONDS,
  MAX_CAUSE_CHAIN_DEPTH,
  MAX_MAPPING_TABLE_SIZE,
  MAX_PATCH_FETCH_TIMEOUT_MS,
  DEFAULT_PATCH_URL,
  ENVIRONMENTS,
} from './constants.js'

export {
  ERROR_MESSAGES,
  truncateString,
  createError,
  isErrorMessageMapperError,
} from './errors.js'

export {
  DEFAULT_MAPPINGS,
  getDefaultMappings,
  createDefaultMappingEntry,
} from './defaultMappings.js'

export {
  ENVIRONMENT_OVERRIDES,
  getEnvironmentOverrides,
  getCurrentEnvironment,
} from './environmentOverrides.js'

export {
  validatePatchSchema,
  normalizePatch,
  fetchRemotePatch,
  getDemoPatchData,
} from './remotePatch.js'

export {
  getMappingKey,
  getMatchScore,
  mergeMappings,
  matchInput,
  findMatchingMapping,
  getLocalizedValue,
  createUnknownBusinessMapping,
  extractCauseChain,
  parseRetryAfter,
  buildMergedMappings,
  getTextForLocale,
  mapError,
} from './mappingLogic.js'

export {
  isAbortError,
  isNetworkError,
  classifyError,
  mapFetchError,
} from './fetchErrorMapper.js'
