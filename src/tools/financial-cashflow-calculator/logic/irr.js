
/**
 * IRR（内部收益率）和 XIRR 计算函数
 * 使用 Newton-Raphson 迭代法 + 多初值防发散
 */

import { validateAndSortCashflows, getYearFraction, DAY_COUNT_METHODS } from './dateUtils.js';

const DEFAULT_MAX_ITERATIONS = 1000;
const DEFAULT_TOLERANCE = 1e-10;
const INITIAL_GUESSES = [-0.99, -0.5, 0, 0.1, 0.25, 0.5, 0.75, 1, 2, 5];

/**
 * 计算 NPV 函数及其导数（用于 IRR 计算）
 * @param {Array<number>} cashflows - 现金流数组
 * @param {number} rate - 贴现率
 * @returns {{npv: number, derivative: number}} NPV 和导数
 */
function npvWithDerivative(cashflows, rate) {
  let npv = 0;
  let derivative = 0;
  const onePlusRate = 1 + rate;

  for (let t = 0; t < cashflows.length; t++) {
    const discountFactor = Math.pow(onePlusRate, -t);
    npv += cashflows[t] * discountFactor;
    if (t > 0) {
      derivative -= t * cashflows[t] * discountFactor / onePlusRate;
    }
  }

  return { npv, derivative };
}

/**
 * 使用 Newton-Raphson 法求解 IRR
 * @param {Array<number>} cashflows - 现金流数组
 * @param {number} initialGuess - 初始猜测值
 * @param {number} maxIterations - 最大迭代次数
 * @param {number} tolerance - 收敛容差
 * @returns {{irr: number|null, converged: boolean}} 结果
 */
function newtonRaphsonIRR(cashflows, initialGuess, maxIterations, tolerance) {
  let rate = initialGuess;

  for (let i = 0; i < maxIterations; i++) {
    const { npv, derivative } = npvWithDerivative(cashflows, rate);

    if (Math.abs(npv) < tolerance) {
      return { irr: rate, converged: true };
    }

    if (Math.abs(derivative) < 1e-15) {
      break;
    }

    const newRate = rate - npv / derivative;

    if (newRate <= -1) {
      break;
    }

    if (Math.abs(newRate - rate) < tolerance) {
      return { irr: newRate, converged: true };
    }

    rate = newRate;
  }

  return { irr: null, converged: false };
}

/**
 * 计算 IRR（内部收益率）- 规整周期
 * @param {Array<number>} cashflows - 现金流数组
 * @param {Object} options - 计算选项
 * @returns {{irr: number|null, hasMultipleIRR: boolean, message: string}} 结果
 */
export function calculateIRR(cashflows, options = {}) {
  const {
    maxIterations = DEFAULT_MAX_ITERATIONS,
    tolerance = DEFAULT_TOLERANCE,
  } = options;

  if (!Array.isArray(cashflows) || cashflows.length < 2) {
    throw new Error('现金流至少需要包含2条记录');
  }

  const parsedCF = cashflows.map(Number);
  if (parsedCF.some(isNaN)) {
    throw new Error('现金流必须都是有效数字');
  }

  const hasPositive = parsedCF.some(cf => cf > 0);
  const hasNegative = parsedCF.some(cf => cf < 0);
  if (!hasPositive || !hasNegative) {
    return { irr: null, hasMultipleIRR: false, message: '现金流必须同时包含正负数' };
  }

  const signChanges = countSignChanges(parsedCF);
  const hasMultipleIRR = signChanges >= 2;

  const foundSolutions = new Map();

  for (const guess of INITIAL_GUESSES) {
    const result = newtonRaphsonIRR(parsedCF, guess, maxIterations, tolerance);
    if (result.converged && result.irr !== null) {
      const rounded = Math.round(result.irr * 1e6) / 1e6;
      if (!foundSolutions.has(rounded)) {
        foundSolutions.set(rounded, result.irr);
      }
    }
  }

  if (foundSolutions.size === 0) {
    return { irr: null, hasMultipleIRR, message: hasMultipleIRR ? '可能存在多重 IRR，无法收敛到唯一解' : '未找到有效的 IRR 解' };
  }

  if (foundSolutions.size > 1) {
    const solutions = Array.from(foundSolutions.values()).sort((a, b) => a - b);
    return {
      irr: null,
      hasMultipleIRR: true,
      message: `检测到多重 IRR 解：${solutions.map(s => (s * 100).toFixed(2) + '%').join(', ')}，请结合具体场景分析`,
      solutions,
    };
  }

  return {
    irr: foundSolutions.values().next().value,
    hasMultipleIRR: false,
    message: '计算成功',
  };
}

/**
 * 计算 XNPV 函数及其导数（用于 XIRR 计算）
 * @param {Array<{date: Date, amount: number}>} cashflows - 带日期的现金流数组
 * @param {number} rate - 贴现率
 * @param {string} dayCountMethod - 日计数法
 * @param {Date} startDate - 起始日期
 * @returns {{xnpv: number, derivative: number}} XNPV 和导数
 */
function xnpvWithDerivative(cashflows, rate, dayCountMethod, startDate) {
  let xnpv = 0;
  let derivative = 0;
  const onePlusRate = 1 + rate;

  for (const cf of cashflows) {
    const yearFraction = getYearFraction(startDate, cf.date, dayCountMethod);
    const discountFactor = Math.pow(onePlusRate, -yearFraction);
    xnpv += cf.amount * discountFactor;
    derivative -= cf.amount * yearFraction * discountFactor / onePlusRate;
  }

  return { xnpv, derivative };
}

