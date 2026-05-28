
/**
 * 日期工具函数
 */

/**
 * 解析日期字符串为 Date 对象
 * @param {string|Date} date - 日期字符串或 Date 对象
 * @returns {Date} 解析后的 Date 对象
 */
export function parseDate(date) {
  if (date instanceof Date) {
    return new Date(date.getTime());
  }
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    throw new Error(`无效的日期格式: ${date}`);
  }
  return parsed;
}

/**
 * 计算两个日期之间的天数差（Act/Actual）
 * @param {Date|string} startDate - 开始日期
 * @param {Date|string} endDate - 结束日期
 * @returns {number} 天数差
 */
export function daysBetween(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

/**
 * Act/365 日计数法：实际天数 / 365
 * @param {Date|string} startDate - 开始日期
 * @param {Date|string} endDate - 结束日期
 * @returns {number} 年分数
 */
export function dayCountAct365(startDate, endDate) {
  const days = daysBetween(startDate, endDate);
  return days / 365;
}

/**
 * 30/360 日计数法（美国债券市场标准）
 * @param {Date|string} startDate - 开始日期
 * @param {Date|string} endDate - 结束日期
 * @returns {number} 年分数
 */
export function dayCount30360(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  let y1 = start.getFullYear();
  let m1 = start.getMonth() + 1;
  let d1 = start.getDate();

  let y2 = end.getFullYear();
  let m2 = end.getMonth() + 1;
  let d2 = end.getDate();

  if (d1 === 31) d1 = 30;
  if (d2 === 31 && d1 >= 30) d2 = 30;

  const days = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
  return days / 360;
}

/**
 * 支持的日计数法类型
 */
export const DAY_COUNT_METHODS = {
  ACT_365: 'act/365',
  THIRTY_360: '30/360',
};

/**
 * 根据日计数法类型计算年分数
 * @param {Date|string} startDate - 开始日期
 * @param {Date|string} endDate - 结束日期
 * @param {string} method - 日计数法类型
 * @returns {number} 年分数
 */
export function getYearFraction(startDate, endDate, method = DAY_COUNT_METHODS.ACT_365) {
  switch (method) {
    case DAY_COUNT_METHODS.ACT_365:
      return dayCountAct365(startDate, endDate);
    case DAY_COUNT_METHODS.THIRTY_360:
      return dayCount30360(startDate, endDate);
    default:
      throw new Error(`不支持的日计数法: ${method}`);
  }
}

/**
 * 校验并排序现金流日期
 * @param {Array<{date: string|Date, amount: number}>} cashflows - 现金流数组
 * @returns {Array<{date: Date, amount: number}>} 排序后的现金流数组
 */
export function validateAndSortCashflows(cashflows) {
  if (!Array.isArray(cashflows) || cashflows.length < 2) {
    throw new Error('现金流至少需要包含2条记录（初始投资+至少一笔后续现金流）');
  }

  const parsed = cashflows.map(cf => ({
    date: parseDate(cf.date),
    amount: Number(cf.amount),
  }));

  parsed.sort((a, b) => a.date.getTime() - b.date.getTime());

  const dateMap = new Map();
  for (const cf of parsed) {
    const dateKey = cf.date.toISOString().split('T')[0];
    if (dateMap.has(dateKey)) {
      throw new Error(`重复的日期: ${dateKey}，请合并同日现金流`);
    }
    dateMap.set(dateKey, true);
  }

  return parsed;
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date|string} date - 日期
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date) {
  const d = parseDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
