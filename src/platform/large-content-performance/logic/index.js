export {
  VERSION,
  WORKER_PROTOCOL_VERSION,
  ENCODING_MODES,
  WORKER_DECISION_REASONS,
  DEFAULT_CONFIG,
  ERROR_CODES,
  ERROR_MESSAGES,
  WORKER_MESSAGE_TYPES,
  SSR_SAFE_EXPORTS,
} from './constants.js'

export {
  createError,
  wrapError,
  getErrorMessage,
  isLargeContentError,
  getErrorCode,
} from './errors.js'

export {
  createTextChunkIterator,
  textChunkGenerator,
  estimateTextByteSize,
  getUtf8ByteLength,
  findUtf8SafeBreakPoint,
} from './textChunker.js'

export {
  createDebouncedFn,
  createThrottledFn,
} from './debounce.js'

export {
  decideWorkerUsage,
  shouldUseWorkerForText,
  hasWorkerSupport,
  hasSharedArrayBufferSupport,
  getHardwareConcurrency,
  isSSR,
} from './workerDecision.js'

export {
  createHeightCache,
  calculateTotalHeight,
  findAnchorIndex,
  getOffsetBeforeIndex,
  calculateVisibleRange,
  shouldRender,
  isFastScrolling,
  createRafScheduler,
  prefersReducedMotion,
} from './virtualList.js'

export {
  createCancelToken,
  scheduleTask,
  estimateMemoryUsage,
  generateRandomString,
  generateJsonArrayItem,
  generateLogLine,
  generateTableRow,
  generateLargeString,
  generateDatasetAsync,
  reportSample,
} from './dataGenerator.js'

export {
  WORKER_PROTOCOL_VERSION as PROTOCOL_VERSION,
  isWorkerContext,
  assertNotInWorker,
  validateMessage,
  createWorkerMessage,
  createMessageQueue,
  mergeMessages,
  createWorkerManager,
  attachLargeTextController,
} from './workerProtocol.js'
