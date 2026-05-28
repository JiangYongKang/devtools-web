/**
 * 生成 CSV 格式的实验数据
 * @param {Array<{n: number, estimate: number, error: number, se?: number}>} data - 实验数据
 * @param {string[]} extraColumns - 额外列名
 * @returns {string} CSV 字符串
 */
export function generateCSV(data, extraColumns = []) {
  const headers = ['N', 'estimate', 'error', ...extraColumns]
  const headerLine = headers.join(',')

  const dataLines = data.map((row) => {
    const baseValues = [row.n, row.estimate ?? '', row.error ?? '']
    const extraValues = extraColumns.map((col) => row[col] ?? '')
    return [...baseValues, ...extraValues].join(',')
  })

  return [headerLine, ...dataLines].join('\n')
}

/**
 * 下载 CSV 文件
 * @param {string} csvContent - CSV 内容
 * @param {string} filename - 文件名
 */
export function downloadCSV(csvContent, filename = 'pi-estimation.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

  if (navigator.msSaveBlob) {
    navigator.msSaveBlob(blob, filename)
  } else {
    const link = document.createElement('a')
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }
}

/**
 * 大 N 内存保护配置
 */
export const MEMORY_PROTECTION = {
  MAX_SAMPLES_PER_BATCH: 1000000,
  MAX_TOTAL_SAMPLES: 100000000,
  MAX_POINTS_FOR_DISPLAY: 1000,
  RECOMMENDED_WORKER_COUNT: Math.min(navigator?.hardwareConcurrency || 4, 8),
}

/**
 * 检查样本量是否在安全范围内
 * @param {number} n - 样本量
 * @returns {{safe: boolean, message?: string}}
 */
export function checkSampleSizeSafety(n) {
  if (n > MEMORY_PROTECTION.MAX_TOTAL_SAMPLES) {
    return {
      safe: false,
      message: `样本量过大 (${n.toLocaleString()})，最大允许 ${MEMORY_PROTECTION.MAX_TOTAL_SAMPLES.toLocaleString()}`,
    }
  }

  if (n > 10000000) {
    return {
      safe: true,
      message: '大样本量实验，可能需要较长时间',
    }
  }

  return { safe: true }
}

/**
 * 分块处理大样本量
 * @param {number} totalN - 总样本量
 * @param {number} chunkSize - 每块大小
 * @returns {number[]} 分块后的样本量数组
 */
export function chunkSamples(totalN, chunkSize = MEMORY_PROTECTION.MAX_SAMPLES_PER_BATCH) {
  const chunks = []
  let remaining = totalN

  while (remaining > 0) {
    const chunk = Math.min(remaining, chunkSize)
    chunks.push(chunk)
    remaining -= chunk
  }

  return chunks
}

/**
 * 估算内存使用量
 * @param {number} n - 样本量
 * @param {boolean} storePoints - 是否存储每个点的坐标
 * @returns {{bytes: number, humanReadable: string}} 估算内存
 */
export function estimateMemoryUsage(n, storePoints = false) {
  const bytesPerResult = 8
  const bytesPerPoint = storePoints ? 16 : 0

  const totalBytes = n * (bytesPerResult + bytesPerPoint)

  let humanReadable
  if (totalBytes < 1024) {
    humanReadable = `${totalBytes} B`
  } else if (totalBytes < 1024 * 1024) {
    humanReadable = `${(totalBytes / 1024).toFixed(2)} KB`
  } else if (totalBytes < 1024 * 1024 * 1024) {
    humanReadable = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
  } else {
    humanReadable = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  return { bytes: totalBytes, humanReadable }
}

/**
 * 将收敛数据下采样以优化显示
 * @param {Array} data - 原始数据
 * @param {number} maxPoints - 最大点数
 * @returns {Array} 下采样后的数据
 */
export function downsampleData(data, maxPoints = MEMORY_PROTECTION.MAX_POINTS_FOR_DISPLAY) {
  if (data.length <= maxPoints) return data

  const result = []
  const step = Math.ceil(data.length / maxPoints)

  for (let i = 0; i < data.length; i += step) {
    result.push(data[i])
  }

  if (result[result.length - 1] !== data[data.length - 1]) {
    result.push(data[data.length - 1])
  }

  return result
}
