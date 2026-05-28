/**
 * 方阵行列式计算：使用 LU 分解（带部分主元）
 * det(A) = det(P) * det(L) * det(U) = (-1)^s * product(diag(U))
 * 其中 s 是置换次数
 */

import { dimensions } from './parser.js'
import { luDecomposition, MAX_DIM_FOR_LU } from './lu.js'

/**
 * 计算方阵行列式
 * 使用部分主元 LU 分解，det(A) = (-1)^(置换次数) * ∏ U[i][i]
 * @param {number[][]} A - 方阵 (n×n)，n ≤ 8
 * @returns {{value: number, singular: boolean, warning: string|null}}
 * @throws {Error} 维度超过限制或非方阵时抛出
 */
function determinant(A) {
  const dim = dimensions(A)
  if (dim.rows !== dim.cols) {
    throw new Error(`行列式需要方阵，当前为 ${dim.rows}×${dim.cols}`)
  }
  const n = dim.rows
  if (n > MAX_DIM_FOR_LU) {
    throw new Error(`行列式最大支持 ${MAX_DIM_FOR_LU} 阶，当前为 ${n} 阶`)
  }

  const { U, pivots, singular, singularWarning } = luDecomposition(A)

  let sign = 1
  for (let i = 0; i < pivots.length; i++) {
    if (pivots[i] !== i) {
      sign = -sign
    }
  }

  let det = sign
  for (let i = 0; i < n; i++) {
    det *= U[i][i]
  }

  return {
    value: det,
    singular: singular || Math.abs(det) < 1e-10,
    warning: singularWarning || (Math.abs(det) < 1e-10 ? '行列式接近零，矩阵奇异' : null)
  }
}

/**
 * 判断矩阵是否为方阵
 * @param {number[][]} A - 矩阵
 * @returns {boolean} 是否为方阵
 */
function isSquare(A) {
  const dim = dimensions(A)
  return dim.rows === dim.cols
}

/**
 * 判断矩阵是否奇异（行列式接近零）
 * @param {number[][]} A - 方阵
 * @returns {{singular: boolean, determinant: number, warning: string|null}}
 */
function checkSingularity(A) {
  const result = determinant(A)
  return {
    singular: result.singular,
    determinant: result.value,
    warning: result.warning
  }
}

export { determinant, isSquare, checkSingularity }
