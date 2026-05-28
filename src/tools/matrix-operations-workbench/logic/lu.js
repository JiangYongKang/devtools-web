/**
 * LU 分解（带部分主元）：PA = LU
 * L 为单位下三角矩阵，U 为上三角矩阵，P 为置换矩阵
 */

import { dimensions, cloneMatrix } from './parser.js'
import { identity } from './operations.js'

const MAX_DIM_FOR_LU = 8

/**
 * LU 分解（带部分主元选取）
 * PA = LU，其中 L 是单位下三角，U 是上三角，P 是置换矩阵
 * @param {number[][]} A - 方阵 (n×n)，n ≤ 8
 * @returns {{L: number[][], U: number[][], P: number[][], pivots: number[], singular: boolean, singularWarning: string|null}}
 * @throws {Error} 维度超过限制或非方阵时抛出
 */
function luDecomposition(A) {
  const dim = dimensions(A)
  if (dim.rows !== dim.cols) {
    throw new Error(`LU 分解需要方阵，当前为 ${dim.rows}×${dim.cols}`)
  }
  const n = dim.rows
  if (n > MAX_DIM_FOR_LU) {
    throw new Error(`LU 分解最大支持 ${MAX_DIM_FOR_LU} 阶，当前为 ${n} 阶`)
  }

  const U = cloneMatrix(A)
  const L = identity(n)
  const P = identity(n)
  const pivots = []
  let singular = false
  let singularWarning = null

  for (let col = 0; col < n - 1; col++) {
    let pivotRow = col
    let maxVal = Math.abs(U[col][col])
    for (let row = col + 1; row < n; row++) {
      const absVal = Math.abs(U[row][col])
      if (absVal > maxVal) {
        maxVal = absVal
        pivotRow = row
      }
    }

    if (maxVal < 1e-12) {
      singular = true
      singularWarning = `第 ${col + 1} 列主元接近零（${maxVal.toExponential(2)}），矩阵可能奇异`
    }

    if (pivotRow !== col) {
      ;[U[col], U[pivotRow]] = [U[pivotRow], U[col]]
      ;[P[col], P[pivotRow]] = [P[pivotRow], P[col]]
      if (col > 0) {
        for (let k = 0; k < col; k++) {
          ;[L[col][k], L[pivotRow][k]] = [L[pivotRow][k], L[col][k]]
        }
      }
    }

    pivots.push(pivotRow)

    for (let row = col + 1; row < n; row++) {
      if (Math.abs(U[col][col]) < 1e-12) {
        L[row][col] = 0
        continue
      }
      const factor = U[row][col] / U[col][col]
      L[row][col] = factor
      for (let k = col; k < n; k++) {
        U[row][k] -= factor * U[col][k]
      }
    }
  }

  if (Math.abs(U[n - 1][n - 1]) < 1e-12) {
    singular = true
    singularWarning = singularWarning || `最后一列主元接近零（${Math.abs(U[n - 1][n - 1]).toExponential(2)}），矩阵可能奇异`
  }

  return { L, U, P, pivots, singular, singularWarning }
}

/**
 * 前向回代求解 LY = PB，其中 L 是单位下三角
 * @param {number[][]} L - 单位下三角矩阵
 * @param {number[]} b - 右端向量
 * @returns {number[]} 解向量 Y
 */
function forwardSubstitution(L, b) {
  const n = L.length
  const y = new Array(n)
  for (let i = 0; i < n; i++) {
    let sum = b[i]
    for (let j = 0; j < i; j++) {
      sum -= L[i][j] * y[j]
    }
    y[i] = sum
  }
  return y
}

/**
 * 回代求解 UX = Y，其中 U 是上三角
 * @param {number[][]} U - 上三角矩阵
 * @param {number[]} y - 右端向量
 * @returns {number[]} 解向量 X
 * @throws {Error} 遇到零主元时抛出
 */
function backSubstitution(U, y) {
  const n = U.length
  const x = new Array(n)
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(U[i][i]) < 1e-12) {
      throw new Error(`回代遇到零主元（第 ${i + 1} 行），矩阵奇异`)
    }
    let sum = y[i]
    for (let j = i + 1; j < n; j++) {
      sum -= U[i][j] * x[j]
    }
    x[i] = sum / U[i][i]
  }
  return x
}

/**
 * 应用置换矩阵 P 到向量 b
 * @param {number[][]} P - 置换矩阵
 * @param {number[]} b - 向量
 * @returns {number[]} Pb
 */
function applyPermutation(P, b) {
  const n = P.length
  const pb = new Array(n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (P[i][j] === 1) {
        pb[i] = b[j]
        break
      }
    }
  }
  return pb
}

/**
 * 解线性方程组 Ax = b，使用 LU 分解
 * @param {number[][]} A - 系数矩阵
 * @param {number[]} b - 右端向量
 * @returns {{x: number[], singular: boolean, warning: string|null}}
 */
function solveLinear(A, b) {
  const { L, U, P, singular, singularWarning } = luDecomposition(A)
  const pb = applyPermutation(P, b)
  const y = forwardSubstitution(L, pb)
  const x = backSubstitution(U, y)
  return { x, singular, warning: singularWarning }
}

export { luDecomposition, forwardSubstitution, backSubstitution, applyPermutation, solveLinear, MAX_DIM_FOR_LU }
