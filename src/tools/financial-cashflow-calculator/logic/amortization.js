
/**
 * 贷款摊销计算函数（等额本息、等额本金）
 */

import { formatDate } from './dateUtils.js';

/**
 * 贷款类型枚举
 */
export const LOAN_TYPE = {
  EQUAL_INSTALLMENT: 'equal_installment',
  EQUAL_PRINCIPAL: 'equal_principal',
};

/**
 * 计算等额本息每月还款额
 * @param {number} principal - 贷款本金
 * @param {number} annualRate - 年利率（如 0.05 表示 5%）
 * @param {number} periods - 还款期数（月）
 * @returns {number} 每月还款额
 */
export function calculateEqualInstallmentPayment(principal, annualRate, periods) {
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) {
    return principal / periods;
  }
  const payment = principal * monthlyRate * Math.pow(1 + monthlyRate, periods) /
    (Math.pow(1 + monthlyRate, periods) - 1);
  return payment;
}

/**
 * 生成等额本息摊销表
 * @param {number} principal - 贷款本金
 * @param {number} annualRate - 年利率
 * @param {number} periods - 还款期数（月）
 * @param {string} startDate - 起始日期 YYYY-MM-DD
 * @returns {Object} 摊销结果
 */
export function generateEqualInstallmentSchedule(principal, annualRate, periods, startDate) {
  const monthlyPayment = calculateEqualInstallmentPayment(principal, annualRate, periods);
  const monthlyRate = annualRate / 12;

  const schedule = [];
  let remainingPrincipal = principal;
  let totalInterest = 0;
  let currentDate = startDate ? new Date(startDate) : null;

  for (let i = 1; i <= periods; i++) {
    const interest = remainingPrincipal * monthlyRate;
    const principalPaid = monthlyPayment - interest;
    remainingPrincipal -= principalPaid;
    totalInterest += interest;

    if (i === periods) {
      remainingPrincipal = 0;
    }

    const paymentDate = currentDate ? formatDate(addMonths(currentDate, i - 1)) : `第 ${i} 期`;

    schedule.push({
      period: i,
      date: paymentDate,
      payment: monthlyPayment,
      principal: principalPaid,
      interest: interest,
      remainingBalance: Math.max(0, remainingPrincipal),
    });
  }

  return {
    schedule,
    totalPayment: principal + totalInterest,
    totalInterest,
    totalPrincipal: principal,
    monthlyPayment,
    firstPayment: schedule[0],
    lastPayment: schedule[schedule.length - 1],
  };
}

/**
 * 生成等额本金摊销表
 * @param {number} principal - 贷款本金
 * @param {number} annualRate - 年利率
 * @param {number} periods - 还款期数（月）
 * @param {string} startDate - 起始日期 YYYY-MM-DD
 * @returns {Object} 摊销结果
 */
export function generateEqualPrincipalSchedule(principal, annualRate, periods, startDate) {
  const monthlyPrincipal = principal / periods;
  const monthlyRate = annualRate / 12;

  const schedule = [];
  let remainingPrincipal = principal;
  let totalInterest = 0;
  let currentDate = startDate ? new Date(startDate) : null;

  for (let i = 1; i <= periods; i++) {
    const interest = remainingPrincipal * monthlyRate;
    const payment = monthlyPrincipal + interest;
    remainingPrincipal -= monthlyPrincipal;
    totalInterest += interest;

    if (i === periods) {
      remainingPrincipal = 0;
    }

    const paymentDate = currentDate ? formatDate(addMonths(currentDate, i - 1)) : `第 ${i} 期`;

    schedule.push({
      period: i,
      date: paymentDate,
      payment: payment,
      principal: monthlyPrincipal,
      interest: interest,
      remainingBalance: Math.max(0, remainingPrincipal),
    });
  }

  return {
    schedule,
    totalPayment: principal + totalInterest,
    totalInterest,
    totalPrincipal: principal,
    firstPayment: schedule[0],
    lastPayment: schedule[schedule.length - 1],
  };
}

/**
 * 模拟提前还款
 * @param {Object} originalSchedule - 原始摊销表
 * @param {number} prepaymentPeriod - 提前还款期数
 * @param {number} prepaymentAmount - 提前还款金额
 * @param {string} prepaymentType - 提前还款类型：reduce_period（缩短期限）或 reduce_payment（减少月供）
 * @param {number} annualRate - 年利率
 * @param {string} loanType - 贷款类型
 * @returns {Object} 提前还款后的摊销结果
 */
