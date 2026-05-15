class GraphError extends Error {
  constructor(message, code, details = {}) {
    super(message)
    this.name = 'GraphError'
    this.code = code
    this.details = details
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    }
  }
}

class CycleDetectedError extends GraphError {
  constructor(cycleNodes = []) {
    super('检测到图中存在环', 'CycleDetected', { cycleNodes })
    this.name = 'CycleDetectedError'
  }
}

class InvalidSchemaError extends GraphError {
  constructor(message, field = null) {
    super(message || '数据格式无效', 'InvalidSchema', { field })
    this.name = 'InvalidSchemaError'
  }
}

class WorkerLayoutError extends GraphError {
  constructor(originalError = null) {
    super('Worker 布局计算失败，已降级到主线程', 'WorkerFailed', { originalError })
    this.name = 'WorkerLayoutError'
  }
}

class LayoutTimeoutError extends GraphError {
  constructor(iterations = 0) {
    super(`布局计算在 ${iterations} 次迭代后仍未收敛`, 'LayoutTimeout', { iterations })
    this.name = 'LayoutTimeoutError'
  }
}

export {
  GraphError,
  CycleDetectedError,
  InvalidSchemaError,
  WorkerLayoutError,
  LayoutTimeoutError,
}
