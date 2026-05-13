import {
  ALGORITHM_TYPES,
  JITTER_TYPES,
  UNIT_TYPES,
  MAX_ALLOWED,
} from './constants.js'
import {
  ERROR_CODES,
  createError,
} from './errors.js'

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function convertToUnit(value, fromUnit, toUnit) {
  if (!isFiniteNumber(value)) return value
  if (fromUnit === toUnit) return value
  if (fromUnit === UNIT_TYPES.MS && toUnit === UNIT_TYPES.SECONDS) {
    return value / 1000
  }
  if (fromUnit === UNIT_TYPES.SECONDS && toUnit === UNIT_TYPES.MS) {
    return value * 1000
  }
  return value
}

function formatDecimal(value, decimalPlaces) {
  if (!isFiniteNumber(value)) return String(value)
  if (decimalPlaces === 0) return String(Math.round(value))
  return Number(value).toFixed(decimalPlaces)
}

function alignToGrid(value, gridMs) {
  if (!isFiniteNumber(value) || gridMs <= 0) return value
  return Math.round(value / gridMs) * gridMs
}

function applyJitter(baseValue, jitterType, jitterMin, jitterMax, randomFn = Math.random) {
  if (jitterType === JITTER_TYPES.NONE) {
    return { min: baseValue, max: baseValue, nominal: baseValue }
  }

  if (jitterMin > jitterMax) {
    return null
  }

  const minValue = baseValue * jitterMin
  const maxValue = baseValue * jitterMax

  if (jitterType === JITTER_TYPES.FULL) {
    const jittered = minValue + randomFn() * (maxValue - minValue)
    return { min: minValue, max: maxValue, nominal: baseValue, jittered }
  }

  if (jitterType === JITTER_TYPES.EQUAL) {
    const mid = (minValue + maxValue) / 2
    const jittered = mid + randomFn() * (maxValue - minValue) * 0.5
    return { min: minValue, max: maxValue, nominal: baseValue, jittered }
  }

  return { min: baseValue, max: baseValue, nominal: baseValue }
}

function validateParams(params) {
  const {
    initial,
    multiplier,
    max,
    maxSteps,
    jitter,
    jitterMin,
    jitterMax,
    algorithm,
  } = params

  if (initial < 0) {
    return createError(ERROR_CODES.NEGATIVE_PARAMETER, null, ['初值不能为负数'])
  }

  if (multiplier < 0) {
    return createError(ERROR_CODES.NEGATIVE_PARAMETER, null, ['乘数不能为负数'])
  }

  if (multiplier === 0) {
    return createError(ERROR_CODES.ZERO_MULTIPLIER, null, ['乘数为零会导致后续所有间隔为零'])
  }

  if (max < 0) {
    return createError(ERROR_CODES.NEGATIVE_PARAMETER, null, ['最大间隔不能为负数'])
  }

  if (maxSteps < 0) {
    return createError(ERROR_CODES.NEGATIVE_PARAMETER, null, ['最大步数不能为负数'])
  }

  if (maxSteps > MAX_ALLOWED.MAX_STEPS) {
    return createError(ERROR_CODES.MAX_STEPS_EXCEEDED, null, [`最大步数不能超过 ${MAX_ALLOWED.MAX_STEPS}`])
  }

  if (!Object.values(ALGORITHM_TYPES).includes(algorithm)) {
    return createError(ERROR_CODES.INVALID_ALGORITHM, null, ['请选择有效的算法类型'])
  }

  if (!Object.values(JITTER_TYPES).includes(jitter)) {
    return createError(ERROR_CODES.INVALID_JITTER_TYPE, null, ['请选择有效的抖动类型'])
  }

  if (jitter !== JITTER_TYPES.NONE) {
    if (jitterMin > jitterMax) {
      return createError(ERROR_CODES.INVALID_JITTER_RANGE, null, ['抖动最小值不能大于最大值'])
    }
    if (jitterMin < 0 || jitterMax < 0) {
      return createError(ERROR_CODES.NEGATIVE_PARAMETER, null, ['抖动比例不能为负数'])
    }
  }

  return null
}

