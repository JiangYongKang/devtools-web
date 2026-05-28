import { describe, test, expect } from 'vitest'
import {
  DIM_NAMES,
  DIM_COUNT,
  createZeroVector,
  createBaseVector,
  addVectors,
  subtractVectors,
  multiplyVector,
  vectorsEqual,
  isDimensionless,
  formatVector,
} from '../logic/dimensions.js'

/**
 * 量纲向量运算测试
 */
describe('DIM_NAMES 与 DIM_COUNT', () => {
  test('七个基本量纲名称正确', () => {
    expect(DIM_NAMES).toEqual(['L', 'M', 'T', 'I', 'Θ', 'N', 'J'])
  })

  test('DIM_COUNT 等于 7', () => {
    expect(DIM_COUNT).toBe(7)
  })
})

describe('createZeroVector', () => {
  test('创建七个零组成的数组', () => {
    const v = createZeroVector()
    expect(v).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(v.length).toBe(7)
  })

  test('每次调用返回新数组', () => {
    const v1 = createZeroVector()
    const v2 = createZeroVector()
    expect(v1).not.toBe(v2)
  })
})

describe('createBaseVector', () => {
  test('创建长度基向量 L', () => {
    expect(createBaseVector(0)).toEqual([1, 0, 0, 0, 0, 0, 0])
  })

  test('创建质量基向量 M', () => {
    expect(createBaseVector(1)).toEqual([0, 1, 0, 0, 0, 0, 0])
  })

  test('创建时间基向量 T', () => {
    expect(createBaseVector(2)).toEqual([0, 0, 1, 0, 0, 0, 0])
  })

  test('创建温度基向量 Θ', () => {
    expect(createBaseVector(4)).toEqual([0, 0, 0, 0, 1, 0, 0])
  })

  test('每次调用返回新数组', () => {
    const v1 = createBaseVector(0)
    const v2 = createBaseVector(0)
    expect(v1).not.toBe(v2)
  })
})

describe('addVectors', () => {
  test('两个零向量相加仍为零', () => {
    const v1 = createZeroVector()
    const v2 = createZeroVector()
    expect(addVectors(v1, v2)).toEqual(createZeroVector())
  })

  test('力的量纲：L + M + T⁻²', () => {
    const L = createBaseVector(0)
    const M = createBaseVector(1)
    const T = createBaseVector(2)
    const T_neg2 = multiplyVector(T, -2)
    const force = addVectors(addVectors(L, M), T_neg2)
    expect(force).toEqual([1, 1, -2, 0, 0, 0, 0])
  })

  test('不修改输入向量', () => {
    const v1 = [1, 0, 0, 0, 0, 0, 0]
    const v2 = [0, 1, 0, 0, 0, 0, 0]
    addVectors(v1, v2)
    expect(v1).toEqual([1, 0, 0, 0, 0, 0, 0])
    expect(v2).toEqual([0, 1, 0, 0, 0, 0, 0])
  })
})

describe('subtractVectors', () => {
  test('速度的量纲：L - T', () => {
    const L = createBaseVector(0)
    const T = createBaseVector(2)
    const velocity = subtractVectors(L, T)
    expect(velocity).toEqual([1, 0, -1, 0, 0, 0, 0])
  })
})

describe('multiplyVector', () => {
  test('向量数乘：T × -2', () => {
    const T = createBaseVector(2)
    expect(multiplyVector(T, -2)).toEqual([0, 0, -2, 0, 0, 0, 0])
  })

  test('向量数乘：L × 2（面积）', () => {
    const L = createBaseVector(0)
    expect(multiplyVector(L, 2)).toEqual([2, 0, 0, 0, 0, 0, 0])
  })

  test('零向量数乘仍为零', () => {
    expect(multiplyVector(createZeroVector(), 5)).toEqual(createZeroVector())
  })
})

describe('vectorsEqual', () => {
  test('相同向量返回 true', () => {
    expect(vectorsEqual([1, 1, -2, 0, 0, 0, 0], [1, 1, -2, 0, 0, 0, 0])).toBe(true)
  })

  test('不同向量返回 false', () => {
    expect(vectorsEqual([1, 0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0, 0])).toBe(false)
  })

  test('牛顿与 kg·m/s² 量纲相同', () => {
    const N = [1, 1, -2, 0, 0, 0, 0]
    const kgm_s2 = addVectors(
      addVectors(createBaseVector(0), createBaseVector(1)),
      multiplyVector(createBaseVector(2), -2),
    )
    expect(vectorsEqual(N, kgm_s2)).toBe(true)
  })
})

describe('isDimensionless', () => {
  test('零向量返回 true', () => {
    expect(isDimensionless(createZeroVector())).toBe(true)
  })

  test('非零向量返回 false', () => {
    expect(isDimensionless([1, 0, 0, 0, 0, 0, 0])).toBe(false)
  })
})

describe('formatVector', () => {
  test('零向量格式化为 "1"', () => {
    expect(formatVector(createZeroVector())).toBe('1')
  })

  test('长度向量格式化为 "L"', () => {
    expect(formatVector(createBaseVector(0))).toBe('L')
  })

  test('速度 L·T⁻¹ 格式化', () => {
    const v = addVectors(createBaseVector(0), multiplyVector(createBaseVector(2), -1))
    expect(formatVector(v)).toBe('L·T⁻¹')
  })

  test('加速度 L·T⁻² 格式化', () => {
    const a = addVectors(createBaseVector(0), multiplyVector(createBaseVector(2), -2))
    expect(formatVector(a)).toBe('L·T⁻²')
  })

  test('力 L·M·T⁻² 格式化', () => {
    const F = addVectors(
      addVectors(createBaseVector(0), createBaseVector(1)),
      multiplyVector(createBaseVector(2), -2),
    )
    expect(formatVector(F)).toBe('L·M·T⁻²')
  })
})
