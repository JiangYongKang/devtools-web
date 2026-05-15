import {
  LOG_LEVELS,
  FOLD_TYPES,
} from './constants.js'

function generateLogMessage(id, level = LOG_LEVELS.INFO) {
  const messages = {
    [LOG_LEVELS.TRACE]: [
      'Entering function parseConfig()',
      'Exiting function with return value: true',
      'Variable userData = { id: 123 }',
      'Loop iteration #5',
      'Cache lookup: key="session_abc"',
    ],
    [LOG_LEVELS.DEBUG]: [
      'Connection pool initialized with 10 connections',
      'Query executed in 45ms: SELECT * FROM users',
      'Request headers: { "Content-Type": "application/json" }',
      'Cache miss for key "product_456"',
      'Memory usage: 256MB / 1024MB',
    ],
    [LOG_LEVELS.INFO]: [
      'Server started successfully on port 3000',
      'User "john_doe" logged in from 192.168.1.100',
      'Database migration completed: 15 tables updated',
      'API request processed: GET /api/users (200 OK)',
      'Scheduled task "backup_database" executed successfully',
    ],
    [LOG_LEVELS.WARN]: [
      'High memory usage detected: 85% of capacity',
      'Rate limit approaching: 950/1000 requests used',
      'Deprecated API endpoint called: /v1/legacy',
      'Slow query detected: 2500ms threshold exceeded',
      'Connection pool running low: 2/10 connections available',
    ],
    [LOG_LEVELS.ERROR]: [
      'Failed to connect to database: Connection refused',
      'Authentication failed: Invalid token signature',
      'File not found: /etc/config/production.yml',
      'Unhandled promise rejection: Network error',
      'TypeError: Cannot read property "name" of undefined',
    ],
    [LOG_LEVELS.FATAL]: [
      'Out of memory: Process terminated',
      'Critical system failure: Kernel panic',
      'Database corruption detected: Unable to recover',
      'Fatal error in event loop: Process exiting',
      'Disk full: No space left on device',
    ],
  }

  const levelMessages = messages[level] || messages[LOG_LEVELS.INFO]
  const message = levelMessages[Math.floor(Math.random() * levelMessages.length)]

  return {
    id,
    timestamp: Date.now() + Math.random() * 1000,
    level,
    message,
    module: ['api', 'db', 'auth', 'cache', 'worker'][Math.floor(Math.random() * 5)],
    pid: typeof process !== 'undefined' ? process.pid : 12345,
  }
}

function generateJsonLog(id, level = LOG_LEVELS.INFO) {
  const baseLog = generateLogMessage(id, level)
  return {
    ...baseLog,
    message: JSON.stringify({
      event: baseLog.message.split(':')[0],
      details: baseLog.message,
      metadata: {
        requestId: `req_${Math.random().toString(36).substr(2, 9)}`,
        duration: Math.floor(Math.random() * 1000),
        traceId: `trace_${Math.random().toString(36).substr(2, 9)}`,
      },
    }),
    isJson: true,
  }
}

function generateStackTraceLog(id, level = LOG_LEVELS.ERROR) {
  const baseLog = generateLogMessage(id, level)
  const stackLines = [
    'Error: Something went wrong',
    '    at Object.<anonymous> (/app/src/index.js:42:15)',
    '    at Module._compile (node:internal/modules/cjs/loader:1105:14)',
    '    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1159:10)',
    '    at Module.load (node:internal/modules/cjs/loader:981:32)',
    '    at Function.Module._load (node:internal/modules/cjs/loader:822:12)',
    '    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:77:12)',
    '    at node:internal/main/run_main_module:17:47',
  ]

  return {
    ...baseLog,
    message: stackLines.join('\n'),
    isStackTrace: true,
    foldType: FOLD_TYPES.STACK_TRACE,
  }
}

