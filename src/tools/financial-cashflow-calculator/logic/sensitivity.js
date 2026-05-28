
/**
 * 敏感性分析函数
 */

import { calculateNPV, calculateXNPV } from './npv.js';
import { calculateIRR, calculateXIRR } from './irr.js';
import { DAY_COUNT_METHODS } from './dateUtils.js';

/**
 * 生成贴现率敏感性分析表格（一维）
 * @param {Array<number>} cashflows - 现金流数组
 * @param {number} baseRate - 基准贴现率
 * @param {number} step - 步长（如 0.01 表示 1%）
 * @param {number} steps - 上下步数
 * @returns {Object} 敏感性分析结果
 */
export function generateRateSensitivityTable(cashflows, baseRate, step = 0.01, steps = 5) {
  const table = [];

  for (let i = -steps; i <= steps; i++) {
    const rate = baseRate + i * step;
    const npv = calculateNPV(cashflows, rate);
    table.push({
      rate,
      rateDisplay: `${(rate * 100).toFixed(2)}%`,
      delta: i * step,
      deltaDisplay: i === 0 ? '基准' : `${(i * step * 100).toFixed(2)}%`,
      npv,
    });
  }

  return {
    table,
    baseRate,
    baseNPV: calculateNPV(cashflows, baseRate),
  };
}

/**
 * 生成带日期的贴现率敏感性分析表格
 * @param {Array<{date: string|Date, amount: number}>} cashflows - 带日期的现金流数组
 * @param {number} baseRate - 基准贴现率
 * @param {number} step - 步长
 * @param {number} steps - 上下步数
 * @param {string} dayCountMethod - 日计数法
 * @returns {Object} 敏感性分析结果
 */
export function generateRateSensitivityTableXIRR(
  cashflows,
  baseRate,
  step = 0.01,
  steps = 5,
  dayCountMethod = DAY_COUNT_METHODS.ACT_365
) {
  const table = [];

  for (let i = -steps; i <= steps; i++) {
    const rate = baseRate + i * step;
    const npv = calculateXNPV(cashflows, rate, dayCountMethod);
    table.push({
      rate,
      rateDisplay: `${(rate * 100).toFixed(2)}%`,
      delta: i * step,
      deltaDisplay: i === 0 ? '基准' : `${(i * step * 100).toFixed(2)}%`,
      npv,
    });
  }

  return {
    table,
    baseRate,
    baseNPV: calculateXNPV(cashflows, baseRate, dayCountMethod),
  };
}

/**
 * 生成现金流金额敏感性分析表格
 * @param {Array<number>} cashflows - 现金流数组
 * @param {number} discountRate - 贴现率
 * @param {number} targetPeriod - 目标期数（0 表示所有期）
 * @param {number} step - 步长百分比（如 0.1 表示 10%）
 * @param {number} steps - 上下步数
 * @returns {Object} 敏感性分析结果
 */
export function generateCashflowSensitivityTable(cashflows, discountRate, targetPeriod = 0, step = 0.1, steps = 5) {
  const table = [];
  const baseNPV = calculateNPV(cashflows, discountRate);

  for (let i = -steps; i <= steps; i++) {
    const delta = i * step;
    const modifiedCashflows = cashflows.map((cf, idx) => {
      if (targetPeriod === 0 || idx === targetPeriod) {
        return cf * (1 + delta);
      }
      return cf;
    });
    const npv = calculateNPV(modifiedCashflows, discountRate);
    table.push({
      delta,
      deltaDisplay: i === 0 ? '基准' : `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(0)}%`,
      npv,
      npvChange: npv - baseNPV,
      npvChangePercent: baseNPV !== 0 ? ((npv - baseNPV) / Math.abs(baseNPV)) * 100 : 0,
    });
  }

  return {
    table,
    baseNPV,
    targetPeriod,
  };
}

/**
 * 生成二维敏感性分析表格（贴现率 × 现金流金额）
 * @param {Array<number>} cashflows - 现金流数组
 * @param {number} baseRate - 基准贴现率
 * @param {number} targetPeriod - 目标期数
 * @param {Object} options - 选项
 * @returns {Object} 二维敏感性分析结果
 */
