import { describe, test, expect } from 'vitest'
import { inverse, conditionNumber, verifyInverse } from '../logic/inverse.js'
import { multiply, approxEqual } from '../logic/operations.js'
import { INVERTIBLE_3X3, SINGULAR_MATRIX, HILBERT_3X3 } from '../logic/examples.js'

describe('逆矩阵与条件数', () => {
  test('2×2 矩阵求逆', () => {
    const A = [[1, 2], [3, 4]]
    const result = inverse(A)
    expect(result.inverse).toHaveLength(2)
    expect(result.inverse[0]).toHaveLength(2)
    const product = multiply(A, result.inverse)
    expect(approxEqual(product, [[1, 0], [0, 1]])).toBe(true)
  })

  test('3×3 可逆矩阵求逆', () => {
    const result = inverse(INVERTIBLE_3X3.matrix)
    expect(result.singular).toBe(false)
    const expected = INVERTIBLE_3X3.expected.inverse
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(result.inverse[i][j]).toBeCloseTo(expected[i][j], 8)
      }
    }
  })

  test('验证 A * A⁻¹ = I', () => {
    const result = inverse(INVERTIBLE_3X3.matrix)
    const verification = verifyInverse(INVERTIBLE_3X3.matrix, result.inverse)
    expect(verification.valid).toBe(true)
    expect(verification.maxError).toBeLessThan(1e-10)
  })

  test('奇异矩阵求逆抛出错误', () => {
    expect(() => inverse(SINGULAR_MATRIX.matrix)).toThrow('奇异')
  })

  test('Hilbert 3×3 条件数估算', () => {
    const result = inverse(HILBERT_3X3.matrix)
    expect(result.conditionNumber).toBeGreaterThan(700)
    expect(result.conditionNumber).toBeLessThan(800)
  })

  test('conditionNumber 函数独立调用', () => {
    const result = conditionNumber(INVERTIBLE_3X3.matrix)
    expect(result.conditionNumber).toBeGreaterThan(0)
    expect(result.illConditioned).toBe(false)
  })

  test('非方阵求逆抛出错误', () => {
    expect(() => inverse([[1, 2, 3], [4, 5, 6]])).toThrow('方阵')
  })

  test('超过 8 阶求逆抛出错误', () => {
    const big = Array(9).fill(0).map((_, i) =>
      Array(9).fill(0).map((_, j) => i === j ? 1 : 0)
    )
    expect(() => inverse(big)).toThrow('最大支持 8 阶')
  })

  test('逆矩阵条件数边界：病态矩阵警告', () => {
    const ill = [
      [1, 1000],
      [1000, 1000001]
    ]
    const result = inverse(ill)
    expect(result.illConditioned).toBe(true)
    expect(result.warnings.some(w => w.includes('病态'))).toBe(true)
  })

  test('2×2 已知逆矩阵验证', () => {
    const A = [[2, 1], [1, 2]]
    const result = inverse(A)
    const expected = [[2 / 3, -1 / 3], [-1 / 3, 2 / 3]]
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        expect(result.inverse[i][j]).toBeCloseTo(expected[i][j], 8)
      }
    }
  })
})
