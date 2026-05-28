/**
 * 方阵求逆：使用 LU 分解（带部分主元）
 * 条件数估算：cond(A) = ‖A‖ · ‖A⁻¹‖，使用无穷范数
 */

import { dimensions, cloneMatrix } from './parser.js'
import { identity, multiply, infinityNorm, oneNorm } from './operations.js'
import { luDecomposition, forwardSubstitution, backSubstitution, applyPermutation, MAX_DIM_FOR_LU } from './lu.js'
import { determinant } from './determinant.js'

const CONDITION_NUMBER_WARNING_THRESHOLD = 1e10

/**
 * 计算方阵的逆矩阵 A⁻¹
 * 通过求解 AX = I，其中 I 是单位矩阵
 * @param {number[][]} A - 方阵 (n×n)，n ≤ 8
 * @returns {{inverse: number[][], conditionNumber: number, singular: boolean, illConditioned: boolean, warnings: string[]}}
 * @throws {Error} 维度超过限制、非方阵或奇异时抛出
 */
function inverse(A) {
  const dim = dimensions(A)
  if (dim.rows !== dim.cols) {
    throw new Error(`求逆需要方阵，当前为 ${dim.rows}×${dim.cols}`)
  }
  const n = dim.rows
  if (n > MAX_DIM_FOR_LU) {
    throw new Error(`求逆最大支持 ${MAX_DIM_FOR_LU} 阶，当前为 ${n} 阶`)
  }

  const detResult = determinant(A)
  const warnings = []
  if (detResult.warning) warnings.push(detResult.warning)

  if (Math.abs(detResult.value) < 1e-10) {
    throw new Error('矩阵奇异，行列式接近零，不存在逆矩阵')
  }

  const { L, U, P, singular, singularWarning } = luDecomposition(A)
  if (singularWarning) warnings.push(singularWarning)

  const I = identity(n)
  const inv = []

  for (let col = 0; col < n; col++) {
    const b = I.map(row => row[col])
    const pb = applyPermutation(P, b)
    const y = forwardSubstitution(L, pb)
    const x = backSubstitution(U, y)
    inv.push(x)
  }

  const inverseMatrix = inv[0].map((_, j) => inv.map(row => row[j]))

  const normA = infinityNorm(A)
  const normInv = infinityNorm(inverseMatrix)
  const conditionNumber = normA * normInv

  const illConditioned = conditionNumber > CONDITION_NUMBER_WARNING_THRESHOLD
  if (illConditioned) {
    warnings.push(`条件数 ${conditionNumber.toExponential(2)} 较大，矩阵病态，数值计算可能不稳定`)
  }

  return {
    inverse: inverseMatrix,
    conditionNumber,
    singular,
    illConditioned,
    warnings
  }
}

/**
 * 估算矩阵的条件数：cond(A) = ‖A‖ · ‖A⁻¹‖
 * 默认使用无穷范数
 * @param {number[][]} A - 方阵
 * @param {'inf'|'1'} [normType='inf'] - 范数类型
 * @returns {{conditionNumber: number, normA: number, normInv: number, illConditioned: boolean}}
 */
function conditionNumber(A, normType = 'inf') {
  const { inverse: inv } = inverse(A)
  const normFunc = normType === '1' ? oneNorm : infinityNorm
  const normA = normFunc(A)
  const normInv = normFunc(inv)
  const cond = normA * normInv
  return {
    conditionNumber: cond,
    normA,
    normInv,
    illConditioned: cond > CONDITION_NUMBER_WARNING_THRESHOLD
  }
}

/**
 * 验证逆矩阵：检查 A * A⁻¹ ≈ I
 * @param {number[][]} A - 原矩阵
 * @param {number[][]} inv - 逆矩阵
 * @param {number} [tol=1e-8] - 容差
 * @returns {{valid: boolean, maxError: number}}
 */
function verifyInverse(A, inv, tol = 1e-8) {
  const product = multiply(A, inv)
  const n = product.length
  let maxError = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const expected = i === j ? 1 : 0
      const error = Math.abs(product[i][j] - expected)
      if (error > maxError) maxError = error
    }
  }
  return {
    valid: maxError < tol,
    maxError
  }
}

export { inverse, conditionNumber, verifyInverse, CONDITION_NUMBER_WARNING_THRESHOLD }
