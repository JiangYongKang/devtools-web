/**
 * 数据解析单元测试
 */

import { parseData, exportPredictionsCSV, coefficientTableMarkdown, EXAMPLES } from '../logic/data.js'
import { olsRegression } from '../logic/ols.js'

describe('数据解析', () => {
  test('解析 CSV 格式数据', () => {
    const csv = '1,2\n2,4\n3,5'
    const result = parseData(csv)
    expect(result.ok).toBe(true)
    expect(result.data.length).toBe(3)
    expect(result.data[0].x).toBe(1)
    expect(result.data[0].y).toBe(2)
  })

  test('解析制表符分隔数据', () => {
    const tsv = '1\t2\n2\t4\n3\t5'
    const result = parseData(tsv)
    expect(result.ok).toBe(true)
    expect(result.data.length).toBe(3)
  })

  test('识别无效数据行', () => {
    const csv = '1,2\nabc,4\n3,xyz'
    const result = parseData(csv)
    expect(result.ok).toBe(true)
    expect(result.data.length).toBe(1)
    expect(result.invalidRows.length).toBe(2)
  })

  test('识别缺失数据行', () => {
    const csv = '1,2\n3\n4,5'
    const result = parseData(csv)
    expect(result.ok).toBe(true)
    expect(result.missingRows.length).toBeGreaterThan(0)
  })

  test('空数据返回错误', () => {
    const result = parseData('')
    expect(result.ok).toBe(false)
  })

  test('解析带权重的三列数据', () => {
    const csv = '1,2,1\n2,4,0.5\n3,5,2'
    const result = parseData(csv)
    expect(result.ok).toBe(true)
    expect(result.data[0].w).toBe(1)
    expect(result.data[1].w).toBe(0.5)
    expect(result.data[2].w).toBe(2)
  })
})

describe('导出功能', () => {
  const testData = [
    { x: 1, y: 2, w: 1 },
    { x: 2, y: 4, w: 1 },
    { x: 3, y: 5, w: 1 },
  ]
  const x = testData.map((d) => d.x)
  const y = testData.map((d) => d.y)
  const regression = olsRegression(x, y)

  test('导出预测 CSV', () => {
    const csv = exportPredictionsCSV(testData, regression)
    expect(csv).toContain('x,y,fitted')
    expect(csv.split('\n').length).toBe(testData.length + 1)
  })

  test('生成 Markdown 系数表', () => {
    const md = coefficientTableMarkdown(regression)
    expect(md).toContain('回归系数表')
    expect(md).toContain('模型摘要')
    expect(md).toContain('截距')
    expect(md).toContain('斜率')
  })
})

describe('示例数据集', () => {
  test('示例数据集包含有效数据', () => {
    Object.values(EXAMPLES).forEach((example) => {
      expect(example.data.length).toBeGreaterThan(0)
      example.data.forEach((d) => {
        expect(typeof d.x).toBe('number')
        expect(typeof d.y).toBe('number')
      })
    })
  })
})
