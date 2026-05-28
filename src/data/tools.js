/** 当前已落地的工具条目（181～190），首页列表与 ToolPage 实现一致 */
export const tools = [
  {
    id: '181',
    name: '概率分布采样器',
    summary:
      '可复现 PRNG、正态/泊松/二项等多分布采样、直方图与理论 PDF/CDF、拟合检验与 CSV 导出',
  },
  {
    id: '182',
    name: '蒙特卡洛 π 估算器',
    summary:
      '随机点法与 Buffon 针、收敛曲线与置信区间、方差缩减与 Web Worker 并行分片',
  },
  {
    id: '183',
    name: '线性回归工作台',
    summary:
      'OLS 最小二乘、R² 与预测区间、残差诊断、Cook 距离与离群点检测',
  },
  {
    id: '184',
    name: '矩阵运算工作台',
    summary:
      '矩阵加减乘、行列式与逆、LU 分解、条件数与高斯消元步骤展示',
  },
  {
    id: '185',
    name: '量纲单位换算器',
    summary:
      'SI 七基维归约、复合单位链式换算、温度仿射变换、有效数字与量纲冲突检测',
  },
  {
    id: '186',
    name: '任意精度计算器',
    summary:
      'BigInt 与高精度 Decimal、Number 三路对比、安全表达式解析与溢出提示',
  },
  {
    id: '187',
    name: '业务日期规则引擎',
    summary:
      '工作日历与节假日表、工作日/自然日运算、DST 边界检测与 SLA 截止计算',
  },
  {
    id: '188',
    name: '金融现金流计算器',
    summary:
      'NPV/IRR/XIRR、等额本息/本金摊还表、贴现率敏感性分析与 CSV 导出',
  },
  {
    id: '189',
    name: '大地坐标系转换器',
    summary:
      'WGS84↔GCJ02↔BD09 双向转换、偏移米级估算、境内外判定与 GeoJSON 导出',
  },
  {
    id: '190',
    name: 'Geohash 距离计算器',
    summary:
      'geohash 编解码与邻格、Haversine 折线距离、前缀 bbox 与 GeoJSON 可视化',
  },
]

export function getToolById(id) {
  return tools.find((t) => t.id === id)
}
