import { generateRevision } from './stateMachine.js'
import { createErrorByHttpStatus, NetworkError, TimeoutError } from './errors.js'

class MockServer {
  constructor(initialData = [], options = {}) {
    this.dataStore = new Map()
    this.revisionStore = new Map()
    this.requestLog = []

    this.options = {
      networkDelayMs: options.networkDelayMs ?? 800,
      conflictProbability: options.conflictProbability ?? 0.3,
      errorRate5xx: options.errorRate5xx ?? 0.1,
      timeoutRate: options.timeoutRate ?? 0.05,
    }

    initialData.forEach((item) => {
      this.dataStore.set(item.id, { ...item })
      this.revisionStore.set(item.id, generateRevision())
    })
  }

  setOption(key, value) {
    if (key in this.options) {
      this.options[key] = value
    }
  }

  setOptions(newOptions) {
    Object.assign(this.options, newOptions)
  }

  async delay() {
    return new Promise((resolve) => {
      setTimeout(resolve, this.options.networkDelayMs)
    })
  }

  shouldTriggerConflict() {
    return Math.random() < this.options.conflictProbability
  }

  shouldTrigger5xx() {
    return Math.random() < this.options.errorRate5xx
  }

  shouldTriggerTimeout() {
    return Math.random() < this.options.timeoutRate
  }

  async fetchItem(itemId, ifNoneMatch = null) {
    await this.delay()

    const requestInfo = {
      timestamp: Date.now(),
      method: 'GET',
      itemId,
      headers: { 'If-None-Match': ifNoneMatch },
    }

    if (this.shouldTriggerTimeout()) {
      this.requestLog.push({ ...requestInfo, status: 'timeout' })
      throw new TimeoutError('请求超时')
    }

    if (this.shouldTrigger5xx()) {
      this.requestLog.push({ ...requestInfo, status: 500 })
      throw createErrorByHttpStatus(500, '服务器内部错误')
    }

    const item = this.dataStore.get(itemId)
    const revision = this.revisionStore.get(itemId)

    if (!item) {
      this.requestLog.push({ ...requestInfo, status: 404 })
      throw createErrorByHttpStatus(404, '资源不存在')
    }

    if (ifNoneMatch === revision) {
      this.requestLog.push({ ...requestInfo, status: 304 })
      return {
        status: 304,
        data: null,
        headers: { ETag: revision },
      }
    }

    this.requestLog.push({ ...requestInfo, status: 200 })
    return {
      status: 200,
      data: { ...item },
      headers: { ETag: revision },
    }
  }

  async fetchAll() {
    await this.delay()

    const requestInfo = {
      timestamp: Date.now(),
      method: 'GET',
      itemId: '*',
    }

    if (this.shouldTriggerTimeout()) {
      this.requestLog.push({ ...requestInfo, status: 'timeout' })
      throw new TimeoutError('请求超时')
    }

    if (this.shouldTrigger5xx()) {
      this.requestLog.push({ ...requestInfo, status: 500 })
      throw createErrorByHttpStatus(500, '服务器内部错误')
    }

    const items = Array.from(this.dataStore.values()).map((item) => ({
      ...item,
    }))

    this.requestLog.push({ ...requestInfo, status: 200 })
    return {
      status: 200,
      data: items,
      headers: {},
    }
  }