function generateSequence(params, randomFn = Math.random) {
  const validationError = validateParams(params)
  if (validationError) {
    return { success: false, ...validationError }
  }

  const {
    initial,
    multiplier,
    max,
    maxSteps,
    jitter,
    jitterMin,
    jitterMax,
    algorithm,
    alignToSecond,
    alignGridMs,
  } = params

  const sequence = []
  let totalWait = 0
  let hasOverflow = false
  let hasNonFinite = false
  let clippedCount = 0

  let gridMs = alignGridMs
  if (alignToSecond) {
    gridMs = 1000
  }

  for (let step = 1; step <= maxSteps; step++) {
    let baseValue

    if (algorithm === ALGORITHM_TYPES.EXPONENTIAL) {
      baseValue = initial * Math.pow(multiplier, step - 1)
    } else if (algorithm === ALGORITHM_TYPES.LINEAR) {
      baseValue = initial + (step - 1) * multiplier
    } else {
      baseValue = initial
    }

    if (!isFiniteNumber(baseValue)) {
      hasNonFinite = true
      break
    }

    if (baseValue > Number.MAX_SAFE_INTEGER || baseValue < -Number.MAX_SAFE_INTEGER) {
      hasOverflow = true
      break
    }

    const jittered = applyJitter(baseValue, jitter, jitterMin, jitterMax, randomFn)
    if (jittered === null) {
      return {
        success: false,
        ...createError(ERROR_CODES.INVALID_JITTER_RANGE),
      }
    }

    const displayValue = jittered.jittered !== undefined ? jittered.jittered : jittered.nominal

    let finalValue = displayValue
    const wasAboveMax = finalValue > max
    if (max > 0 && finalValue > max) {
      finalValue = max
      clippedCount++
    }

    const alignedValue = alignToGrid(finalValue, gridMs)

    totalWait += alignedValue

    const item = {
      step,
      base: baseValue,
      min: alignToGrid(jittered.min, gridMs),
      max: alignToGrid(Math.min(jittered.max, max > 0 ? max : Infinity), gridMs),
      nominal: alignToGrid(jittered.nominal, gridMs),
      value: alignedValue,
      total: totalWait,
      clipped: wasAboveMax,
    }

    if (jitter !== JITTER_TYPES.NONE) {
      item.jittered = alignedValue
    }

    sequence.push(item)
  }

  const remainingBudget = max > 0 ? Math.max(0, maxSteps - sequence.length) : null

  return {
    success: true,
    sequence,
    totalWait,
    remainingBudget,
    clippedCount,
    hasOverflow,
    hasNonFinite,
    warnings: [],
  }
}

function inverseCalculateInitial(targetTotal, multiplier, maxSteps, algorithm, max = 0) {
  if (targetTotal <= 0 || maxSteps <= 0) {
    return { success: false, ...createError(ERROR_CODES.NEGATIVE_PARAMETER, null, ['目标总时长和步数必须大于零']) }
  }

  let initial

  if (algorithm === ALGORITHM_TYPES.EXPONENTIAL) {
    if (multiplier <= 0) {
      return { success: false, ...createError(ERROR_CODES.ZERO_MULTIPLIER) }
    }

    if (multiplier === 1) {
      initial = targetTotal / maxSteps
    } else {
      const sum = (1 - Math.pow(multiplier, maxSteps)) / (1 - multiplier)
      if (!isFiniteNumber(sum) || sum === 0) {
        return { success: false, ...createError(ERROR_CODES.NO_SOLUTION, null, ['指数求和公式无法计算有效结果']) }
      }
      initial = targetTotal / sum
    }
  } else if (algorithm === ALGORITHM_TYPES.LINEAR) {
    if (maxSteps === 1) {
      initial = targetTotal
    } else {
      const n = maxSteps
      const sum = n * initial + (n * (n - 1) / 2) * multiplier
      initial = (targetTotal - (n * (n - 1) / 2) * multiplier) / n
    }
  } else {
    return { success: false, ...createError(ERROR_CODES.INVALID_ALGORITHM) }
  }

  if (!isFiniteNumber(initial)) {
    return { success: false, ...createError(ERROR_CODES.NON_FINITE_VALUE, null, ['计算结果为非有限值']) }
  }

  if (initial < 0) {
    return { success: false, ...createError(ERROR_CODES.NO_SOLUTION, null, ['计算出的初值为负数，无解']) }
  }

  if (max > 0 && initial > max) {
    return { success: false, ...createError(ERROR_CODES.NO_SOLUTION, null, ['计算出的初值超过最大间隔限制，无解']) }
  }

  return { success: true, initial }
}

function inverseCalculateMultiplier(targetTotal, initial, maxSteps, algorithm, max = 0) {
  if (targetTotal <= 0 || maxSteps <= 0 || initial < 0) {
    return { success: false, ...createError(ERROR_CODES.NEGATIVE_PARAMETER, null, ['参数必须大于等于零']) }
  }

  if (initial === 0) {
    return { success: false, ...createError(ERROR_CODES.NO_SOLUTION, null, ['初值为零时无法反算乘数']) }
  }

  let multiplier

  if (algorithm === ALGORITHM_TYPES.EXPONENTIAL) {
    if (maxSteps === 1) {
      multiplier = 1
    } else {
      const ratio = targetTotal / initial
      let low = 0.01
      let high = 100
      let found = false
      let iterations = 0
      const maxIterations = 1000

      while (iterations < maxIterations) {
        const mid = (low + high) / 2
        let sum
        if (mid === 1) {
          sum = maxSteps
        } else {
          sum = (1 - Math.pow(mid, maxSteps)) / (1 - mid)
        }

        if (!isFiniteNumber(sum)) {
          high = mid
          iterations++
          continue
        }

        const diff = sum - ratio
        if (Math.abs(diff) < 0.0001) {
          multiplier = mid
          found = true
          break
        }

        if (sum < ratio) {
          low = mid
        } else {
          high = mid
        }
        iterations++
      }

      if (!found) {
        return { success: false, ...createError(ERROR_CODES.NO_SOLUTION, null, ['无法在合理范围内找到乘数解']) }
      }
    }
  } else if (algorithm === ALGORITHM_TYPES.LINEAR) {
    if (maxSteps <= 1) {
      multiplier = 0
    } else {
      const n = maxSteps
      multiplier = (targetTotal - n * initial) * 2 / (n * (n - 1))
    }
  } else {
    return { success: false, ...createError(ERROR_CODES.INVALID_ALGORITHM) }
  }

  if (!isFiniteNumber(multiplier)) {
    return { success: false, ...createError(ERROR_CODES.NON_FINITE_VALUE, null, ['计算结果为非有限值']) }
  }

  if (algorithm === ALGORITHM_TYPES.EXPONENTIAL && multiplier <= 0) {
    return { success: false, ...createError(ERROR_CODES.NO_SOLUTION, null, ['计算出的乘数为非正数，无解']) }
  }

  return { success: true, multiplier }
}

