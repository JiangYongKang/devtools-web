/**
 * 内置示例矩阵
 * 三组示例：可逆 3×3、奇异矩阵、病态 Hilbert 3×3
 */

/**
 * 可逆 3×3 矩阵
 * det = 1，条件数适中
 */
const INVERTIBLE_3X3 = {
  id: 'invertible-3x3',
  name: '可逆 3×3 矩阵',
  description: '行列式 det=1，条件数适中的可逆矩阵',
  matrix: [
    [2, -1, 0],
    [-1, 2, -1],
    [0, -1, 2]
  ],
  bVector: [1, 0, 0],
  expected: {
    determinant: 4,
    inverse: [
      [0.75, 0.5, 0.25],
      [0.5, 1, 0.5],
      [0.25, 0.5, 0.75]
    ],
    solution: [0.75, 0.5, 0.25]
  }
}

/**
 * 奇异矩阵：两行成比例，行列式为 0
 */
const SINGULAR_MATRIX = {
  id: 'singular-matrix',
  name: '奇异矩阵',
  description: '第 2 行 = 2 × 第 1 行，行列式为 0，不可逆',
  matrix: [
    [1, 2, 3],
    [2, 4, 6],
    [0, 1, 2]
  ],
  bVector: [6, 12, 3],
  expected: {
    determinant: 0,
    singular: true
  }
}

/**
 * 病态 Hilbert 3×3 矩阵
 * H[i][j] = 1/(i+j+1)，条件数约 524，接近病态边界
 */
const HILBERT_3X3 = {
  id: 'hilbert-3x3',
  name: '病态 Hilbert 3×3',
  description: 'Hilbert 矩阵 H[i][j] = 1/(i+j+1)，条件数约 524，数值计算需小心',
  matrix: [
    [1, 1 / 2, 1 / 3],
    [1 / 2, 1 / 3, 1 / 4],
    [1 / 3, 1 / 4, 1 / 5]
  ],
  bVector: [1, 0, 0],
  expected: {
    determinant: 1 / 2160,
    conditionNumberApprox: 524.06
  }
}

const EXAMPLES = [INVERTIBLE_3X3, SINGULAR_MATRIX, HILBERT_3X3]

/**
 * 将矩阵转换为 JSON 字符串（用于填充输入框）
 * @param {number[][]} mat - 矩阵
 * @returns {string} JSON 字符串
 */
function matrixToJson(mat) {
  return JSON.stringify(mat, null, 2)
}

/**
 * 将向量转换为 JSON 字符串
 * @param {number[]} vec - 向量
 * @returns {string} JSON 字符串
 */
function vectorToJson(vec) {
  return JSON.stringify(vec, null, 2)
}

export { EXAMPLES, INVERTIBLE_3X3, SINGULAR_MATRIX, HILBERT_3X3, matrixToJson, vectorToJson }
