import { sleep } from './utils.js'

export function createPrimeSearchTask(limit = 100000) {
  return async () => {
    const primes = []
    const startTime = Date.now()

    for (let n = 2; n <= limit; n++) {
      let isPrime = true
      for (let i = 2; i <= Math.sqrt(n); i++) {
        if (n % i === 0) {
          isPrime = false
          break
        }
      }
      if (isPrime) primes.push(n)
    }

    return {
      primes,
      count: primes.length,
      limit,
      duration: Date.now() - startTime,
    }
  }
}

export function createFetchTask(url = 'https://api.example.com/data', delayMs = 500, shouldFail = false) {
  return async () => {
    await sleep(delayMs)

    if (shouldFail) {
      throw new Error('Network request failed')
    }

    return {
      url,
      delay: delayMs,
      data: {
        id: Math.random().toString(36).slice(2),
        timestamp: Date.now(),
        message: 'Mock API response',
      },
    }
  }
}

export function createFibonacciTask(n = 40) {
  return async () => {
    const startTime = Date.now()

    function fib(x) {
      if (x <= 1) return x
      return fib(x - 1) + fib(x - 2)
    }

    const result = fib(n)

    return {
      n,
      result,
      duration: Date.now() - startTime,
    }
  }
}

export function createMatrixMultiplicationTask(size = 200) {
  return async () => {
    const startTime = Date.now()

    const matrixA = Array(size).fill().map(() => Array(size).fill().map(() => Math.random()))
    const matrixB = Array(size).fill().map(() => Array(size).fill().map(() => Math.random()))
    const result = Array(size).fill().map(() => Array(size).fill(0))

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        for (let k = 0; k < size; k++) {
          result[i][j] += matrixA[i][k] * matrixB[k][j]
        }
      }
    }

    return {
      size,
      duration: Date.now() - startTime,
      sampleValue: result[0][0],
    }
  }
}

export function createBatchTasks(count, taskCreator, baseLabel = 'batch') {
  const tasks = []
  for (let i = 0; i < count; i++) {
    tasks.push({
      task: taskCreator(),
      options: {
        label: `${baseLabel}-${i}`,
        metadata: { index: i, batch: baseLabel },
        priority: Math.floor(Math.random() * 10),
      },
    })
  }
  return tasks
}

export const EXAMPLE_TASK_PRESETS = {
  cpuHeavy: {
    name: 'CPU 密集型任务',
    description: '质数筛选、矩阵乘法等，适合 Web Worker 执行',
    tasks: [
      { label: '质数筛选 (100k)', task: createPrimeSearchTask(100000) },
      { label: '质数筛选 (500k)', task: createPrimeSearchTask(500000) },
      { label: '斐波那契 (40)', task: createFibonacciTask(40) },
      { label: '矩阵乘法 (200x200)', task: createMatrixMultiplicationTask(200) },
    ],
  },
  ioHeavy: {
    name: 'IO 密集型任务',
    description: '模拟网络请求，适合并发处理',
    tasks: [
      { label: '快速请求 (100ms)', task: createFetchTask('/api/quick', 100) },
      { label: '中速请求 (500ms)', task: createFetchTask('/api/medium', 500) },
      { label: '慢速请求 (1000ms)', task: createFetchTask('/api/slow', 1000) },
      { label: '超慢请求 (3000ms)', task: createFetchTask('/api/very-slow', 3000) },
    ],
  },
  mixed: {
    name: '混合任务',
    description: 'CPU 和 IO 任务混合',
    tasks: [
      { label: '质数筛选', task: createPrimeSearchTask(100000) },
      { label: '快速请求', task: createFetchTask('/api/quick', 100) },
      { label: '斐波那契', task: createFibonacciTask(35) },
      { label: '中速请求', task: createFetchTask('/api/medium', 500) },
    ],
  },
}
