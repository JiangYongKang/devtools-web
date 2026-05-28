import { describe, test, expect } from 'vitest'
import { add, subtract, multiply, scalarMultiply, transpose, identity, approxEqual, infinityNorm, oneNorm } from '../logic/operations.js'

describe('矩阵基本运算', () => {
  const A = [[1, 2], [3, 4]]
  const B = [[5, 6], [7, 8]]
  const C = [[1, 2, 3], [4, 5, 6]]
  const D = [[7, 8], [9, 10], [11, 12]]

  test('矩阵加法', () => {
    expect(add(A, B)).toEqual([[6, 8], [10, 12]])
  })

  test('矩阵减法', () => {
    expect(subtract(B, A)).toEqual([[4, 4], [4, 4]])
  })

  test('矩阵乘法 2×2', () => {
    expect(multiply(A, B)).toEqual([[19, 22], [43, 50]])
  })

  test('矩阵乘法 2×3 × 3×2', () => {
    const result = multiply(C, D)
    expect(result).toHaveLength(2)
    expect(result[0]).toHaveLength(2)
    expect(result[0][0]).toBe(1 * 7 + 2 * 9 + 3 * 11)
  })

  test('数乘', () => {
    expect(scalarMultiply(2, A)).toEqual([[2, 4], [6, 8]])
    expect(scalarMultiply(-1, A)).toEqual([[-1, -2], [-3, -4]])
  })

  test('转置', () => {
    expect(transpose(A)).toEqual([[1, 3], [2, 4]])
    expect(transpose(C)).toEqual([[1, 4], [2, 5], [3, 6]])
  })

  test('单位矩阵', () => {
    expect(identity(3)).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]])
  })

  test('加法维度不匹配抛出精确错误', () => {
    expect(() => add(A, C)).toThrow('A 为 2×2，B 为 2×3')
  })

  test('乘法维度不匹配抛出精确错误', () => {
    const D = [[7, 8], [9, 10], [11, 12]]
    expect(() => multiply(A, D)).toThrow('A 为 2×2，B 为 3×2，A 的列数需等于 B 的行数')
  })

  test('近似相等比较', () => {
    const A1 = [[1, 2], [3, 4]]
    const A2 = [[1, 2], [3, 4.000000001]]
    expect(approxEqual(A1, A2)).toBe(true)
    const A3 = [[1, 2], [3, 5]]
    expect(approxEqual(A1, A3)).toBe(false)
  })

  test('无穷范数（行和）', () => {
    expect(infinityNorm([[1, -2], [-3, 4]])).toBe(7)
    expect(infinityNorm([[1, 2, 3], [4, 5, 6]])).toBe(15)
  })

  test('1-范数（列和）', () => {
    expect(oneNorm([[1, -2], [-3, 4]])).toBe(6)
    expect(oneNorm([[1, 2], [3, 4], [5, 6]])).toBe(12)
  })
})