export function generateTwoWaySensitivityTable(cashflows, baseRate, targetPeriod = 1, options = {}) {
  const {
    rateStep = 0.01,
    rateSteps = 3,
    cfStep = 0.1,
    cfSteps = 3,
  } = options;

  const rateHeaders = [];
  const cfHeaders = [];
  const data = [];

  for (let i = -rateSteps; i <= rateSteps; i++) {
    rateHeaders.push({
      rate: baseRate + i * rateStep,
      display: `${((baseRate + i * rateStep) * 100).toFixed(1)}%`,
    });
  }

  for (let j = -cfSteps; j <= cfSteps; j++) {
    cfHeaders.push({
      delta: j * cfStep,
      display: j === 0 ? '基准' : `${j * cfStep * 100 >= 0 ? '+' : ''}${(j * cfStep * 100).toFixed(0)}%`,
    });
  }

  for (let j = 0; j < cfHeaders.length; j++) {
    const row = [];
    const cfDelta = cfHeaders[j].delta;
    for (let i = 0; i < rateHeaders.length; i++) {
      const rate = rateHeaders[i].rate;
      const modifiedCashflows = cashflows.map((cf, idx) => {
        if (idx === targetPeriod) {
          return cf * (1 + cfDelta);
        }
        return cf;
      });
      const npv = calculateNPV(modifiedCashflows, rate);
      row.push(npv);
    }
    data.push(row);
  }

  const baseNPV = calculateNPV(cashflows, baseRate);
  const allValues = data.flat();
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);

  return {
    rateHeaders,
    cfHeaders,
    data,
    baseNPV,
    minValue,
    maxValue,
    getHeatColor: (value) => getHeatColor(value, minValue, maxValue),
  };
}

/**
 * 获取热力色阶颜色
 * @param {number} value - 当前值
 * @param {number} minValue - 最小值
 * @param {number} maxValue - 最大值
 * @returns {string} CSS 颜色
 */
export function getHeatColor(value, minValue, maxValue) {
  if (minValue === maxValue) {
    return '#ffffff';
  }

  const normalized = (value - minValue) / (maxValue - minValue);

  if (value >= 0) {
    const green = Math.floor(128 + normalized * 127);
    return `rgb(${Math.floor(255 - normalized * 100)}, ${green}, ${Math.floor(255 - normalized * 100)})`;
  } else {
    const red = Math.floor(128 + (1 - normalized) * 127);
    return `rgb(${red}, ${Math.floor(255 - (1 - normalized) * 100)}, ${Math.floor(255 - (1 - normalized) * 100)})`;
  }
}

/**
 * 导出敏感性表格为 CSV
 * @param {Object} sensitivityResult - 敏感性分析结果
 * @param {string} type - 类型 'rate' | 'cashflow' | 'twoway'
 * @returns {string} CSV 字符串
 */
export function exportSensitivityToCSV(sensitivityResult, type = 'rate') {
  let csv = '';

  if (type === 'rate') {
    csv = '贴现率,变动,NPV\n';
    for (const row of sensitivityResult.table) {
      csv += `${row.rateDisplay},${row.deltaDisplay},${row.npv.toFixed(2)}\n`;
    }
  } else if (type === 'cashflow') {
    csv = '变动,NPV,NPV变化,NPV变化率\n';
    for (const row of sensitivityResult.table) {
      csv += `${row.deltaDisplay},${row.npv.toFixed(2)},${row.npvChange.toFixed(2)},${row.npvChangePercent.toFixed(2)}%\n`;
    }
  } else if (type === 'twoway') {
    csv = `现金流变动,${sensitivityResult.rateHeaders.map(h => h.display).join(',')}\n`;
    for (let i = 0; i < sensitivityResult.cfHeaders.length; i++) {
      const cfHeader = sensitivityResult.cfHeaders[i];
      const rowData = sensitivityResult.data[i].map(v => v.toFixed(2)).join(',');
      csv += `${cfHeader.display},${rowData}\n`;
    }
  }

  return csv;
}

/**
 * 下载 CSV 文件
 * @param {string} csvContent - CSV 内容
 * @param {string} filename - 文件名
 */
export function downloadCSV(csvContent, filename = 'sensitivity_analysis.csv') {
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export { DAY_COUNT_METHODS };
