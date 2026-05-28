import { describe, test, expect } from 'vitest'
import { luDecomposition, solveLinear } from '../logic/lu.js'
import { eigenvalues2x2, checkEigenvalueSupport } from '../logic/eigenvalues.js'
import { gaussianEliminationSteps } from '../logic/elimination.js'
import { matrixToLatex, vectorToLatex, toFraction } from '../logic/latex.js'
import { multiply } from '../logic/operations.js'

describe('LU 分解', () => {
  test('PA = LU 验证', () => {
    const A = [[2, -1, 0], [-1, 2, -1], [0, -1, 2]]
    const { L, U, P } = luDecomposition(A)
    const PA = multiply(P, A)
    const LU = multiply(L, U)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(PA[i][j]).toBeCloseTo(LU[i][j], 8)
      }
    }
  })

  test('L 为单位下三角', () => {
    const A = [[1, 2, 3], [4, 5, 6], [7, 8, 10]]
    const { L } = luDecomposition(A)
    for (let i = 0; i < 3; i++) {
      expect(L[i][i]).toBeCloseTo(1)
      for (let j = i + 1; j < 3; j++) {
        expect(L[i][j]).toBeCloseTo(0)
      }
    }
  })

  test('U 为上三角', () => {
    const A = [[1, 2, 3], [4, 5, 6], [7, 8, 10]]
    const { U } = luDecomposition(A)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < i; j++) {
        expect(U[i][j]).toBeCloseTo(0, 8)
      }
    }
  })

  test('solveLinear 解线性方程组', () => {
    const A = [[1, 2], [3, 4]]
    const b = [5, 11]
    const { x } = solveLinear(A, b)
    expect(x[0]).toBeCloseTo(1)
    expect(x[1]).toBeCloseTo(2)
  })

  test('部分主元选取：需要交换的情况', () => {
    const A = [[0.001, 1], [1, 1]]
    const { pivots } = luDecomposition(A)
    expect(pivots[0]).toBe(1)
  })
})

describe('特征值', () => {
  test('2×2 实特征值', () => {
    const A = [[2, 1], [1, 2]]
    const result = eigenvalues2x2(A)
    expect(result.complex).toBe(false)
    expect(result.eigenvalues).toEqual(expect.arrayContaining([3, 1]))
  })

  test('2×2 复特征值', () => {
    const A = [[0, 1], [-1, 0]]
    const result = eigenvalues2x2(A)
    expect(result.complex).toBe(true)
    expect(result.realParts[0]).toBeCloseTo(0)
    expect(Math.abs(result.imagParts[0])).toBeCloseTo(1)
  })

  test('2×2 迹和行列式验证', () => {
    const A = [[3, 4], [5, 6]]
    const result = eigenvalues2x2(A)
    expect(result.trace).toBe(9)
    expect(result.det).toBeCloseTo(-2)
    expect(result.eigenvalues[0] + result.eigenvalues[1]).toBeCloseTo(9)
  })

  test('大于 2×2 矩阵抛出范围提示', () => {
    const A = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
    expect(() => eigenvalues2x2(A)).toThrow('更大的矩阵请使用数值方法')
  })

  test('checkEigenvalueSupport 检测', () => {
    expect(checkEigenvalueSupport([[1, 2], [3, 4]]).supported).toBe(true)
    expect(checkEigenvalueSupport([[1, 2, 3], [4, 5, 6], [7, 8, 9]]).supported).toBe(false)
    expect(checkEigenvalueSupport([[1, 2, 3], [4, 5, 6]]).supported).toBe(false)
  })
})

describe('高斯消元步骤', () => {
  test('2×2 消元步骤', () => {
    const A = [[2, 1], [1, 3]]
    const b = [4, 5]
    const result = gaussianEliminationSteps(A, b)
    expect(result.singular).toBe(false)
    expect(result.solution[0]).toBeCloseTo(1.4)
    expect(result.solution[1]).toBeCloseTo(1.2)
    expect(result.steps.length).toBeGreaterThanOrEqual(4)
  })

  test('3×3 消元步骤包含行变换描述', () => {
    const A = [[1, 2, 3], [2, 5, 3], [1, 0, 8]]
    const b = [14, 21, 25]
    const result = gaussianEliminationSteps(A, b)
    expect(result.steps.some(s => s.description.includes('交换')) ||
           result.steps.some(s => s.description.includes('消去'))).toBe(true)
    expect(result.solution[0]).toBeCloseTo(1)
    expect(result.solution[1]).toBeCloseTo(2)
    expect(result.solution[2]).toBeCloseTo(3)
  })

  test('奇异矩阵消元检测', () => {
    const A = [[1, 2], [2, 4]]
    const b = [3, 6]
    const result = gaussianEliminationSteps(A, b)
    expect(result.singular).toBe(true)
    expect(result.warning).toBeDefined()
  })

  test('超过 3×3 抛出错误', () => {
    const A = Array(4).fill(0).map((_, i) =>
      Array(4).fill(0).map((_, j) => i === j ? 1 : 0)
    )
    const b = [1, 2, 3, 4]
    expect(() => gaussianEliminationSteps(A, b)).toThrow('仅支持 2×2 和 3×3')
  })
})

describe('LaTeX 转换', () => {
  test('矩阵转 LaTeX pmatrix', () => {
    const A = [[1, 2], [3, 4]]
    const latex = matrixToLatex(A, false)
    expect(latex).toContain('\\begin{pmatrix}')
    expect(latex).toContain('\\end{pmatrix}')
    expect(latex).toContain('1 & 2')
    expect(latex).toContain('3 & 4')
  })

  test('分数优先 LaTeX 输出', () => {
    const A = [[0.5, 0.3333333333333333], [0.25, 0.2]]
    const latex = matrixToLatex(A, true)
    expect(latex).toContain('\\frac{1}{2}')
    expect(latex).toContain('\\frac{1}{3}')
    expect(latex).toContain('\\frac{1}{4}')
    expect(latex).toContain('\\frac{1}{5}')
  })

  test('向量转 LaTeX', () => {
    const b = [1, 2, 3]
    const latex = vectorToLatex(b, false)
    expect(latex).toContain('\\begin{pmatrix}')
    expect(latex).toContain('1 \\\\')
    expect(latex).toContain('2 \\\\')
    expect(latex).toContain('3')
  })

  test('toFraction 浮点数转分数', () => {
    expect(toFraction(0.5)).toEqual({ numerator: 1, denominator: 2 })
    expect(toFraction(0.333333333333)).toEqual({ numerator: 1, denominator: 3 })
    expect(toFraction(2)).toEqual({ numerator: 2, denominator: 1 })
    expect(toFraction(-0.75)).toEqual({ numerator: -3, denominator: 4 })
  })
})
