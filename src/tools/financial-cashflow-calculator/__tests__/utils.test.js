
import { describe, test, expect } from 'vitest';
import {
  parseDate,
  daysBetween,
  dayCountAct365,
  dayCount30360,
  validateAndSortCashflows,
  formatDate,
  DAY_COUNT_METHODS,
} from '../logic/dateUtils.js';
import {
  formatAmount,
  formatCurrency,
  formatPercent,
  formatLargeAmount,
} from '../logic/formatters.js';

describe('日期工具', () => {
  test('日期解析', () => {
    const date = parseDate('2024-01-15');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(15);
  });

  test('日期字符串格式验证', () => {
    expect(formatDate('2024-01-15')).toBe('2024-01-15');
    expect(formatDate(new Date(2024, 0, 15))).toBe('2024-01-15');
  });

  test('天数计算', () => {
    const days = daysBetween('2024-01-01', '2025-01-01');
    expect(days).toBe(366);
  });

  test('Act/365 日计数法', () => {
    const yearFrac = dayCountAct365('2024-01-01', '2025-01-01');
    expect(yearFrac).toBeCloseTo(366 / 365, 6);
  });

  test('30/360 日计数法 - 整年', () => {
    const yearFrac = dayCount30360('2024-01-01', '2025-01-01');
    expect(yearFrac).toBeCloseTo(1, 6);
  });

  test('30/360 日计数法 - 月末调整', () => {
    const yearFrac = dayCount30360('2024-01-31', '2024-02-28');
    expect(yearFrac).toBeCloseTo(28 / 360, 6);
  });
});

describe('现金流验证', () => {
  test('正常现金流排序', () => {
    const cashflows = [
      { date: '2025-01-01', amount: 100 },
      { date: '2024-01-01', amount: -1000 },
    ];
    const sorted = validateAndSortCashflows(cashflows);
    expect(sorted[0].date.getFullYear()).toBe(2024);
    expect(sorted[1].date.getFullYear()).toBe(2025);
  });

  test('重复日期抛出错误', () => {
    const cashflows = [
      { date: '2024-01-01', amount: -1000 },
      { date: '2024-01-01', amount: 100 },
    ];
    expect(() => validateAndSortCashflows(cashflows)).toThrow();
  });

  test('现金流数量不足抛出错误', () => {
    const cashflows = [{ date: '2024-01-01', amount: -1000 }];
    expect(() => validateAndSortCashflows(cashflows)).toThrow();
  });
});

describe('金额格式化', () => {
  test('千分位格式化', () => {
    expect(formatAmount(1234567.89)).toBe('1,234,567.89');
  });

  test('负数格式化', () => {
    expect(formatAmount(-1234.56)).toBe('-1,234.56');
  });

  test('货币格式化', () => {
    expect(formatCurrency(1000.5)).toBe('¥1,000.50');
  });

  test('百分比格式化', () => {
    expect(formatPercent(0.1234)).toBe('12.34%');
  });

  test('大额金额格式化 - 万', () => {
    expect(formatLargeAmount(12345)).toBe('1.23 万');
  });

  test('大额金额格式化 - 亿', () => {
    expect(formatLargeAmount(123456789)).toBe('1.23 亿');
  });
});
