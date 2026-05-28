import { describe, test, expect } from 'vitest'
import { parseElement, parseMatrix, parseScalar, dimensions } from '../logic/parser.js'

describe('矩阵解析', () => {
  test('解析整数、小数、分数元素', () => {
    expect(parseElement(5)).toBe(5)
    expect(parseElement('3.14')).toBeCloseTo(3.14)
    expect(parseElement('1/2')).toBeCloseTo(0.5)
    expect(parseElement('-3/4')).toBeCloseTo(-0.75)
    expect(parseElement('  -5 / 2  ')).toBeCloseTo(-2.5)
  })

  test('解析 JSON 数组为矩阵', () => {
    const input = '[[1, 2], [3, 4]]'
    const result = parseMatrix(input)
    expect(result).toEqual([[1, 2], [3, 4]])
  })

  test('解析 JS 风格数组字面量', () => {
    const input = '[[1, 2, 3], [4, 5, 6]]'
    const result = parseMatrix(input)
    expect(result).toEqual([[1, 2, 3], [4, 5, 6]])
  })

  test('解析含分数的矩阵', () => {
    const input = '[["1/2", "1/3"], ["1/4", "1/5"]]'
    const result = parseMatrix(input)
    expect(result[0][0]).toBeCloseTo(0.5)
    expect(result[0][1]).toBeCloseTo(1 / 3)
    expect(result[1][0]).toBeCloseTo(0.25)
    expect(result[1][1]).toBeCloseTo(0.2)
  })

  test('空输入抛出错误', () => {
    expect(() => parseMatrix('')).toThrow('不能为空')
  })

  test('非二维数组抛出错误', () => {
    expect(() => parseMatrix('[1, 2, 3]')).toThrow('二维数组')
  })

  test('行列数不匹配抛出精确错误', () => {
    expect(() => parseMatrix('[[1, 2], [3]]')).toThrow('第 2 行列数不匹配')
  })

  test('无效元素抛出带行列位置的错误', () => {
    expect(() => parseMatrix('[[1, "abc"], [3, 4]]')).toThrow('第 1 行第 2 列')
  })

  test('分母为零抛出错误', () => {
    expect(() => parseElement('1/0')).toThrow('分母不能为零')
  })

  test('解析标量', () => {
    expect(parseScalar('5')).toBe(5)
    expect(parseScalar('2/3')).toBeCloseTo(2 / 3)
    expect(parseScalar('-3.14')).toBeCloseTo(-3.14)
  })

  test('获取矩阵维度', () => {
    expect(dimensions([[1, 2, 3], [4, 5, 6]])).toEqual({ rows: 2, cols: 3 })
    expect(dimensions([[1], [2], [3]])).toEqual({ rows: 3, cols: 1 })
  })
})
