import {
  GRADUAL_ROLLOUT_CONFIG,
  EMERGENCY_SHUTDOWN_CONFIG,
  LAYERED_EXPERIMENT_CONFIG,
} from './demoData.js'
import { MOCK_API_DELAY_MS } from './constants.js'

const CONFIG_MAP = {
  gradual_rollout: GRADUAL_ROLLOUT_CONFIG,
  emergency_shutdown: EMERGENCY_SHUTDOWN_CONFIG,
  layered_experiment: LAYERED_EXPERIMENT_CONFIG,
}

let currentScenario = 'gradual_rollout'
let useCache = false
let lastEtag = null

function setMockScenario(scenario) {
  if (CONFIG_MAP[scenario]) {
    currentScenario = scenario
    lastEtag = null
  }
}

function getMockScenario() {
  return currentScenario
}

function setUseCache(value) {
  useCache = value
}

async function fetchFeatureConfig(options = {}) {
  const {
    delayMs = MOCK_API_DELAY_MS,
    forceFetch = false,
    ifNoneMatch = null,
  } = options

  await new Promise((resolve) => setTimeout(resolve, delayMs))

  const config = CONFIG_MAP[currentScenario]
  const currentEtag = config.cacheControl?.etag || `${currentScenario}-${Date.now()}`

  if (useCache && !forceFetch && ifNoneMatch && ifNoneMatch === lastEtag) {
    return {
      status: 304,
      statusText: 'Not Modified',
      headers: {
        etag: lastEtag,
        'cache-control': `max-age=${config.cacheControl?.maxAge || 3600}`,
      },
      body: null,
    }
  }

  lastEtag = currentEtag

  return {
    status: 200,
    statusText: 'OK',
    headers: {
      etag: currentEtag,
      'cache-control': `max-age=${config.cacheControl?.maxAge || 3600}`,
      'last-modified': new Date(config.cacheControl?.lastModified || Date.now()).toUTCString(),
    },
    body: {
      ...config,
      fetchedAt: Date.now(),
    },
  }
}

async function fetchFlagEvaluation(flagKey, context) {
  await new Promise((resolve) => setTimeout(resolve, 100))

  return {
    flagKey,
    context,
    result: {
      value: Math.random() > 0.5,
      reason: 'mock_evaluation',
    },
  }
}

async function fetchVariantAssignment(experimentName, userId) {
  await new Promise((resolve) => setTimeout(resolve, 100))

  const variants = ['control', 'variant_a', 'variant_b']
  const index = Math.floor(Math.random() * variants.length)

  return {
    experimentName,
    userId,
    variant: variants[index],
    bucket: Math.floor(Math.random() * 100),
  }
}

export {
  setMockScenario,
  getMockScenario,
  setUseCache,
  fetchFeatureConfig,
  fetchFlagEvaluation,
  fetchVariantAssignment,
}