function generateAnsiLog(id, level = LOG_LEVELS.INFO) {
  const baseLog = generateLogMessage(id, level)
  const levelColors = {
    [LOG_LEVELS.TRACE]: '\x1b[90m',
    [LOG_LEVELS.DEBUG]: '\x1b[36m',
    [LOG_LEVELS.INFO]: '\x1b[32m',
    [LOG_LEVELS.WARN]: '\x1b[33m',
    [LOG_LEVELS.ERROR]: '\x1b[31m',
    [LOG_LEVELS.FATAL]: '\x1b[41m\x1b[37m',
  }
  const reset = '\x1b[0m'
  const bold = '\x1b[1m'

  return {
    ...baseLog,
    message: `${levelColors[level] || reset}${bold}[${level.toUpperCase()}]${reset} ${levelColors[level] || reset}${baseLog.message}${reset}`,
    hasAnsi: true,
  }
}

function createLogStream(options = {}) {
  const {
    rate = 100,
    errorRate = 0.1,
    jsonRate = 0.2,
    stackTraceRate = 0.05,
    ansiRate = 0.3,
    onLog,
    signal,
  } = options

  let logId = 0
  let intervalId = null
  let isRunning = false

  function generateLog() {
    const rand = Math.random()
    const levelRand = Math.random()

    let level = LOG_LEVELS.INFO
    if (levelRand < errorRate) {
      level = Math.random() < 0.2 ? LOG_LEVELS.FATAL : LOG_LEVELS.ERROR
    } else if (levelRand < errorRate + 0.15) {
      level = LOG_LEVELS.WARN
    } else if (levelRand < errorRate + 0.25) {
      level = LOG_LEVELS.DEBUG
    } else if (levelRand < errorRate + 0.3) {
      level = LOG_LEVELS.TRACE
    }

    if (rand < stackTraceRate) {
      return generateStackTraceLog(logId++, level)
    } else if (rand < stackTraceRate + jsonRate) {
      return generateJsonLog(logId++, level)
    } else if (rand < stackTraceRate + jsonRate + ansiRate) {
      return generateAnsiLog(logId++, level)
    } else {
      return generateLogMessage(logId++, level)
    }
  }

  function start() {
    if (isRunning) return
    isRunning = true

    const interval = 1000 / rate

    intervalId = setInterval(() => {
      if (signal?.aborted) {
        stop()
        return
      }

      const log = generateLog()
      if (onLog) {
        onLog(log)
      }
    }, interval)
  }

  function stop() {
    isRunning = false
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function generateBatch(count) {
    const logs = []
    for (let i = 0; i < count; i++) {
      logs.push(generateLog())
    }
    return logs
  }

  return {
    start,
    stop,
    generateLog,
    generateBatch,
    isRunning: () => isRunning,
  }
}

function detectFoldType(log) {
  const message = typeof log === 'object' ? log.message || log.text || '' : String(log)

  if (log.isStackTrace || message.includes('Error:') || message.includes('    at ')) {
    return FOLD_TYPES.STACK_TRACE
  }

  if (log.isJson) {
    try {
      JSON.parse(message)
      return FOLD_TYPES.JSON
    } catch {
      // not valid JSON
    }
  }

  try {
    JSON.parse(message)
    return FOLD_TYPES.JSON
  } catch {
    // not valid JSON
  }

  return FOLD_TYPES.NONE
}

function expandFoldedContent(log) {
  const message = typeof log === 'object' ? log.message || log.text || '' : String(log)
  const foldType = detectFoldType(log)

  if (foldType === FOLD_TYPES.JSON) {
    try {
      const parsed = JSON.parse(message)
      return JSON.stringify(parsed, null, 2).split('\n')
    } catch {
      return [message]
    }
  }

  if (foldType === FOLD_TYPES.STACK_TRACE) {
    return message.split('\n')
  }

  return [message]
}

export {
  generateLogMessage,
  generateJsonLog,
  generateStackTraceLog,
  generateAnsiLog,
  createLogStream,
  detectFoldType,
  expandFoldedContent,
}
