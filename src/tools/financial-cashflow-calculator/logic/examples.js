
/**
 * 示例数据
 */

/**
 * 项目 NPV 示例
 * 初始投资 -1,000,000 元，5 年现金流
 */
export const PROJECT_NPV_EXAMPLE = {
  name: '项目投资 NPV 分析',
  description: '模拟一个 5 年期项目投资的现金流分析',
  discountRate: 0.1,
  cashflows: [
    { period: 0, date: '2024-01-01', amount: -1000000, description: '初始投资' },
    { period: 1, date: '2024-12-31', amount: 250000, description: '第 1 年收益' },
    { period: 2, date: '2025-12-31', amount: 350000, description: '第 2 年收益' },
    { period: 3, date: '2026-12-31', amount: 400000, description: '第 3 年收益' },
    { period: 4, date: '2027-12-31', amount: 350000, description: '第 4 年收益' },
    { period: 5, date: '2028-12-31', amount: 300000, description: '第 5 年收益 + 残值' },
  ],
};

/**
 * 房贷 30 年示例
 * 贷款 100 万，年利率 4.2%，30 年等额本息
 */
export const MORTGAGE_EXAMPLE = {
  name: '房贷 30 年摊销',
  description: '100 万贷款，年利率 4.2%，30 年等额本息还款',
  principal: 1000000,
  annualRate: 0.042,
  periods: 360,
  startDate: '2024-01-01',
  loanType: 'equal_installment',
};

/**
 * 多重 IRR 反例
 * 经典的多重 IRR 问题：油井/矿山项目
 * 初期投资，中间有正现金流，末期需要支付环境修复费用
 */
export const MULTIPLE_IRR_EXAMPLE = {
  name: '多重 IRR 反例',
  description: '油井项目：初始投资、中期收益、末期环境修复费用，产生多重 IRR',
  cashflows: [
    { period: 0, date: '2024-01-01', amount: -1000000, description: '钻井投资' },
    { period: 1, date: '2024-12-31', amount: 800000, description: '第 1 年产油收益' },
    { period: 2, date: '2025-12-31', amount: 800000, description: '第 2 年产油收益' },
    { period: 3, date: '2026-12-31', amount: 800000, description: '第 3 年产油收益' },
    { period: 4, date: '2027-12-31', amount: -2200000, description: '环境修复与填埋费用' },
  ],
};

/**
 * 简单 IRR 验证案例（已知解）
 * 初始投资 -1000，3 年每年收回 402.11，IRR 约 10%
 */
export const SIMPLE_IRR_TEST = {
  name: 'IRR 验证案例',
  description: '已知 IRR 约为 10% 的简单案例',
  cashflows: [
    { period: 0, amount: -1000 },
    { period: 1, amount: 402.11 },
    { period: 2, amount: 402.11 },
    { period: 3, amount: 402.11 },
  ],
};

/**
 * XIRR 验证案例（带不规则日期）
 */
export const XIRR_TEST_EXAMPLE = {
  name: 'XIRR 不规则日期案例',
  description: '测试不规则日期下的 XIRR 计算',
  cashflows: [
    { date: '2024-01-01', amount: -10000 },
    { date: '2024-03-15', amount: 2500 },
    { date: '2024-06-30', amount: 3500 },
    { date: '2024-10-01', amount: 4500 },
  ],
};

export default {
  PROJECT_NPV_EXAMPLE,
  MORTGAGE_EXAMPLE,
  MULTIPLE_IRR_EXAMPLE,
  SIMPLE_IRR_TEST,
  XIRR_TEST_EXAMPLE,
};
