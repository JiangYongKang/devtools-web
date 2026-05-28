/**
 * 矩阵基本运算：加减、乘法、数乘、转置
 * 所有函数为纯函数，不修改输入参数
 */

import { dimensions, cloneMatrix } from './parser.js'

/**
 * 矩阵加法：A + B
 * @param {number[][]} A - 矩阵 A
 * @param {number[][]} B - 矩阵 B
 * @returns {number[][]} 结果矩阵
 * @throws {Error} 维度不匹配时抛出精确错误
 */
function add(A, B) {
  const dimA = dimensions(A)
  const dimB = dimensions(B)
  if (dimA.rows !== dimB.rows || dimA.cols !== dimB.cols) {
    throw new Error(`矩阵加法维度不匹配：A 为 ${dimA.rows}×${dimA.cols}，B 为 ${dimB.rows}×${dimB.cols}，需维度相同`)
  }
  const result = []
  for (let i = 0; i < dimA.rows; i++) {
    const row = []
    for (let j = 0; j < dimA.cols; j++) {
      row.push(A[i][j] + B[i][j])
    }
    result.push(row)
  }
  return result
}

/**
 * 矩阵减法：A - B
 * @param {number[][]} A - 矩阵 A
 * @param {number[][]} B - 矩阵 B
 * @returns {number[][]} 结果矩阵
 * @throws {Error} 维度不匹配时抛出精确错误
 */
function subtract(A, B) {
  const dimA = dimensions(A)
  const dimB = dimensions(B)
  if (dimA.rows !== dimB.rows || dimA.cols !== dimB.cols) {
    throw new Error(`矩阵减法维度不匹配：A 为 ${dimA.rows}×${dimA.cols}，B 为 ${dimB.rows}×${dimB.cols}，需维度相同`)
  }
  const result = []
  for (let i = 0; i < dimA.rows; i++) {
    const row = []
    for (let j = 0; j < dimA.cols; j++) {
      row.push(A[i][j] - B[i][j])
    }
    result.push(row)
  }
  return result
}

/**
 * 矩阵乘法：A × B
 * @param {number[][]} A - 矩阵 A (m×n)
 * @param {number[][]} B - 矩阵 B (n×p)
 * @returns {number[][]} 结果矩阵 (m×p)
 * @throws {Error} 维度不匹配时抛出精确错误
 */
function multiply(A, B) {
  const dimA = dimensions(A)
  const dimB = dimensions(B)
  if (dimA.cols !== dimB.rows) {
    throw new Error(`矩阵乘法维度不匹配：A 为 ${dimA.rows}×${dimA.cols}，B 为 ${dimB.rows}×${dimB.cols}，A 的列数需等于 B 的行数`)
  }
  const m = dimA.rows
  const n = dimA.cols
  const p = dimB.cols
  const result = []
  for (let i = 0; i < m; i++) {
    const row = []
    for (let j = 0; j < p; j++) {
      let sum = 0
      for (let k = 0; k < n; k++) {
        sum += A[i][k] * B[k][j]
      }
      row.push(sum)
    }
    result.push(row)
  }
  return result
}

/**
 * 数乘：k × A
 * @param {number} k - 标量
 * @param {number[][]} A - 矩阵 A
 * @returns {number[][]} 结果矩阵
 */
function scalarMultiply(k, A) {
  const dim = dimensions(A)
  const result = []
  for (let i = 0; i < dim.rows; i++) {
    const row = []
    for (let j = 0; j < dim.cols; j++) {
      row.push(k * A[i][j])
    }
    result.push(row)
  }
  return result
}

/**
 * 矩阵转置：A^T
 * @param {number[][]} A - 矩阵 A (m×n)
 * @returns {number[][]} 转置矩阵 (n×m)
 */
function transpose(A) {
  const dim = dimensions(A)
  const result = []
  for (let j = 0; j < dim.cols; j++) {
    const row = []
    for (let i = 0; i < dim.rows; i++) {
      row.push(A[i][j])
    }
    result.push(row)
  }
  return result
}

/**
 * 生成 n 阶单位矩阵
 * @param {number} n - 阶数
 * @returns {number[][]} n 阶单位矩阵
 */
function identity(n) {
  const result = []
  for (let i = 0; i < n; i++) {
    const row = []
    for (let j = 0; j < n; j++) {
      row.push(i === j ? 1 : 0)
    }
    result.push(row)
  }
  return result
}

/**
 * 逐元素比较矩阵是否近似相等
 * @param {number[][]} A - 矩阵 A
 * @param {number[][]} B - 矩阵 B
 * @param {number} [tol=1e-8] - 容差
 * @returns {boolean} 是否近似相等
 */
function approxEqual(A, B, tol = 1e-8) {
  const dimA = dimensions(A)
  const dimB = dimensions(B)
  if (dimA.rows !== dimB.rows || dimA.cols !== dimB.cols) return false
  for (let i = 0; i < dimA.rows; i++) {
    for (let j = 0; j < dimA.cols; j++) {
      if (Math.abs(A[i][j] - B[i][j]) > tol) return false
    }
  }
  return true
}

/**
 * 计算矩阵的无穷范数（行和范数）‖A‖_∞
 * @param {number[][]} A - 矩阵
 * @returns {number} 无穷范数
 */
function infinityNorm(A) {
  const dim = dimensions(A)
  let max = 0
  for (let i = 0; i < dim.rows; i++) {
    let rowSum = 0
    for (let j = 0; j < dim.cols; j++) {
      rowSum += Math.abs(A[i][j])
    }
    if (rowSum > max) max = rowSum
  }
  return max
}

/**
 * 计算矩阵的 1-范数（列和范数）‖A‖₁
 * @param {number[][]} A - 矩阵
 * @returns {number} 1-范数
 */
function oneNorm(A) {
  const dim = dimensions(A)
  let max = 0
  for (let j = 0; j < dim.cols; j++) {
    let colSum = 0
    for (let i = 0; i < dim.rows; i++) {
      colSum += Math.abs(A[i][j])
    }
    if (colSum > max) max = colSum
  }
  return max
}

export { add, subtract, multiply, scalarMultiply, transpose, identity, approxEqual, infinityNorm, oneNorm }
