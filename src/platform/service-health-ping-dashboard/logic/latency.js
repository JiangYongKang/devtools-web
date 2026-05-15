
export function calculatePercentile(values, percentile) {
  if (!Array.isArray(values) || values.length === 0) {
    return null
  }

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))]
}

export function calculateStats(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return {
      count: 0,
      min: null,
      max: null,
      avg: null,
      median: null,
      p95: null,
      p99: null,
      sum: 0,
    }
  }

  const sum = values.reduce((acc, val) => acc + val, 0)
  const sorted = [...values].sort((a, b) => a - b)

  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: sum / values.length,
    median: calculatePercentile(values, 50),
    p95: calculatePercentile(values, 95),
    p99: calculatePercentile(values, 99),
    sum,
  }
}

export function aggregateLatency(latencySamples) {
  if (!Array.isArray(latencySamples) || latencySamples.length === 0) {
    return {
      stats: calculateStats([]),
      recent: [],
    }
  }

  const validSamples = latencySamples.filter((s) => typeof s === 'number' && isFinite(s))

  return {
    stats: calculateStats(validSamples),
    recent: validSamples.slice(-20),
  }
}

export function calculateUptime(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return {
      uptimePercent: 100,
      total: 0,
      success: 0,
      failed: 0,
    }
  }

  const successCount = results.filter((r) => r && r.success).length
  const totalCount = results.length

  return {
    uptimePercent: (successCount / totalCount) * 100,
    total: totalCount,
    success: successCount,
    failed: totalCount - successCount,
  }
}
