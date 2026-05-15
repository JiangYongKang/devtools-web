import {
  SAMPLING_STRATEGIES,
  LOG_LEVELS,
  LOG_LEVEL_PRIORITY,
  DEFAULT_SAMPLE_SIZE,
  DEFAULT_HEAD_KEEP_COUNT,
  DEFAULT_ERROR_CONTEXT_LINES,
} from './constants.js'

function samplingPolicy(lines, config = {}) {
  const {
    strategy = SAMPLING_STRATEGIES.UNIFORM,
    sampleSize = DEFAULT_SAMPLE_SIZE,
    headKeepCount = DEFAULT_HEAD_KEEP_COUNT,
    errorContextLines = DEFAULT_ERROR_CONTEXT_LINES,
    errorLevel = LOG_LEVELS.ERROR,
  } = config

  const totalLines = lines.length

  if (totalLines <= sampleSize) {
    return {
      sampledLines: [...lines],
      totalLines,
      sampledCount: totalLines,
      infoLossRate: 0,
      strategy,
    }
  }

  switch (strategy) {
    case SAMPLING_STRATEGIES.HEAD_ONLY:
      return sampleHeadOnly(lines, sampleSize, headKeepCount)
    case SAMPLING_STRATEGIES.UNIFORM:
      return sampleUniform(lines, sampleSize)
    case SAMPLING_STRATEGIES.SMART_ERROR:
      return sampleSmartError(lines, sampleSize, headKeepCount, errorContextLines, errorLevel)
    default:
      return sampleUniform(lines, sampleSize)
  }
}

function sampleHeadOnly(lines, sampleSize, headKeepCount) {
  const totalLines = lines.length
  const actualHeadKeep = Math.min(headKeepCount, sampleSize)
  const remaining = sampleSize - actualHeadKeep

  if (remaining <= 0) {
    const sampledLines = lines.slice(0, sampleSize)
    return {
      sampledLines,
      totalLines,
      sampledCount: sampledLines.length,
      infoLossRate: 1 - sampledLines.length / totalLines,
      strategy: SAMPLING_STRATEGIES.HEAD_ONLY,
    }
  }

  const headLines = lines.slice(0, actualHeadKeep)
  const tailStart = Math.max(actualHeadKeep, totalLines - remaining)
  const tailLines = lines.slice(tailStart)

  const sampledLines = [...headLines, ...tailLines]

  return {
    sampledLines,
    totalLines,
    sampledCount: sampledLines.length,
    infoLossRate: 1 - sampledLines.length / totalLines,
    strategy: SAMPLING_STRATEGIES.HEAD_ONLY,
  }
}

function sampleUniform(lines, sampleSize) {
  const totalLines = lines.length
  if (totalLines <= sampleSize) {
    return {
      sampledLines: [...lines],
      totalLines,
      sampledCount: totalLines,
      infoLossRate: 0,
      strategy: SAMPLING_STRATEGIES.UNIFORM,
    }
  }

  const step = totalLines / sampleSize
  const sampledLines = []
  for (let i = 0; i < sampleSize; i++) {
    const index = Math.floor(i * step)
    sampledLines.push(lines[index])
  }

  return {
    sampledLines,
    totalLines,
    sampledCount: sampledLines.length,
    infoLossRate: 1 - sampledLines.length / totalLines,
    strategy: SAMPLING_STRATEGIES.UNIFORM,
  }
}

function sampleSmartError(lines, sampleSize, headKeepCount, errorContextLines, errorLevel) {
  const totalLines = lines.length
  const errorPriority = LOG_LEVEL_PRIORITY[errorLevel] || LOG_LEVEL_PRIORITY[LOG_LEVELS.ERROR]

  const errorIndices = []
  lines.forEach((line, index) => {
    const lineLevel = typeof line === 'object' ? line.level : LOG_LEVELS.INFO
    const linePriority = LOG_LEVEL_PRIORITY[lineLevel] || 2
    if (linePriority >= errorPriority) {
      errorIndices.push(index)
    }
  })

  const keepIndices = new Set()

  for (let i = 0; i < headKeepCount && i < totalLines; i++) {
    keepIndices.add(i)
  }

  for (let i = Math.max(0, totalLines - headKeepCount); i < totalLines; i++) {
    keepIndices.add(i)
  }

  errorIndices.forEach((errorIndex) => {
    for (let i = Math.max(0, errorIndex - errorContextLines); i <= Math.min(totalLines - 1, errorIndex + errorContextLines); i++) {
      keepIndices.add(i)
    }
  })

  const remainingSlots = sampleSize - keepIndices.size
  if (remainingSlots > 0) {
    const availableIndices = []
    for (let i = 0; i < totalLines; i++) {
      if (!keepIndices.has(i)) {
        availableIndices.push(i)
      }
    }

    const step = availableIndices.length / remainingSlots
    for (let i = 0; i < remainingSlots; i++) {
      const idx = Math.floor(i * step)
      if (availableIndices[idx] !== undefined) {
        keepIndices.add(availableIndices[idx])
      }
    }
  }

  const sortedIndices = Array.from(keepIndices).sort((a, b) => a - b)
  const finalIndices = sortedIndices.slice(0, sampleSize)
  const sampledLines = finalIndices.map((idx) => lines[idx])

  return {
    sampledLines,
    totalLines,
    sampledCount: sampledLines.length,
    infoLossRate: 1 - sampledLines.length / totalLines,
    strategy: SAMPLING_STRATEGIES.SMART_ERROR,
    errorCount: errorIndices.length,
    keptIndices: finalIndices,
  }
}

function calculateInfoLossRate(totalCount, sampledCount) {
  if (totalCount === 0) return 0
  return 1 - sampledCount / totalCount
}

export {
  samplingPolicy,
  sampleHeadOnly,
  sampleUniform,
  sampleSmartError,
  calculateInfoLossRate,
}
