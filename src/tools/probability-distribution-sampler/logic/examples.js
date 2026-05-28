/**
 * 内置示例配置
 */

import { DISTRIBUTION_TYPES } from './distributions.js'

export const EXAMPLES = [
  {
    id: 'standard-normal',
    name: '标准正态',
    description: 'N(0, 1) - 均值0，标准差1的标准正态分布',
    distributionType: DISTRIBUTION_TYPES.NORMAL,
    params: { mean: 0, std: 1 },
    sampleSize: 10000,
    seed: 42,
  },
  {
    id: 'high-lambda-poisson',
    name: '高 λ 泊松',
    description: 'Poisson(λ=100) - 大参数泊松分布，近似正态',
    distributionType: DISTRIBUTION_TYPES.POISSON,
    params: { lambda: 100 },
    sampleSize: 10000,
    seed: 12345,
  },
  {
    id: 'small-n-binomial',
    name: '小 n 二项',
    description: 'Binomial(n=10, p=0.3) - 小样本二项分布',
    distributionType: DISTRIBUTION_TYPES.BINOMIAL,
    params: { n: 10, p: 0.3 },
    sampleSize: 10000,
    seed: 9999,
  },
]

export const STANDARD_NORMAL = EXAMPLES[0]
export const HIGH_LAMBDA_POISSON = EXAMPLES[1]
export const SMALL_N_BINOMIAL = EXAMPLES[2]
