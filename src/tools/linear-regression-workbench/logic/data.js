/**
 * 数据解析与示例数据集
 */

/**
 * 解析 CSV 或制表符分隔的文本数据
 * @param {string} text - 输入文本
 * @returns {Object} 解析结果
 */
export function parseData(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length === 0) {
    return { ok: false, error: '无数据' }
  }

  const separator = detectSeparator(lines[0])
  const result = []
  const invalidRows = []
  const missingRows = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parts = line.split(separator).map((p) => p.trim())
    if (parts.length < 2) {
      missingRows.push(i + 1)
      continue
    }

    const x = parseFloat(parts[0])
    const y = parseFloat(parts[1])
    const w = parts.length >= 3 ? parseFloat(parts[2]) : null

    if (isNaN(x) || isNaN(y) || (w !== null && isNaN(w))) {
      invalidRows.push({ row: i + 1, x: parts[0], y: parts[1], w: parts[2] || '' })
      continue
    }

    result.push({ x, y, w: w || 1 })
  }

  if (result.length === 0) {
    return { ok: false, error: '无有效数据行' }
  }

  return {
    ok: true,
    data: result,
    invalidRows,
    missingRows,
    rowCount: lines.length,
    validCount: result.length,
  }
}

/**
 * 检测数据分隔符
 * @param {string} firstLine - 第一行数据
 * @returns {string} 分隔符
 */
function detectSeparator(firstLine) {
  if (firstLine.includes('\t')) return '\t'
  if (firstLine.includes(',')) return ','
  if (firstLine.includes(';')) return ';'
  return /\s+/
}

/**
 * 将数据导出为 CSV 格式
 * @param {Array} data - 数据数组
 * @param {Object} regressionResult - 回归结果
 * @returns {string} CSV 字符串
 */
export function exportPredictionsCSV(data, regressionResult) {
  const headers = ['x', 'y', 'fitted', 'residual', 'std_residual', 'leverage', 'cook_distance']
  const stdRes = standardizedResidualsLocal(regressionResult.residuals)
  const lev = leverageLocal(data.map((d) => d.x))
  const cook = cookDistanceLocal(
    regressionResult.residuals,
    lev,
    regressionResult.residualStdError
  )

  const lines = [headers.join(',')]
  for (let i = 0; i < data.length; i++) {
    lines.push(
      [
        data[i].x,
        data[i].y,
        regressionResult.fitted[i].toFixed(6),
        regressionResult.residuals[i].toFixed(6),
        stdRes[i].toFixed(6),
        lev[i].toFixed(6),
        cook[i].toFixed(6),
      ].join(',')
    )
  }
  return lines.join('\n')
}

/**
 * 生成系数表 Markdown
 * @param {Object} regressionResult - 回归结果
 * @returns {string} Markdown 表格
 */
export function coefficientTableMarkdown(regressionResult) {
  const { intercept, slope, interceptStdError, slopeStdError, rSquared, adjustedRSquared, residualStdError, n } = regressionResult
  const df = n - 2

  const interceptT = interceptStdError > 0 ? intercept / interceptStdError : 0
  const slopeT = slopeStdError > 0 ? slope / slopeStdError : 0

  return `
### 回归系数表

| 变量 | 系数 | 标准误 | t 值 |
|------|------|--------|------|
| 截距 | ${intercept.toFixed(6)} | ${interceptStdError.toFixed(6)} | ${interceptT.toFixed(4)} |
| 斜率 | ${slope.toFixed(6)} | ${slopeStdError.toFixed(6)} | ${slopeT.toFixed(4)} |

### 模型摘要

| 统计量 | 值 |
|--------|----|
| 样本量 | ${n} |
| R² | ${(rSquared * 100).toFixed(2)}% |
| 调整 R² | ${(adjustedRSquared * 100).toFixed(2)}% |
| 残差标准误 | ${residualStdError.toFixed(6)} |
| 自由度 | ${df} |
`
}

/**
 * 本地辅助函数（避免循环依赖）
 */
function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0)
}

function variance(arr) {
  if (arr.length <= 1) return 0
  const m = mean(arr)
  return sum(arr.map((x) => (x - m) ** 2)) / (arr.length - 1)
}

function stdDev(arr) {
  return Math.sqrt(variance(arr))
}

function standardizedResidualsLocal(residuals) {
  const std = stdDev(residuals)
  if (std === 0) return residuals.map(() => 0)
  return residuals.map((r) => r / std)
}

function leverageLocal(x) {
  const n = x.length
  const xBar = mean(x)
  const sxx = sum(x.map((xi) => (xi - xBar) ** 2))
  if (sxx === 0) return Array(n).fill(1 / n)
  return x.map((xi) => 1 / n + (xi - xBar) ** 2 / sxx)
}

function cookDistanceLocal(residuals, leverageValues, residualStdError, p = 2) {
  return residuals.map((r, i) => {
    const h = leverageValues[i]
    const denom = p * residualStdError ** 2 * (1 - h) ** 2
    if (denom === 0) return 0
    return (r ** 2 * h) / denom
  })
}

/**
 * 内置示例数据集
 */
export const EXAMPLES = {
  linearTrend: {
    id: 'linearTrend',
    name: '线性趋势',
    description: '完美线性关系加噪声',
    data: generateLinearTrend(),
  },
  withOutlier: {
    id: 'withOutlier',
    name: '含离群点',
    description: '包含一个明显的异常值',
    data: generateWithOutlier(),
  },
  heteroscedastic: {
    id: 'heteroscedastic',
    name: '异方差形态',
    description: '残差方差随 x 增大',
    data: generateHeteroscedastic(),
  },
}

/**
 * 生成线性趋势数据
 */
function generateLinearTrend() {
  const data = []
  for (let x = 1; x <= 20; x++) {
    const noise = (Math.random() - 0.5) * 2
    const y = 2 + 0.5 * x + noise
    data.push({ x, y, w: 1 })
  }
  return data
}

/**
 * 生成含离群点的数据
 */
function generateWithOutlier() {
  const data = []
  for (let x = 1; x <= 19; x++) {
    const noise = (Math.random() - 0.5) * 2
    const y = 3 + 0.8 * x + noise
    data.push({ x, y, w: 1 })
  }
  data.push({ x: 10, y: 25, w: 1 })
  return data
}

/**
 * 生成异方差数据
 */
function generateHeteroscedastic() {
  const data = []
  for (let x = 1; x <= 25; x++) {
    const noise = (Math.random() - 0.5) * (x * 0.3)
    const y = 5 + 0.6 * x + noise
    data.push({ x, y, w: 1 })
  }
  return data
}

/**
 * 教科书数据集（用于单元测试）
 * Anscombe's Quartet 第一组
 */
export const ANSCOMBE_I = {
  x: [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5],
  y: [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68],
  expectedIntercept: 3,
  expectedSlope: 0.5,
  expectedRSquared: 0.666,
}

/**
 * 简单测试数据集（精确值）
 */
export const SIMPLE_TEST = {
  x: [1, 2, 3, 4, 5],
  y: [2, 4, 5, 4, 5],
}
