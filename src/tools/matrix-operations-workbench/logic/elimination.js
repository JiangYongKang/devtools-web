/**
 * 高斯消元逐步展示：仅支持 2×2 和 3×3 增广矩阵
 * 记录每一步行变换操作和增广矩阵状态
 */

import { dimensions, cloneMatrix } from './parser.js'

const MAX_DIM_FOR_ELIMINATION = 3

/**
 * 行操作类型
 * @typedef {'swap'|'scale'|'add'} RowOpType
 */

/**
 * 行操作日志
 * @typedef {Object} RowStep
 * @property {RowOpType} type - 操作类型
 * @property {string} description - 中文描述
 * @property {string} notation - 行变换记号，如 R2 ↔ R3, R2 ← 2R2, R3 ← R3 - 2R1
 * @property {number[][]} augmented - 操作后的增广矩阵
 */

/**
 * 格式化数值为字符串（最多 6 位有效数字）
 * @param {number} x - 数值
 * @returns {string} 格式化后的字符串
 */
function fmt(x) {
  if (Math.abs(x) < 1e-10) return '0'
  if (Math.abs(x) >= 1000 || Math.abs(x) < 0.001) {
    return x.toExponential(4)
  }
  return Number(x.toPrecision(6)).toString()
}

/**
 * 执行高斯消元并记录每一步
 * 仅支持 2×2 和 3×3 矩阵（系数矩阵维度）
 * @param {number[][]} A - 系数矩阵 (n×n)
 * @param {number[]} b - 右端向量
 * @returns {{steps: RowStep[], solution: number[]|null, singular: boolean, warning: string|null}}
 * @throws {Error} 维度超过限制时抛出
 */
function gaussianEliminationSteps(A, b) {
  const dim = dimensions(A)
  if (dim.rows !== dim.cols) {
    throw new Error(`高斯消元需要方阵系数矩阵，当前为 ${dim.rows}×${dim.cols}`)
  }
  const n = dim.rows
  if (n > MAX_DIM_FOR_ELIMINATION || n < 2) {
    throw new Error(`高斯消元步骤展示仅支持 2×2 和 3×3 矩阵，当前为 ${n}×${n}`)
  }

  const augmented = cloneMatrix(A)
  for (let i = 0; i < n; i++) {
    augmented[i].push(b[i])
  }

  const steps = []
  const cols = n + 1

  steps.push({
    type: 'swap',
    description: '初始增广矩阵 [A|b]',
    notation: '',
    augmented: cloneMatrix(augmented)
  })

  for (let col = 0; col < n - 1; col++) {
    let pivotRow = col
    let maxVal = Math.abs(augmented[col][col])
    for (let row = col + 1; row < n; row++) {
      const absVal = Math.abs(augmented[row][col])
      if (absVal > maxVal) {
        maxVal = absVal
        pivotRow = row
      }
    }

    if (pivotRow !== col) {
      ;[augmented[col], augmented[pivotRow]] = [augmented[pivotRow], augmented[col]]
      steps.push({
        type: 'swap',
        description: `交换第 ${col + 1} 行和第 ${pivotRow + 1} 行（部分主元选取）`,
        notation: `R${col + 1} ↔ R${pivotRow + 1}`,
        augmented: cloneMatrix(augmented)
      })
    }

    if (Math.abs(augmented[col][col]) < 1e-12) {
      return {
        steps,
        solution: null,
        singular: true,
        warning: `第 ${col + 1} 列主元接近零，矩阵可能奇异，无唯一解`
      }
    }

    for (let row = col + 1; row < n; row++) {
      const factor = augmented[row][col] / augmented[col][col]
      if (Math.abs(factor) < 1e-12) continue

      for (let k = col; k < cols; k++) {
        augmented[row][k] -= factor * augmented[col][k]
      }

      const factorStr = fmt(Math.abs(factor))
      const opSign = factor > 0 ? '-' : '+'
      const factorDisplay = Math.abs(factor) === 1 ? '' : factorStr
      steps.push({
        type: 'add',
        description: `第 ${row + 1} 行减去 ${fmt(factor)} 倍的第 ${col + 1} 行，消去第 ${col + 1} 列元素`,
        notation: `R${row + 1} ← R${row + 1} ${opSign} ${factorDisplay}R${col + 1}`,
        augmented: cloneMatrix(augmented)
      })
    }
  }

  if (Math.abs(augmented[n - 1][n - 1]) < 1e-12) {
    return {
      steps,
      solution: null,
      singular: true,
      warning: '最后一行主元为零，矩阵奇异，无唯一解'
    }
  }

  const solution = new Array(n)
  for (let i = n - 1; i >= 0; i--) {
    let sum = augmented[i][n]
    for (let j = i + 1; j < n; j++) {
      sum -= augmented[i][j] * solution[j]
    }
    solution[i] = sum / augmented[i][i]
  }

  if (n <= MAX_DIM_FOR_ELIMINATION) {
    const backSubSteps = []
    for (let i = n - 1; i >= 0; i--) {
      if (i === n - 1) {
        const val = fmt(augmented[i][n] / augmented[i][i])
        backSubSteps.push({
          type: 'add',
          description: `回代求 x${i + 1} = ${fmt(augmented[i][n])} / ${fmt(augmented[i][i])} = ${val}`,
          notation: `x${i + 1} = ${val}`,
          augmented: cloneMatrix(augmented)
        })
      } else {
        const coeffs = []
        for (let j = i + 1; j < n; j++) {
          coeffs.push(`${fmt(augmented[i][j])}·x${j + 1}`)
        }
        const val = fmt(solution[i])
        const expr = coeffs.length > 0
          ? `(${fmt(augmented[i][n])} - ${coeffs.join(' - ')}) / ${fmt(augmented[i][i])}`
          : `${fmt(augmented[i][n])} / ${fmt(augmented[i][i])}`
        backSubSteps.push({
          type: 'add',
          description: `回代求 x${i + 1} = ${expr} = ${val}`,
          notation: `x${i + 1} = ${val}`,
          augmented: cloneMatrix(augmented)
        })
      }
    }
    steps.push(...backSubSteps)
  }

  return {
    steps,
    solution,
    singular: false,
    warning: null
  }
}

export { gaussianEliminationSteps, MAX_DIM_FOR_ELIMINATION }
