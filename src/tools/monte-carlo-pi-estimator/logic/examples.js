/**
 * 内置示例配置
 */

export const EXAMPLES = [
  {
    id: 'quick-1e4',
    name: '快速 1e4',
    description: '小样本快速演示，10,000 次采样',
    config: {
      method: 'standard',
      totalSamples: 10000,
      workerCount: 2,
      batchSize: 1000,
      confidence: 0.95,
      seed: 12345,
    },
  },
  {
    id: 'high-precision-1e6',
    name: '高精度 1e6 分片',
    description: '1,000,000 次采样，多 Worker 并行',
    config: {
      method: 'standard',
      totalSamples: 1000000,
      workerCount: 4,
      batchSize: 10000,
      confidence: 0.95,
      seed: 67890,
    },
  },
  {
    id: 'buffon-demo',
    name: 'Buffon 演示',
    description: 'Buffon 投针法估算 π',
    config: {
      method: 'buffon',
      totalSamples: 100000,
      workerCount: 2,
      batchSize: 5000,
      confidence: 0.95,
      seed: 13579,
      needleLength: 1,
      lineSpacing: 2,
    },
  },
  {
    id: 'stratified-comparison',
    name: '分层采样对比',
    description: '对比标准蒙特卡洛与分层采样的方差缩减效果',
    config: {
      method: 'stratified',
      totalSamples: 100000,
      workerCount: 2,
      batchSize: 5000,
      confidence: 0.95,
      seed: 24680,
      strata: 10,
      compareWithStandard: true,
    },
  },
  {
    id: 'antithetic-comparison',
    name: '对偶变量对比',
    description: '对比标准蒙特卡洛与对偶变量的方差缩减效果',
    config: {
      method: 'antithetic',
      totalSamples: 100000,
      workerCount: 2,
      batchSize: 5000,
      confidence: 0.95,
      seed: 98765,
      compareWithStandard: true,
    },
  },
]

export const QUICK_EXAMPLE = EXAMPLES[0]
export const HIGH_PRECISION_EXAMPLE = EXAMPLES[1]
export const BUFFON_EXAMPLE = EXAMPLES[2]

export const METHOD_LABELS = {
  standard: '单位圆随机点法',
  stratified: '分层采样',
  antithetic: '对偶变量',
  buffon: 'Buffon 投针法',
}

export const CONFIDENCE_OPTIONS = [
  { value: 0.8, label: '80%' },
  { value: 0.9, label: '90%' },
  { value: 0.95, label: '95%' },
  { value: 0.99, label: '99%' },
]

export const WORKER_COUNT_OPTIONS = [1, 2, 4, 6, 8]

export const DEFAULT_CONFIG = {
  method: 'standard',
  totalSamples: 10000,
  workerCount: 2,
  batchSize: 1000,
  confidence: 0.95,
  seed: 12345,
  strata: 10,
  needleLength: 1,
  lineSpacing: 2,
}
