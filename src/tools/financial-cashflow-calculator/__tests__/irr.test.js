
import { describe, test, expect } from 'vitest';
import { calculateIRR, calculateXIRR, calculateMIRR } from '../logic/irr.js';
import { DAY_COUNT_METHODS } from '../logic/dateUtils.js';

describe('IRR 计算', () => {
  test('标准 IRR 计算 - 约 10%', () => {
    const cashflows = [-1000, 402.11, 402.11, 402.11];
    const result = calculateIRR(cashflows);
    expect(result.irr).not.toBeNull();
    expect(result.irr).toBeGreaterThan(0.09);
    expect(result.irr).toBeLessThan(0.11);
  });

  test('IRR 精确计算', () => {
    const cashflows = [-1000, 1100];
    const result = calculateIRR(cashflows);
    expect(result.irr).toBeCloseTo(0.1, 6);
  });

  test('现金流必须包含正负数', () => {
    const cashflows = [1000, 2000, 3000];
    const result = calculateIRR(cashflows);
    expect(result.irr).toBeNull();
    expect(result.message).toContain('同时包含正负数');
  });

  test('多重 IRR 检测', () => {
    const cashflows = [-1000, 800, 800, 800, -2200];
    const result = calculateIRR(cashflows);
    expect(result.hasMultipleIRR).toBe(true);
  });
});

describe('XIRR 计算', () => {
  test('带日期的 IRR 计算', () => {
    const cashflows = [
      { date: '2025-01-01', amount: -1000 },
      { date: '2026-01-01', amount: 1100 },
    ];
    const result = calculateXIRR(cashflows);
    expect(result.xirr).toBeCloseTo(0.1, 4);
  });

  test('不规则日期 XIRR', () => {
    const cashflows = [
      { date: '2025-01-01', amount: -10000 },
      { date: '2025-03-15', amount: 2500 },
      { date: '2025-06-30', amount: 3500 },
      { date: '2025-10-01', amount: 4500 },
    ];
    const result = calculateXIRR(cashflows);
    expect(result.xirr).not.toBeNull();
    expect(result.xirr).toBeGreaterThan(0);
  });

  test('30/360 日计数法 XIRR', () => {
    const cashflows = [
      { date: '2025-01-01', amount: -1000 },
      { date: '2026-01-01', amount: 1100 },
    ];
    const result = calculateXIRR(cashflows, {
      dayCountMethod: DAY_COUNT_METHODS.THIRTY_360,
    });
    expect(result.xirr).toBeCloseTo(0.1, 4);
  });
});

describe('MIRR 计算', () => {
  test('MIRR 基本计算', () => {
    const cashflows = [-1000, 300, 400, 500];
    const financeRate = 0.1;
    const reinvestRate = 0.08;
    const mirr = calculateMIRR(cashflows, financeRate, reinvestRate);
    expect(mirr).not.toBeNaN();
    expect(mirr).toBeGreaterThan(0);
  });

  test('MIRR 与 IRR 关系', () => {
    const cashflows = [-1000, 1100];
    const rate = 0.05;
    const mirr = calculateMIRR(cashflows, rate, rate);
    expect(mirr).toBeCloseTo(0.1, 6);
  });
});
