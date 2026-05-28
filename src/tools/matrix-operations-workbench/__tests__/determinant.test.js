import { describe, test, expect } from 'vitest'
import { determinant, isSquare, checkSingularity } from '../logic/determinant.js'
import { INVERTIBLE_3X3, SINGULAR_MATRIX, HILBERT_3X3 } from '../logic/examples.js'

describe('行列式计算', () => {
  test('2×2 行列式', () => {
    const A = [[1, 2], [3, 4]]
    const result = determinant(A)
    expect(result.value).toBeCloseTo(-2)
  })

  test('3×3 行列式（三对角可逆矩阵）', () => {
    const result = determinant(INVERTIBLE_3X3.matrix)
    expect(result.value).toBeCloseTo(INVERTIBLE_3X3.expected.determinant)
    expect(result.singular).toBe(false)
  })

  test('奇异矩阵行列式为零', () => {
    const result = determinant(SINGULAR_MATRIX.matrix)
    expect(Math.abs(result.value)).toBeLessThan(1e-10)
    expect(result.singular).toBe(true)
    expect(result.warning).toBeDefined()
  })

  test('Hilbert 3×3 行列式', () => {
    const result = determinant(HILBERT_3X3.matrix)
    expect(result.value).toBeCloseTo(HILBERT_3X3.expected.determinant, 6)
    expect(result.singular).toBe(false)
  })

  test('非方阵抛出错误', () => {
    expect(() => determinant([[1, 2, 3], [4, 5, 6]])).toThrow('需要方阵')
  })

  test('超过 8 阶抛出错误', () => {
    const big = Array(9).fill(0).map(() => Array(9).fill(1))
    expect(() => determinant(big)).toThrow('最大支持 8 阶')
  })

  test('isSquare 判断', () => {
    expect(isSquare([[1, 2], [3, 4]])).toBe(true)
    expect(isSquare([[1, 2, 3], [4, 5, 6]])).toBe(false)
  })

  test('checkSingularity 检测奇异矩阵', () => {
    const singular = checkSingularity(SINGULAR_MATRIX.matrix)
    expect(singular.singular).toBe(true)
    const invertible = checkSingularity(INVERTIBLE_3X3.matrix)
    expect(invertible.singular).toBe(false)
  })

  test('上三角矩阵行列式等于对角线乘积', () => {
    const U = [[2, 3, 4], [0, 5, 6], [0, 0, 7]]
    const result = determinant(U)
    expect(result.value).toBeCloseTo(2 * 5 * 7)
  })

  test('交换两行改变行列式符号', () => {
    const A = [[1, 2], [3, 4]]
    const B = [[3, 4], [1, 2]]
    const detA = determinant(A).value
    const detB = determinant(B).value
    expect(detB).toBeCloseTo(-detA)
  })
})