export function simulatePrepayment(
  originalSchedule,
  prepaymentPeriod,
  prepaymentAmount,
  prepaymentType = 'reduce_period',
  annualRate,
  loanType = LOAN_TYPE.EQUAL_INSTALLMENT
) {
  const schedule = originalSchedule.schedule;
  const periodIndex = prepaymentPeriod - 1;

  if (periodIndex < 0 || periodIndex >= schedule.length) {
    throw new Error('提前还款期数超出范围');
  }

  const periodData = schedule[periodIndex];
  const remainingBalance = periodData.remainingBalance;

  if (prepaymentAmount <= 0 || prepaymentAmount > remainingBalance) {
    throw new Error('提前还款金额无效');
  }

  const newPrincipal = remainingBalance - prepaymentAmount;
  const remainingPeriods = schedule.length - prepaymentPeriod;

  const beforeSchedule = schedule.slice(0, prepaymentPeriod);
  const prepaymentEntry = {
    period: prepaymentPeriod,
    date: periodData.date,
    payment: periodData.payment + prepaymentAmount,
    principal: periodData.principal + prepaymentAmount,
    interest: periodData.interest,
    prepayment: prepaymentAmount,
    remainingBalance: newPrincipal,
  };

  let afterSchedule = [];

  if (prepaymentType === 'reduce_period' && newPrincipal > 0) {
    if (loanType === LOAN_TYPE.EQUAL_INSTALLMENT) {
      const newRemainingPeriods = Math.ceil(
        Math.log(originalSchedule.monthlyPayment / (originalSchedule.monthlyPayment - newPrincipal * (annualRate / 12))) /
        Math.log(1 + annualRate / 12)
      );
      if (newRemainingPeriods > 0) {
        const newSchedule = generateEqualInstallmentSchedule(
          newPrincipal,
          annualRate,
          newRemainingPeriods
        );
        afterSchedule = newSchedule.schedule.map((item, idx) => ({
          ...item,
          period: prepaymentPeriod + 1 + idx,
        }));
      }
    } else {
      const newMonthlyPrincipal = newPrincipal / remainingPeriods;
      let tempBalance = newPrincipal;
      for (let i = 0; i < remainingPeriods; i++) {
        const interest = tempBalance * (annualRate / 12);
        tempBalance -= newMonthlyPrincipal;
        afterSchedule.push({
          period: prepaymentPeriod + 1 + i,
          payment: newMonthlyPrincipal + interest,
          principal: newMonthlyPrincipal,
          interest,
          remainingBalance: Math.max(0, tempBalance),
        });
      }
    }
  } else if (prepaymentType === 'reduce_payment' && newPrincipal > 0) {
    if (loanType === LOAN_TYPE.EQUAL_INSTALLMENT) {
      const newSchedule = generateEqualInstallmentSchedule(
        newPrincipal,
        annualRate,
        remainingPeriods
      );
      afterSchedule = newSchedule.schedule.map((item, idx) => ({
        ...item,
        period: prepaymentPeriod + 1 + idx,
      }));
    } else {
      const newMonthlyPrincipal = newPrincipal / remainingPeriods;
      let tempBalance = newPrincipal;
      for (let i = 0; i < remainingPeriods; i++) {
        const interest = tempBalance * (annualRate / 12);
        tempBalance -= newMonthlyPrincipal;
        afterSchedule.push({
          period: prepaymentPeriod + 1 + i,
          payment: newMonthlyPrincipal + interest,
          principal: newMonthlyPrincipal,
          interest,
          remainingBalance: Math.max(0, tempBalance),
        });
      }
    }
  }

  const newSchedule = [...beforeSchedule, prepaymentEntry, ...afterSchedule];

  return {
    schedule: newSchedule,
    prepaymentPeriod,
    prepaymentAmount,
    prepaymentType,
    originalTotalInterest: originalSchedule.totalInterest,
    newTotalInterest: newSchedule.reduce((sum, item) => sum + item.interest, 0),
    interestSaved: originalSchedule.totalInterest - newSchedule.reduce((sum, item) => sum + item.interest, 0),
  };
}

/**
 * 日期加月数
 * @param {Date} date - 日期
 * @param {number} months - 月数
 * @returns {Date} 新日期
 */
function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * 生成贷款摊销表总入口
 * @param {Object} params - 参数
 * @returns {Object} 摊销结果
 */
export function generateAmortizationSchedule(params) {
  const {
    principal,
    annualRate,
    periods,
    startDate,
    loanType = LOAN_TYPE.EQUAL_INSTALLMENT,
  } = params;

  if (principal <= 0) {
    throw new Error('贷款本金必须大于 0');
  }
  if (annualRate < 0) {
    throw new Error('年利率不能为负');
  }
  if (!Number.isInteger(periods) || periods <= 0) {
    throw new Error('还款期数必须是正整数');
  }

  if (loanType === LOAN_TYPE.EQUAL_INSTALLMENT) {
    return generateEqualInstallmentSchedule(principal, annualRate, periods, startDate);
  } else if (loanType === LOAN_TYPE.EQUAL_PRINCIPAL) {
    return generateEqualPrincipalSchedule(principal, annualRate, periods, startDate);
  } else {
    throw new Error('不支持的贷款类型');
  }
}