function generateRandomParams(randomFn = Math.random) {
  const algorithms = Object.values(ALGORITHM_TYPES)
  const jitterTypes = Object.values(JITTER_TYPES)

  const algorithm = algorithms[Math.floor(randomFn() * algorithms.length)]
  const jitter = jitterTypes[Math.floor(randomFn() * jitterTypes.length)]

  let initial = Math.floor(100 + randomFn() * 2000)
  let multiplier
  let max
  let maxSteps

  if (algorithm === ALGORITHM_TYPES.EXPONENTIAL) {
    multiplier = 1.1 + randomFn() * 1.9
    max = Math.floor(5000 + randomFn() * 60000)
  } else {
    multiplier = Math.floor(50 + randomFn() * 500)
    max = Math.floor(2000 + randomFn() * 30000)
  }

  maxSteps = Math.floor(3 + randomFn() * 12)

  const jitterMin = jitter === JITTER_TYPES.NONE ? 0.5 : 0.3 + randomFn() * 0.4
  const jitterMax = jitter === JITTER_TYPES.NONE ? 1.0 : jitterMin + randomFn() * 0.5

  return {
    algorithm,
    initial,
    multiplier: Number(multiplier.toFixed(2)),
    max,
    maxSteps,
    jitter,
    jitterMin: Number(jitterMin.toFixed(2)),
    jitterMax: Number(jitterMax.toFixed(2)),
    alignToSecond: randomFn() > 0.7,
    alignGridMs: 0,
  }
}

function compareConfigs(configA, configB) {
  const allKeys = new Set([...Object.keys(configA), ...Object.keys(configB)])
  const diffs = []

  for (const key of allKeys) {
    const valA = configA[key]
    const valB = configB[key]
    const changed = valA !== valB

    diffs.push({
      key,
      valueA: valA,
      valueB: valB,
      changed,
    })
  }

  return diffs
}

function exportToCSV(sequence, params) {
  if (!sequence || sequence.length === 0) return ''

  const headers = ['Step', 'Base (ms)', 'Min (ms)', 'Max (ms)', 'Nominal (ms)', 'Value (ms)', 'Total (ms)']
  const rows = [headers.join(',')]

  for (const item of sequence) {
    rows.push([
      item.step,
      item.base.toFixed(params.decimalPlaces || 0),
      item.min.toFixed(params.decimalPlaces || 0),
      item.max.toFixed(params.decimalPlaces || 0),
      item.nominal.toFixed(params.decimalPlaces || 0),
      item.value.toFixed(params.decimalPlaces || 0),
      item.total.toFixed(params.decimalPlaces || 0),
    ].join(','))
  }

  return rows.join('\n')
}

function exportToJSON(sequence, params) {
  return JSON.stringify({
    params,
    sequence,
    generatedAt: new Date().toISOString(),
  }, null, 2)
}

function generateSleepCode(sequence, params, language = 'bash') {
  if (!sequence || sequence.length === 0) return ''

  const unit = params.unit || UNIT_TYPES.MS

  if (language === 'bash') {
    const lines = sequence.map((item, index) => {
      const seconds = convertToUnit(item.value, UNIT_TYPES.MS, UNIT_TYPES.SECONDS)
      return `sleep ${formatDecimal(seconds, params.decimalPlaces || 3)}  # Retry ${index + 1}`
    })
    return `#!/bin/bash\n\n${lines.join('\n')}`
  }

  if (language === 'powershell') {
    const lines = sequence.map((item, index) => {
      return `Start-Sleep -Milliseconds ${formatDecimal(item.value, params.decimalPlaces || 0)}  # Retry ${index + 1}`
    })
    return `# PowerShell\n\n${lines.join('\n')}`
  }

  return ''
}

export {
  isFiniteNumber,
  convertToUnit,
  formatDecimal,
  alignToGrid,
  applyJitter,
  validateParams,
  generateSequence,
  inverseCalculateInitial,
  inverseCalculateMultiplier,
  generateRandomParams,
  compareConfigs,
  exportToCSV,
  exportToJSON,
  generateSleepCode,
}
