import { MESSAGE_TYPE } from './constants.js'

class HeartbeatManager {
  constructor() {
    this.intervalId = null
    this.lastSentTime = null
    this.heartbeatMap = new Map()
    this.rttHistory = []
    this.maxHistorySize = 20
  }

  start(intervalMs, sendFn) {
    if (this.intervalId) {
      this.stop()
    }

    this.intervalId = setInterval(() => {
      const id = Date.now()
      this.lastSentTime = Date.now()
      this.heartbeatMap.set(id, { sentAt: this.lastSentTime })
      
      if (sendFn) {
        sendFn({ id, sentAt: this.lastSentTime })
      }
    }, intervalMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  onPong(id) {
    const now = Date.now()
    const entry = this.heartbeatMap.get(id)
    
    if (entry) {
      const rtt = now - entry.sentAt
      entry.receivedAt = now
      entry.rtt = rtt
      
      this.rttHistory.push(rtt)
      if (this.rttHistory.length > this.maxHistorySize) {
        this.rttHistory.shift()
      }
      
      this.heartbeatMap.delete(id)
      return rtt
    }
    
    return null
  }

  getLatestRtt() {
    if (this.rttHistory.length === 0) return null
    return this.rttHistory[this.rttHistory.length - 1]
  }

  getAverageRtt() {
    if (this.rttHistory.length === 0) return null
    const sum = this.rttHistory.reduce((a, b) => a + b, 0)
    return Math.round(sum / this.rttHistory.length)
  }

  getMinRtt() {
    if (this.rttHistory.length === 0) return null
    return Math.min(...this.rttHistory)
  }

  getMaxRtt() {
    if (this.rttHistory.length === 0) return null
    return Math.max(...this.rttHistory)
  }

  clearHistory() {
    this.rttHistory = []
    this.heartbeatMap.clear()
  }

  isRunning() {
    return this.intervalId !== null
  }

  getStats() {
    return {
      isRunning: this.isRunning(),
      latestRtt: this.getLatestRtt(),
      averageRtt: this.getAverageRtt(),
      minRtt: this.getMinRtt(),
      maxRtt: this.getMaxRtt(),
      sampleCount: this.rttHistory.length,
      pendingCount: this.heartbeatMap.size,
    }
  }
}

function createHeartbeatPayload(message, type) {
  if (type === 'binary') {
    if (typeof message === 'string') {
      const encoder = new TextEncoder()
      return encoder.encode(message).buffer
    }
    return message
  }
  return String(message)
}

function prepareHeartbeatMessage(heartbeatMessage, heartbeatType) {
  const payload = createHeartbeatPayload(heartbeatMessage, heartbeatType)
  return {
    type: heartbeatType === 'binary' ? MESSAGE_TYPE.BINARY : MESSAGE_TYPE.TEXT,
    payload,
    isHeartbeat: true,
  }
}

export { HeartbeatManager, createHeartbeatPayload, prepareHeartbeatMessage }
