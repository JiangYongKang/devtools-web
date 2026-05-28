
import { describe, test, expect } from 'vitest';
import { calculateNPV, calculateXNPV, calculatePV, calculateFV } from '../logic/npv.js';
import { DAY_COUNT_METHODS } from '../logic/dateUtils.js';

describe('NPV 计算', () => {
  test('标准 NPV 计算', () => {
    const cashflows = [-1000, 300, 400, 500];
    const rate = 0.1;
    const npv = calculateNPV(cashflows, rate);
    expect(npv).toBeCloseTo(-1000 + 300/1.1 + 400/Math.pow(1.1, 2) + 500/Math.pow(1.1, 3), 6);
  });

  test('零贴现率 NPV 等于现金流总和', () => {
    const cashflows = [-1000, 300, 400, 500];
    const npv = calculateNPV(cashflows, 0);
    expect(npv).toBeCloseTo(200, 6);
  });

  test('NPV 至少需要 2 条记录', () => {
    expect(() => calculateNPV([-1000], 0.1)).toThrow();
  });
});

describe('XNPV 计算', () => {
  test('带日期的 NPV 计算 - Act/365', () => {
    const cashflows = [
      { date: '2025-01-01', amount: -1000 },
      { date: '2026-01-01', amount: 1100 },
    ];
    const xnpv = calculateXNPV(cashflows, 0.1, DAY_COUNT_METHODS.ACT_365);
    expect(xnpv).toBeCloseTo(0, 4);
  });

  test('带日期的 NPV 计算 - 30/360', () => {
    const cashflows = [
      { date: '2025-01-01', amount: -1000 },
      { date: '2026-01-01', amount: 1100 },
    ];
    const xnpv = calculateXNPV(cashflows, 0.1, DAY_COUNT_METHODS.THIRTY_360);
    expect(xnpv).toBeCloseTo(0, 4);
  });
});

describe('PV 和 FV 计算', () => {
  test('现值计算', () => {
    const pv = calculatePV(1331, 0.1, 3);
    expect(pv).toBeCloseTo(1000, 6);
  });

  test('终值计算', () => {
    const fv = calculateFV(1000, 0.1, 3);
    expect(fv).toBeCloseTo(1331, 6);
  });
});
