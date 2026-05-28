
/**
 * 金额格式化工具函数
 * 本地实现，不跨目录 import
 */

/**
 * 格式化金额为带千分位的字符串
 * @param {number} amount - 金额
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的金额字符串
 */
export function formatAmount(amount, decimals = 2) {
  const num = Number(amount);
  if (isNaN(num)) {
    return '-';
  }

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const fixed = absNum.toFixed(decimals);
  const parts = fixed.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '';

  const withCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  let result = withCommas;
  if (decimals > 0 && decimalPart) {
    result += '.' + decimalPart;
  }

  return isNegative ? '-' + result : result;
}

/**
 * 格式化金额为货币格式
 * @param {number} amount - 金额
 * @param {string} currency - 货币符号
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的货币字符串
 */
export function formatCurrency(amount, currency = '¥', decimals = 2) {
  const num = Number(amount);
  if (isNaN(num)) {
    return '-';
  }

  const isNegative = num < 0;
  const formatted = formatAmount(Math.abs(num), decimals);

  return isNegative ? `-${currency}${formatted}` : `${currency}${formatted}`;
}

/**
 * 格式化百分比
 * @param {number} rate - 比率（如 0.1 表示 10%）
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的百分比字符串
 */
export function formatPercent(rate, decimals = 2) {
  const num = Number(rate);
  if (isNaN(num)) {
    return '-';
  }
  return (num * 100).toFixed(decimals) + '%';
}

/**
 * 格式化大额金额（带单位：万、亿）
 * @param {number} amount - 金额
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的大额金额字符串
 */
export function formatLargeAmount(amount, decimals = 2) {
  const num = Number(amount);
  if (isNaN(num)) {
    return '-';
  }

  const absNum = Math.abs(num);
  const isNegative = num < 0;

  let result;
  if (absNum >= 100000000) {
    result = (absNum / 100000000).toFixed(decimals) + ' 亿';
  } else if (absNum >= 10000) {
    result = (absNum / 10000).toFixed(decimals) + ' 万';
  } else {
    result = absNum.toFixed(decimals);
  }

  return isNegative ? '-' + result : result;
}

/**
 * 解析金额字符串为数字
 * @param {string} str - 金额字符串
 * @returns {number} 解析后的金额
 */
export function parseAmount(str) {
  if (typeof str !== 'string') {
    return Number(str) || 0;
  }
  const cleaned = str.replace(/[,\s¥$€£]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * 根据金额正负返回颜色类名
 * @param {number} amount - 金额
 * @returns {string} 颜色类名
 */
export function getAmountColorClass(amount) {
  const num = Number(amount);
  if (num > 0) {
    return 'amount-positive';
  } else if (num < 0) {
    return 'amount-negative';
  }
  return 'amount-zero';
}
