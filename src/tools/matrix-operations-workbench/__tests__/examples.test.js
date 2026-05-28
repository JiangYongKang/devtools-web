import { describe, test, expect } from 'vitest'
import { EXAMPLES, INVERTIBLE_3X3, SINGULAR_MATRIX, HILBERT_3X3 } from '../logic/examples.js'
import { determinant, checkSingularity } from '../logic/determinant.js'
import { inverse } from '../logic/inverse.js'
import { luDecomposition } from '../logic/lu.js'
import { gaussianEliminationSteps } from '../logic/elimination.js'

describe('示例矩阵', () => {
  test('三组示例均存在且配置正确', () => {
    expect(EXAMPLES).toHaveLength(3)
    for (const e of EXAMPLES) {
      expect(e.id).toBeDefined()
      expect(e.name).toBeDefined()
      expect(e.description).toBeDefined()
      expect(e.matrix).toBeDefined()
      expect(e.matrix.length).toBe(3)
      expect(e.matrix[0].length).toBe(3)
    }
  })

  test('可逆 3×3 示例验证：行列式、逆、消元', () => {
    const det = determinant(INVERTIBLE_3X3.matrix)
    expect(det.value).toBeCloseTo(4)
    expect(det.singular).toBe(false)

    const inv = inverse(INVERTIBLE_3X3.matrix)
    expect(inv.singular).toBe(false)
    expect(inv.illConditioned).toBe(false)

    const lu = luDecomposition(INVERTIBLE_3X3.matrix)
    expect(lu.singular).toBe(false)

    const elim = gaussianEliminationSteps(INVERTIBLE_3X3.matrix, INVERTIBLE_3X3.bVector)
    expect(elim.singular).toBe(false)
    expect(elim.solution).toHaveLength(3)
    expect(elim.steps.length).toBeGreaterThan(3)
  })

  test('奇异矩阵示例验证：行列式为零、求逆失败', () => {
    const det = determinant(SINGULAR_MATRIX.matrix)
    expect(Math.abs(det.value)).toBeLessThan(1e-10)
    expect(det.singular).toBe(true)

    const sing = checkSingularity(SINGULAR_MATRIX.matrix)
    expect(sing.singular).toBe(true)

    expect(() => inverse(SINGULAR_MATRIX.matrix)).toThrow('奇异')
  })

  test('Hilbert 3×3 示例验证：条件数较大', () => {
    const det = determinant(HILBERT_3X3.matrix)
    expect(Math.abs(det.value)).toBeCloseTo(1 / 2160, 6)

    const inv = inverse(HILBERT_3X3.matrix)
    expect(inv.conditionNumber).toBeGreaterThan(700)
    expect(inv.conditionNumber).toBeLessThan(800)

    const elim = gaussianEliminationSteps(HILBERT_3X3.matrix, HILBERT_3X3.bVector)
    expect(elim.singular).toBe(false)
    expect(elim.solution).toHaveLength(3)
  })

  test('可逆 3×3 高斯消元解正确', () => {
    const elim = gaussianEliminationSteps(INVERTIBLE_3X3.matrix, INVERTIBLE_3X3.bVector)
    const expected = INVERTIBLE_3X3.expected.solution
    for (let i = 0; i < 3; i++) {
      expect(elim.solution[i]).toBeCloseTo(expected[i], 8)
    }
  })

  test('三组示例矩阵 ID 唯一', () => {
    const ids = EXAMPLES.map(e => e.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(3)
  })

  test('可逆 3×3 消元步骤包含行变换记号', () => {
    const elim = gaussianEliminationSteps(INVERTIBLE_3X3.matrix, INVERTIBLE_3X3.bVector)
    const notations = elim.steps.map(s => s.notation).filter(n => n.length > 0)
    expect(notations.length).toBeGreaterThan(0)
    expect(notations.some(n => n.includes('R'))).toBe(true)
  })
})
