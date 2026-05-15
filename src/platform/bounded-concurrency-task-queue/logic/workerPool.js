import { ERROR_CODES } from './constants.js'
import { createError, wrapError } from './errors.js'
import { createPool } from './pool.js'
import { defer, generateId } from './utils.js'

const WORKER_AVAILABLE = typeof Worker !== 'undefined'

const workerScript = `
  self.onmessage = async (e) => {
    const { id, type, payload } = e.data
    try {
      let result
      switch (type) {
        case 'findPrimes':
          result = findPrimes(payload.limit)
          break
        case 'fibonacci':
          result = fibonacci(payload.n)
          break
        case 'heavyCalculation':
          result = heavyCalculation(payload.iterations)
          break
        default:
          throw new Error('Unknown task type: ' + type)
      }
      self.postMessage({ id, success: true, result })
    } catch (error) {
      self.postMessage({ id, success: false, error: error.message })
    }
  }

  function findPrimes(limit) {
    const primes = []
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
    return primes
  }

  function fibonacci(n) {
    if (n <= 1) return n
    let a = 0, b = 1
    for (let i = 2; i <= n; i++) {
      const c = a + b
      a = b
      b = c
    }
    return b
  }

  function heavyCalculation(iterations) {
    let result = 0
    for (let i = 0; i < iterations; i++) {
      result += Math.sin(i) * Math.cos(i) * Math.tan(i)
    }
    return result
  }
`

function createBlobWorker() {
  const blob = new Blob([workerScript], { type: 'application/javascript' })
  const url = URL.createObjectURL(blob)
  return new Worker(url)
}

export function createWorkerPool(options = {}) {
  const pool = createPool(options)
  const workers = new Map()
  const workerCount = options.workerCount || Math.min(navigator?.hardwareConcurrency || 4, 8)
  const pendingTasks = new Map()

  function initWorkers() {
    for (let i = 0; i < workerCount; i++) {
      createWorker(i)
    }
  }

  function createWorker(index) {
    try {
      const worker = WORKER_AVAILABLE ? createBlobWorker() : null
      if (worker) {
        worker.onmessage = (e) => {
          const { id, success, result, error } = e.data
          const deferred = pendingTasks.get(id)
          if (deferred) {
            if (success) {
              deferred.resolve(result)
            } else {
              deferred.reject(createError(ERROR_CODES.WORKER_ERROR, error))
            }
            pendingTasks.delete(id)
          }
        }

        worker.onerror = (error) => {
          console.error('Worker error:', error)
        }

        workers.set(index, { worker, busy: false })
      }
    } catch (e) {
      console.warn('Failed to create worker, will use main thread:', e)
    }
  }

  function getAvailableWorker() {
    for (const [index, workerInfo] of workers) {
      if (!workerInfo.busy) {
        return index
      }
    }
    return null
  }

  async function runInWorker(type, payload) {
    if (!WORKER_AVAILABLE || workers.size === 0) {
      return runInMainThread(type, payload)
    }

    let workerIndex = getAvailableWorker()
    while (workerIndex === null) {
      await new Promise((r) => setTimeout(r, 10))
      workerIndex = getAvailableWorker()
    }

    const workerInfo = workers.get(workerIndex)
    workerInfo.busy = true

    const id = generateId()
    const deferred = defer()
    pendingTasks.set(id, deferred)

    try {
      workerInfo.worker.postMessage({ id, type, payload })
      const result = await deferred.promise
      return result
    } finally {
      workerInfo.busy = false
    }
  }

  function runInMainThread(type, payload) {
    switch (type) {
      case 'findPrimes':
        return findPrimesMain(payload.limit)
      case 'fibonacci':
        return fibonacciMain(payload.n)
      case 'heavyCalculation':
        return heavyCalculationMain(payload.iterations)
      default:
        throw new Error('Unknown task type: ' + type)
    }
  }

  function findPrimesMain(limit) {
    const primes = []
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
    return primes
  }

  function fibonacciMain(n) {
    if (n <= 1) return n
    let a = 0, b = 1
    for (let i = 2; i <= n; i++) {
      const c = a + b
      a = b
      b = c
    }
    return b
  }

  function heavyCalculationMain(iterations) {
    let result = 0
    for (let i = 0; i < iterations; i++) {
      result += Math.sin(i) * Math.cos(i) * Math.tan(i)
    }
    return result
  }

  function enqueueWorkerTask(type, payload, options = {}) {
    return pool.enqueue(() => runInWorker(type, payload), {
      label: `worker:${type}`,
      metadata: { payload, usesWorker: WORKER_AVAILABLE && workers.size > 0 },
      ...options,
    })
  }

  if (WORKER_AVAILABLE) {
    initWorkers()
  }

  return {
    ...pool,
    enqueueWorkerTask,
    isWorkerAvailable: () => WORKER_AVAILABLE && workers.size > 0,
    getWorkerCount: () => workers.size,
  }
}