/**
 * 使用 Newton-Raphson 法求解 XIRR
 * @param {Array<{date: Date, amount: number}>} cashflows - 带日期的现金流数组
 * @param {number} initialGuess - 初始猜测值
 * @param {number} maxIterations - 最大迭代次数
 * @param {number} tolerance - 收敛容差
 * @param {string} dayCountMethod - 日计数法
 * @returns {{xirr: number|null, converged: boolean}} 结果
 */
function newtonRaphsonXIRR(cashflows, initialGuess, maxIterations, tolerance, dayCountMethod) {
  let rate = initialGuess;
  const startDate = cashflows[0].date;

  for (let i = 0; i < maxIterations; i++) {
    const { xnpv, derivative } = xnpvWithDerivative(cashflows, rate, dayCountMethod, startDate);

    if (Math.abs(xnpv) < tolerance) {
      return { xirr: rate, converged: true };
    }

    if (Math.abs(derivative) < 1e-15) {
      break;
    }

    const newRate = rate - xnpv / derivative;

    if (newRate <= -1) {
      break;
    }

    if (Math.abs(newRate - rate) < tolerance) {
      return { xirr: newRate, converged: true };
    }

    rate = newRate;
  }

  return { xirr: null, converged: false };
}

/**
 * 计算 XIRR（带日期的内部收益率）
 * @param {Array<{date: string|Date, amount: number}>} cashflows - 带日期的现金流数组
 * @param {Object} options - 计算选项
 * @returns {{xirr: number|null, hasMultipleIRR: boolean, message: string}} 结果
 */
export function calculateXIRR(cashflows, options = {}) {
  const {
    maxIterations = DEFAULT_MAX_ITERATIONS,
    tolerance = DEFAULT_TOLERANCE,
    dayCountMethod = DAY_COUNT_METHODS.ACT_365,
  } = options;

  const sortedCashflows = validateAndSortCashflows(cashflows);

  const amounts = sortedCashflows.map(cf => cf.amount);
  const hasPositive = amounts.some(a => a > 0);
  const hasNegative = amounts.some(a => a < 0);
  if (!hasPositive || !hasNegative) {
    return { xirr: null, hasMultipleIRR: false, message: '现金流必须同时包含正负数' };
  }

  const signChanges = countSignChanges(amounts);
  const hasMultipleIRR = signChanges >= 2;

  const foundSolutions = new Map();

  for (const guess of INITIAL_GUESSES) {
    const result = newtonRaphsonXIRR(
      sortedCashflows,
      guess,
      maxIterations,
      tolerance,
      dayCountMethod
    );
    if (result.converged && result.xirr !== null) {
      const rounded = Math.round(result.xirr * 1e6) / 1e6;
      if (!foundSolutions.has(rounded)) {
        foundSolutions.set(rounded, result.xirr);
      }
    }
  }

  if (foundSolutions.size === 0) {
    return { xirr: null, hasMultipleIRR, message: hasMultipleIRR ? '可能存在多重 XIRR，无法收敛到唯一解' : '未找到有效的 XIRR 解' };
  }

  if (foundSolutions.size > 1) {
    const solutions = Array.from(foundSolutions.values()).sort((a, b) => a - b);
    return {
      xirr: null,
      hasMultipleIRR: true,
      message: `检测到多重 XIRR 解：${solutions.map(s => (s * 100).toFixed(2) + '%').join(', ')}，请结合具体场景分析`,
      solutions,
    };
  }

  return {
    xirr: foundSolutions.values().next().value,
    hasMultipleIRR: false,
    message: '计算成功',
  };
}

/**
 * 计算现金流符号变化次数（用于检测多重 IRR）
 * @param {Array<number>} cashflows - 现金流数组
 * @returns {number} 符号变化次数
 */
function countSignChanges(cashflows) {
  let changes = 0;
  let lastSign = null;

  for (const cf of cashflows) {
    if (cf === 0) continue;
    const currentSign = cf > 0 ? 1 : -1;
    if (lastSign !== null && currentSign !== lastSign) {
      changes++;
    }
    lastSign = currentSign;
  }

  return changes;
}

/**
 * 计算 MIRR（修正内部收益率）
 * @param {Array<number>} cashflows - 现金流数组
 * @param {number} financeRate - 融资利率（负现金流贴现率）
 * @param {number} reinvestRate - 再投资率（正现金流收益率）
 * @returns {number} MIRR
 */
export function calculateMIRR(cashflows, financeRate, reinvestRate) {
  if (!Array.isArray(cashflows) || cashflows.length < 2) {
    throw new Error('现金流至少需要包含2条记录');
  }

  const parsedCF = cashflows.map(Number);
  if (parsedCF.some(isNaN)) {
    throw new Error('现金流必须都是有效数字');
  }

  const n = parsedCF.length;
  let pvNegative = 0;
  let fvPositive = 0;

  for (let t = 0; t < n; t++) {
    const cf = parsedCF[t];
    if (cf < 0) {
      pvNegative += cf / Math.pow(1 + financeRate, t);
    } else if (cf > 0) {
      fvPositive += cf * Math.pow(1 + reinvestRate, n - 1 - t);
    }
  }

  if (pvNegative >= 0 || fvPositive <= 0) {
    throw new Error('无法计算 MIRR：现金流需要同时包含正负数');
  }

  const mirr = Math.pow(fvPositive / (-pvNegative), 1 / (n - 1)) - 1;
  return mirr;
}

export { DAY_COUNT_METHODS };
