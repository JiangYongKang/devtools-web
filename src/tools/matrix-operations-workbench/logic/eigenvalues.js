/**
 * 特征值计算：仅支持 2×2 矩阵的解析解
 * 更大的矩阵提示超出范围
 *
 * 对于 2×2 矩阵 [[a, b], [c, d]]：
 * 特征方程：λ² - (a+d)λ + (ad-bc) = 0
 * 解：λ = [tr ± √(tr² - 4det)] / 2
 */

import { dimensions } from './parser.js'
import { determinant } from './determinant.js'

/**
 * 计算 2×2 矩阵的特征值（解析解）
 * @param {number[][]} A - 2×2 方阵
 * @returns {{eigenvalues: number[], complex: boolean, realParts: number[], imagParts: number[], trace: number, det: number, discriminant: number}}
 * @throws {Error} 非 2×2 矩阵时抛出
 */
function eigenvalues2x2(A) {
  const dim = dimensions(A)
  if (dim.rows !== 2 || dim.cols !== 2) {
    throw new Error(`特征值解析解仅支持 2×2 矩阵，当前为 ${dim.rows}×${dim.cols}。更大的矩阵请使用数值方法（本工具暂不支持）`)
  }

  const a = A[0][0]
  const b = A[0][1]
  const c = A[1][0]
  const d = A[1][1]

  const trace = a + d
  const detResult = determinant(A)
  const det = detResult.value
  const discriminant = trace * trace - 4 * det

  let eigenvalues = []
  let complex = false
  const realParts = []
  const imagParts = []

  if (discriminant >= 0) {
    const sqrtDisc = Math.sqrt(discriminant)
    const lambda1 = (trace + sqrtDisc) / 2
    const lambda2 = (trace - sqrtDisc) / 2
    eigenvalues = [lambda1, lambda2]
    realParts.push(lambda1, lambda2)
    imagParts.push(0, 0)
  } else {
    complex = true
    const sqrtAbsDisc = Math.sqrt(-discriminant)
    const realPart = trace / 2
    const imagPart = sqrtAbsDisc / 2
    eigenvalues = [realPart, realPart]
    realParts.push(realPart, realPart)
    imagParts.push(imagPart, -imagPart)
  }

  return {
    eigenvalues,
    complex,
    realParts,
    imagParts,
    trace,
    det,
    discriminant
  }
}

/**
 * 检查矩阵维度是否支持特征值计算
 * @param {number[][]} A - 矩阵
 * @returns {{supported: boolean, n: number, message: string}}
 */
function checkEigenvalueSupport(A) {
  const dim = dimensions(A)
  const n = dim.rows
  const isSquare = dim.rows === dim.cols
  if (!isSquare) {
    return { supported: false, n, message: '特征值仅对方阵定义' }
  }
  if (n === 2) {
    return { supported: true, n, message: '支持 2×2 矩阵解析解' }
  }
  return {
    supported: false,
    n,
    message: `当前仅支持 2×2 矩阵特征值解析解，${n}×${n} 矩阵超出范围（需数值方法如 QR 迭代）`
  }
}

export { eigenvalues2x2, checkEigenvalueSupport }