  async updateItem(itemId, changes, ifMatch = null, actorId = null) {
    await this.delay()

    const requestInfo = {
      timestamp: Date.now(),
      method: 'PUT',
      itemId,
      changes,
      headers: { 'If-Match': ifMatch },
      actorId,
    }

    if (this.shouldTriggerTimeout()) {
      this.requestLog.push({ ...requestInfo, status: 'timeout' })
      throw new TimeoutError('请求超时')
    }

    if (this.shouldTrigger5xx()) {
      this.requestLog.push({ ...requestInfo, status: 500 })
      throw createErrorByHttpStatus(500, '服务器内部错误')
    }

    const currentItem = this.dataStore.get(itemId)
    const currentRevision = this.revisionStore.get(itemId)

    if (!currentItem) {
      this.requestLog.push({ ...requestInfo, status: 404 })
      throw createErrorByHttpStatus(404, '资源不存在')
    }

    if (ifMatch && ifMatch !== currentRevision) {
      this.requestLog.push({ ...requestInfo, status: 412 })
      throw createErrorByHttpStatus(
        412,
        '前置条件失败，版本已过期',
        {
          localRevision: ifMatch,
          remoteRevision: currentRevision,
          remoteData: { ...currentItem },
        }
      )
    }

    if (this.shouldTriggerConflict()) {
      const remoteChanges = this.generateRandomChanges(currentItem)
      const conflictingData = { ...currentItem, ...remoteChanges }
      const newRevision = generateRevision()

      this.dataStore.set(itemId, conflictingData)
      this.revisionStore.set(itemId, newRevision)

      this.requestLog.push({
        ...requestInfo,
        status: 412,
        conflictType: 'simulated',
      })

      throw createErrorByHttpStatus(
        412,
        '检测到并发冲突',
        {
          localRevision: ifMatch,
          remoteRevision: newRevision,
          remoteData: { ...conflictingData },
        }
      )
    }

    const updatedItem = { ...currentItem, ...changes }
    const newRevision = generateRevision()

    this.dataStore.set(itemId, updatedItem)
    this.revisionStore.set(itemId, newRevision)

    this.requestLog.push({ ...requestInfo, status: 200 })
    return {
      status: 200,
      data: { ...updatedItem },
      headers: { ETag: newRevision },
    }
  }

  generateRandomChanges(item) {
    const availableFields = Object.keys(item).filter(f => 
      ['title', 'description', 'status', 'priority'].includes(f)
    )
    
    if (availableFields.length === 0) {
      availableFields.push('title')
    }
    
    const changes = {}
    const numChanges = 1

    for (let i = 0; i < numChanges; i++) {
      const field = availableFields[Math.floor(Math.random() * availableFields.length)]

      switch (field) {
        case 'title':
          changes.title = item.title + ' (remote edit)'
          break
        case 'description':
          changes.description = (item.description || '') + ' [updated by remote]'
          break
        case 'status':
          const statuses = ['todo', 'in_progress', 'review', 'done']
          const currentIndex = statuses.indexOf(item.status)
          const nextIndex = (currentIndex + 1) % statuses.length
          changes.status = statuses[nextIndex]
          break
        case 'priority':
          const priorities = ['low', 'medium', 'high']
          const priorityIndex = priorities.indexOf(item.priority)
          const newPriorityIndex = (priorityIndex + 1) % priorities.length
          changes.priority = priorities[newPriorityIndex]
          break
      }
    }

    return changes
  }

  async simulateRemoteEdit(itemId, actorId = 'system') {
    const currentItem = this.dataStore.get(itemId)
    if (!currentItem) return null

    const remoteChanges = { title: currentItem.title + ' (remote edit by ' + actorId + ')' }
    const newRevision = generateRevision()

    const updatedItem = { ...currentItem, ...remoteChanges }
    this.dataStore.set(itemId, updatedItem)
    this.revisionStore.set(itemId, newRevision)

    this.requestLog.push({
      timestamp: Date.now(),
      method: 'REMOTE_EDIT',
      itemId,
      changes: remoteChanges,
      actorId,
      status: 'applied',
    })

    return {
      item: updatedItem,
      revision: newRevision,
      changes: remoteChanges,
    }
  }

  getRevision(itemId) {
    return this.revisionStore.get(itemId)
  }

  getItem(itemId) {
    const item = this.dataStore.get(itemId)
    return item ? { ...item } : null
  }

  getAllItems() {
    return Array.from(this.dataStore.values()).map((item) => ({ ...item }))
  }

  getRequestLog() {
    return [...this.requestLog]
  }

  getStatistics() {
    const log = this.requestLog
    return {
      totalRequests: log.length,
      successCount: log.filter((r) => r.status === 200 || r.status === 304).length,
      conflictCount: log.filter((r) => r.status === 412).length,
      errorCount: log.filter((r) => typeof r.status === 'number' && r.status >= 400 && r.status !== 412).length,
      timeoutCount: log.filter((r) => r.status === 'timeout').length,
    }
  }

  reset() {
    this.requestLog = []
  }

  forceConflict(itemId) {
    const currentItem = this.dataStore.get(itemId)
    if (currentItem) {
      const remoteChanges = { title: currentItem.title + ' (forced conflict)' }
      const newRevision = generateRevision()
      this.dataStore.set(itemId, { ...currentItem, ...remoteChanges })
      this.revisionStore.set(itemId, newRevision)
    }
  }
}

const createMockServer = (initialData, options) => {
  return new MockServer(initialData, options)
}

export { MockServer, createMockServer }
