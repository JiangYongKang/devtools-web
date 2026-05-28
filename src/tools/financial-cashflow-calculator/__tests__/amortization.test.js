
import { describe, test, expect } from 'vitest';
import {
  generateAmortizationSchedule,
  generateEqualInstallmentSchedule,
  generateEqualPrincipalSchedule,
  calculateEqualInstallmentPayment,
  LOAN_TYPE,
} from '../logic/amortization.js';

describe('等额本息计算', () => {
  test('每月还款额计算', () => {
    const principal = 1000000;
    const annualRate = 0.042;
    const periods = 360;
    const payment = calculateEqualInstallmentPayment(principal, annualRate, periods);
    expect(payment).toBeCloseTo(4890.17, 1);
  });

  test('摊销表余额守恒 - 末期余额为 0', () => {
    const result = generateEqualInstallmentSchedule(100000, 0.05, 12);
    expect(result.schedule.length).toBe(12);
    expect(result.schedule[result.schedule.length - 1].remainingBalance).toBeCloseTo(0, 6);
  });

  test('总本金 + 总利息 = 总还款', () => {
    const result = generateEqualInstallmentSchedule(100000, 0.05, 12);
    expect(result.totalPrincipal + result.totalInterest).toBeCloseTo(result.totalPayment, 6);
  });

  test('每期还款额相等', () => {
    const result = generateEqualInstallmentSchedule(100000, 0.05, 12);
    const firstPayment = result.schedule[0].payment;
    for (const item of result.schedule) {
      expect(item.payment).toBeCloseTo(firstPayment, 6);
    }
  });
});

describe('等额本金计算', () => {
  test('每期本金相等', () => {
    const result = generateEqualPrincipalSchedule(120000, 0.06, 12);
    const firstPrincipal = result.schedule[0].principal;
    for (const item of result.schedule) {
      expect(item.principal).toBeCloseTo(firstPrincipal, 6);
    }
  });

  test('摊销表余额守恒 - 末期余额为 0', () => {
    const result = generateEqualPrincipalSchedule(100000, 0.05, 12);
    expect(result.schedule[result.schedule.length - 1].remainingBalance).toBeCloseTo(0, 6);
  });

  test('总本金 + 总利息 = 总还款', () => {
    const result = generateEqualPrincipalSchedule(100000, 0.05, 12);
    const sumPayment = result.schedule.reduce((sum, item) => sum + item.payment, 0);
    expect(sumPayment).toBeCloseTo(result.totalPayment, 6);
  });

  test('每期还款额递减', () => {
    const result = generateEqualPrincipalSchedule(120000, 0.06, 12);
    for (let i = 1; i < result.schedule.length; i++) {
      expect(result.schedule[i].payment).toBeLessThan(result.schedule[i - 1].payment);
    }
  });
});

describe('统一入口函数', () => {
  test('等额本息入口', () => {
    const result = generateAmortizationSchedule({
      principal: 100000,
      annualRate: 0.05,
      periods: 12,
      loanType: LOAN_TYPE.EQUAL_INSTALLMENT,
    });
    expect(result.schedule.length).toBe(12);
    expect(result.monthlyPayment).toBeDefined();
  });

  test('等额本金入口', () => {
    const result = generateAmortizationSchedule({
      principal: 100000,
      annualRate: 0.05,
      periods: 12,
      loanType: LOAN_TYPE.EQUAL_PRINCIPAL,
    });
    expect(result.schedule.length).toBe(12);
    expect(result.firstPayment.payment).toBeGreaterThan(result.lastPayment.payment);
  });

  test('无效参数抛出错误', () => {
    expect(() => generateAmortizationSchedule({
      principal: -1000,
      annualRate: 0.05,
      periods: 12,
    })).toThrow();

    expect(() => generateAmortizationSchedule({
      principal: 100000,
      annualRate: 0.05,
      periods: 0,
    })).toThrow();
  });
});

describe('首期/末期 breakdown', () => {
  test('等额本息首期和末期信息', () => {
    const result = generateEqualInstallmentSchedule(100000, 0.05, 12);
    expect(result.firstPayment).toBeDefined();
    expect(result.lastPayment).toBeDefined();
    expect(result.firstPayment.period).toBe(1);
    expect(result.lastPayment.period).toBe(12);
  });
});
