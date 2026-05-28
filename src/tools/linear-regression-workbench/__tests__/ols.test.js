/**
 * OLS 线性回归单元测试
 */

import {
  mean,
  sum,
  variance,
  stdDev,
  olsRegression,
  standardizedResiduals,
  flagOutliers,
  leverage,
  cookDistance,
  durbinWatson,
  predictionInterval,
  confidenceBand,
} from '../logic/ols.js'

import { SIMPLE_TEST, ANSCOMBE_I } from '../logic/data.js'

describe('OLS 基础统计函数', () => {
  test('mean 计算均值', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3)
    expect(mean([])).toBe(0)
  })

  test('sum 计算和', () => {
    expect(sum([1, 2, 3])).toBe(6)
    expect(sum([])).toBe(0)
  })

  test('variance 计算方差', () => {
    const v = variance([1, 2, 3, 4, 5])
    expect(v).toBeCloseTo(2.5, 5)
  })

  test('stdDev 计算标准差', () => {
    const s = stdDev([1, 2, 3, 4, 5])
    expect(s).toBeCloseTo(Math.sqrt(2.5), 5)
  })
})

describe('OLS 回归计算', () => {
  test('简单数据集回归系数正确', () => {
    const result = olsRegression(SIMPLE_TEST.x, SIMPLE_TEST.y)
    expect(result.slope).toBeCloseTo(0.6, 5)
    expect(result.intercept).toBeCloseTo(2.2, 5)
    expect(result.n).toBe(5)
  })

  test('Anscombe 数据集回归接近理论值', () => {
    const result = olsRegression(ANSCOMBE_I.x, ANSCOMBE_I.y)
    expect(result.intercept).toBeCloseTo(ANSCOMBE_I.expectedIntercept, 1)
    expect(result.slope).toBeCloseTo(ANSCOMBE_I.expectedSlope, 1)
    expect(result.rSquared).toBeGreaterThan(0.6)
  })

  test('R² 在有效范围内', () => {
    const result = olsRegression(SIMPLE_TEST.x, SIMPLE_TEST.y)
    expect(result.rSquared).toBeGreaterThanOrEqual(0)
    expect(result.rSquared).toBeLessThanOrEqual(1)
  })

  test('调整 R² 小于等于 R²', () => {
    const result = olsRegression(SIMPLE_TEST.x, SIMPLE_TEST.y)
    expect(result.adjustedRSquared).toBeLessThanOrEqual(result.rSquared)
  })

  test('残差和接近零', () => {
    const result = olsRegression(SIMPLE_TEST.x, SIMPLE_TEST.y)
    const sumResiduals = sum(result.residuals)
    expect(sumResiduals).toBeCloseTo(0, 5)
  })
})

describe('诊断指标', () => {
  test('标准化残差标准差接近 1', () => {
    const result = olsRegression(SIMPLE_TEST.x, SIMPLE_TEST.y)
    const stdRes = standardizedResiduals(result.residuals)
    const s = stdDev(stdRes)
    expect(s).toBeCloseTo(1, 5)
  })

  test('异常点标记正确识别极端值', () => {
    const residuals = [0.1, -0.2, 3.5, -0.1, 0.2]
    const outliers = flagOutliers(residuals, 2)
    expect(outliers[2]).toBe(true)
  })

  test('杠杆值和为参数个数', () => {
    const lev = leverage(SIMPLE_TEST.x)
    const sumLev = sum(lev)
    expect(sumLev).toBeCloseTo(2, 5)
  })

  test('Cook 距离非负', () => {
    const result = olsRegression(SIMPLE_TEST.x, SIMPLE_TEST.y)
    const lev = leverage(SIMPLE_TEST.x)
    const cook = cookDistance(result.residuals, lev, result.residualStdError)
    cook.forEach((d) => expect(d).toBeGreaterThanOrEqual(0))
  })

  test('Durbin-Watson 在 0-4 范围内', () => {
    const result = olsRegression(SIMPLE_TEST.x, SIMPLE_TEST.y)
    const dw = durbinWatson(result.residuals)
    expect(dw).toBeGreaterThanOrEqual(0)
    expect(dw).toBeLessThanOrEqual(4)
  })
})

describe('区间估计', () => {
  test('预测区间包含拟合值', () => {
    const result = olsRegression(SIMPLE_TEST.x, SIMPLE_TEST.y)
    const pi = predictionInterval(result, 3, 0.95)
    expect(pi.fit).toBe(result.intercept + result.slope * 3)
    expect(pi.lower).toBeLessThan(pi.fit)
    expect(pi.upper).toBeGreaterThan(pi.fit)
  })

  test('置信带随置信水平增大而变宽', () => {
    const result = olsRegression(SIMPLE_TEST.x, SIMPLE_TEST.y)
    const xValues = [2, 3, 4]
    const band90 = confidenceBand(result, xValues, 0.90)
    const band99 = confidenceBand(result, xValues, 0.99)
    expect(band99[1].upper - band99[1].lower).toBeGreaterThan(
      band90[1].upper - band90[1].lower
    )
  })
})

describe('加权最小二乘', () => {
  test('等权重时 WLS 等于 OLS', () => {
    const weights = Array(SIMPLE_TEST.x.length).fill(1)
    const olsResult = olsRegression(SIMPLE_TEST.x, SIMPLE_TEST.y)
    const wlsResult = olsRegression(SIMPLE_TEST.x, SIMPLE_TEST.y, weights)
    expect(wlsResult.slope).toBeCloseTo(olsResult.slope, 10)
    expect(wlsResult.intercept).toBeCloseTo(olsResult.intercept, 10)
  })
})
