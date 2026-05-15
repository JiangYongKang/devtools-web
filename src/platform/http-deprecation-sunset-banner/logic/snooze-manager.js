import { STORAGE_KEYS, SNOOZE_TYPE, DEFAULT_SNOOZE_MINUTES } from './constants'

export class SnoozeManager {
  constructor(storageAdapter = null) {
    this.storage = storageAdapter || new DefaultStorage()
    this._snoozed = null
    this._sessionStartTime = Date.now()
  }

  getSnoozedNotices() {
    if (this._snoozed === null) {
      try {
        const stored = this.storage.get(STORAGE_KEYS.SNOOZED_NOTICES)
        this._snoozed = stored ? JSON.parse(stored) : {}
      } catch (e) {
        this._snoozed = {}
      }
    }
    return this._snoozed
  }

  saveSnoozedNotices(snoozed) {
    this._snoozed = snoozed
    this.storage.set(STORAGE_KEYS.SNOOZED_NOTICES, JSON.stringify(snoozed))
  }

  isNoticeSnoozed(noticeId) {
    const snoozed = this.getSnoozedNotices()
    const entry = snoozed[noticeId]
    
    if (!entry) {
      return false
    }
    
    if (entry.type === SNOOZE_TYPE.SESSION) {
      return this._sessionStartTime < entry.snoozedAt
    }
    
    if (entry.type === SNOOZE_TYPE.MINUTES) {
      const expiresAt = entry.snoozedAt + entry.minutes * 60 * 1000
      return Date.now() < expiresAt
    }
    
    return false
  }

  snoozeNotice(noticeId, type = SNOOZE_TYPE.SESSION, minutes = DEFAULT_SNOOZE_MINUTES) {
    const snoozed = this.getSnoozedNotices()
    snoozed[noticeId] = {
      type,
      minutes: type === SNOOZE_TYPE.MINUTES ? minutes : null,
      snoozedAt: Date.now(),
    }
    this.saveSnoozedNotices(snoozed)
  }

  unsnoozeNotice(noticeId) {
    const snoozed = this.getSnoozedNotices()
    delete snoozed[noticeId]
    this.saveSnoozedNotices(snoozed)
  }

  clearExpired() {
    const snoozed = this.getSnoozedNotices()
    const now = Date.now()
    let changed = false
    
    for (const [noticeId, entry] of Object.entries(snoozed)) {
      if (entry.type === SNOOZE_TYPE.MINUTES) {
        const expiresAt = entry.snoozedAt + entry.minutes * 60 * 1000
        if (now >= expiresAt) {
          delete snoozed[noticeId]
          changed = true
        }
      }
    }
    
    if (changed) {
      this.saveSnoozedNotices(snoozed)
    }
    
    return changed
  }

  filterVisibleNotices(notices) {
    this.clearExpired()
    return notices.filter(notice => !this.isNoticeSnoozed(notice.id))
  }

  getSnoozeInfo(noticeId) {
    const snoozed = this.getSnoozedNotices()
    return snoozed[noticeId] || null
  }

  resetSession() {
    const snoozed = this.getSnoozedNotices()
    const filtered = {}
    
    for (const [noticeId, entry] of Object.entries(snoozed)) {
      if (entry.type === SNOOZE_TYPE.MINUTES) {
        const expiresAt = entry.snoozedAt + entry.minutes * 60 * 1000
        if (Date.now() < expiresAt) {
          filtered[noticeId] = entry
        }
      }
    }
    
    this.saveSnoozedNotices(filtered)
    this._sessionStartTime = Date.now()
  }
}

class DefaultStorage {
  get(key) {
    return localStorage.getItem(key)
  }
  
  set(key, value) {
    localStorage.setItem(key, value)
  }
  
  remove(key) {
    localStorage.removeItem(key)
  }
}

export class InMemoryStorage {
  constructor() {
    this.data = {}
  }
  
  get(key) {
    return this.data[key] || null
  }
  
  set(key, value) {
    this.data[key] = value
  }
  
  remove(key) {
    delete this.data[key]
  }
}

let defaultManager = null

export function getDefaultSnoozeManager() {
  if (!defaultManager) {
    defaultManager = new SnoozeManager()
  }
  return defaultManager
}

function escapeShellString(str) {
  if (!str) return ''
  return str.replace(/'/g, "'\\''")
}

export function generateCurlTemplate(url, method = 'GET', headers = {}) {
  const headerParts = Object.entries(headers)
    .map(([key, value]) => `-H '${escapeShellString(key)}: ${escapeShellString(value)}'`)
    .join(' ')
  
  return `curl -X ${method} ${headerParts} '${escapeShellString(url)}'`
}
