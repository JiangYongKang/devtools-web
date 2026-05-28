
/**
 * NPV（净现值）计算函数
 */

import { validateAndSortCashflows, getYearFraction, DAY_COUNT_METHODS } from './dateUtils.js';

/**
 * 计算 NPV（净现值）- 规整周期（每期相等时间间隔）
 * @param {Array<number>} cashflows - 现金流数组，第一个为初始投资
 * @param {number} discountRate - 贴现率（年化，如 0.1 表示 10%）
 * @returns {number} 净现值
 */
export function calculateNPV(cashflows, discountRate) {
  if (!Array.isArray(cashflows) || cashflows.length < 2) {
    throw new Error('现金流至少需要包含2条记录');
  }

  const rate = Number(discountRate);
  if (isNaN(rate)) {
    throw new Error('贴现率必须是有效数字');
  }

  let npv = 0;
  for (let t = 0; t < cashflows.length; t++) {
    const cf = Number(cashflows[t]);
    if (isNaN(cf)) {
      throw new Error(`现金流第 ${t} 期不是有效数字`);
    }
    npv += cf / Math.pow(1 + rate, t);
  }

  return npv;
}

/**
 * 计算 XNPV（带日期的净现值）- 非规整日期
 * @param {Array<{date: string|Date, amount: number}>} cashflows - 带日期的现金流数组
 * @param {number} discountRate - 贴现率（年化）
 * @param {string} dayCountMethod - 日计数法
 * @returns {number} 净现值
 */
export function calculateXNPV(cashflows, discountRate, dayCountMethod = DAY_COUNT_METHODS.ACT_365) {
  const sortedCashflows = validateAndSortCashflows(cashflows);
  const rate = Number(discountRate);

  if (isNaN(rate)) {
    throw new Error('贴现率必须是有效数字');
  }

  const startDate = sortedCashflows[0].date;
  let xnpv = 0;

  for (const cf of sortedCashflows) {
    const yearFraction = getYearFraction(startDate, cf.date, dayCountMethod);
    xnpv += cf.amount / Math.pow(1 + rate, yearFraction);
  }

  return xnpv;
}

/**
 * 计算 PV（现值）- 单笔未来现金流的现值
 * @param {number} futureValue - 未来值
 * @param {number} discountRate - 贴现率（每期）
 * @param {number} periods - 期数
 * @returns {number} 现值
 */
export function calculatePV(futureValue, discountRate, periods) {
  return futureValue / Math.pow(1 + discountRate, periods);
}

/**
 * 计算 FV（终值）- 单笔现值的未来值
 * @param {number} presentValue - 现值
 * @param {number} rate - 利率（每期）
 * @param {number} periods - 期数
 * @returns {number} 终值
 */
export function calculateFV(presentValue, rate, periods) {
  return presentValue * Math.pow(1 + rate, periods);
}

export { DAY_COUNT_METHODS };
