export {
  createRandomGenerator,
  isInsideUnitCircle,
  samplePoint,
  batchSampleCircle,
  estimatePi,
  absoluteError,
  mergeBatchResults,
  mergeWorkerResults,
  getFixedSeeds,
} from './pi-estimator.js'

export {
  stratifiedSampling,
  antitheticVariates,
  controlVariates,
  calculateVariance,
  covariance,
  standardMonteCarlo,
  compareVarianceReduction,
} from './variance-reduction.js'

export {
  dropNeedle,
  batchDropNeedles,
  estimatePiBuffon,
  theoreticalProbabilityBuffon,
  BUFFON_STANDARD_CONFIG,
  standardBuffonExperiment,
  buffonVariance,
  estimatedSampleSizeBuffon,
  laplaceDropNeedle,
} from './buffon-needle.js'

export {
  binomialVariance,
  standardError,
  standardErrorPi,
  Z_SCORES,
  confidenceInterval,
  containsTruePi,
  relativeError,
  estimateRequiredSampleSize,
  predictRemainingSamples,
  generateConvergencePoints,
  computeConvergenceStats,
  effectiveSampleSizeRatio,
  formatNumber,
  formatLargeNumber,
} from './statistics.js'

export {
  generateCSV,
  downloadCSV,
  MEMORY_PROTECTION,
  checkSampleSizeSafety,
  chunkSamples,
  estimateMemoryUsage,
  downsampleData,
} from './export.js'

export {
  EXAMPLES,
  QUICK_EXAMPLE,
  HIGH_PRECISION_EXAMPLE,
  BUFFON_EXAMPLE,
  METHOD_LABELS,
  CONFIDENCE_OPTIONS,
  WORKER_COUNT_OPTIONS,
  DEFAULT_CONFIG,
} from './examples.js'
