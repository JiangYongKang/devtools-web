import { DAYS_IN_MONTH, DAYS_IN_MONTH_LEAP, GREGORIAN_START_YEAR, GREGORIAN_START_MONTH, GREGORIAN_START_DAY } from './constants.js'
import { TemporalPolyfillError } from './errors.js'

function isLeapYear(year) {
  if (year % 4 !== 0) return false
  if (year % 100 !== 0) return true
  return year % 400 === 0
}

function getDaysInMonth(year, month) {
  return isLeapYear(year) ? DAYS_IN_MONTH_LEAP[month - 1] : DAYS_IN_MONTH[month - 1]
}

function isValidDate(year, month, day) {
  if (year < GREGORIAN_START_YEAR) return false
  if (year === GREGORIAN_START_YEAR && month < GREGORIAN_START_MONTH) return false
  if (year === GREGORIAN_START_YEAR && month === GREGORIAN_START_MONTH && day < GREGORIAN_START_DAY) return false
  if (month < 1 || month > 12) return false
  if (day < 1 || day > getDaysInMonth(year, month)) return false
  return true
}

function isValidTime(hour, minute, second = 0, millisecond = 0) {
  if (hour < 0 || hour > 23) return false
  if (minute < 0 || minute > 59) return false
  if (second < 0 || second > 59) return false
  if (millisecond < 0 || millisecond > 999) return false
  return true
}

class PlainDate {
  constructor(year, month, day) {
    if (!isValidDate(year, month, day)) {
      throw new TemporalPolyfillError(`Invalid date: ${year}-${month}-${day}`)
    }
    this._year = year
    this._month = month
    this._day = day
    Object.freeze(this)
  }

  get year() { return this._year }
  get month() { return this._month }
  get day() { return this._day }

  get dayOfWeek() {
    const d = new Date(this._year, this._month - 1, this._day)
    return d.getDay()
  }

  get daysInMonth() {
    return getDaysInMonth(this._year, this._month)
  }

  get daysInYear() {
    return isLeapYear(this._year) ? 366 : 365
  }

  get isLeapYear() {
    return isLeapYear(this._year)
  }

  equals(other) {
    if (!(other instanceof PlainDate)) return false
    return this._year === other._year && this._month === other._month && this._day === other._day
  }

  toString() {
    const y = String(this._year).padStart(4, '0')
    const m = String(this._month).padStart(2, '0')
    const d = String(this._day).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  toJSON() {
    return this.toString()
  }

  add({ years = 0, months = 0, days = 0 }) {
    let newYear = this._year + years
    let newMonth = this._month + months
    let newDay = this._day

    while (newMonth > 12) {
      newMonth -= 12
      newYear += 1
    }
    while (newMonth < 1) {
      newMonth += 12
      newYear -= 1
    }

    const maxDay = getDaysInMonth(newYear, newMonth)
    newDay = Math.min(newDay, maxDay)

    const result = new PlainDate(newYear, newMonth, newDay)
    if (days === 0) return result

    const date = new Date(newYear, newMonth - 1, newDay + days)
    return PlainDate.from(date)
  }

  subtract({ years = 0, months = 0, days = 0 }) {
    return this.add({ years: -years, months: -months, days: -days })
  }

  static from(input) {
    if (input instanceof PlainDate) {
      return input
    }
    if (input instanceof Date) {
      return new PlainDate(input.getFullYear(), input.getMonth() + 1, input.getDate())
    }
    if (typeof input === 'string') {
      const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (match) {
        return new PlainDate(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10))
      }
    }
    if (typeof input === 'object' && input !== null) {
      if ('year' in input && 'month' in input && 'day' in input) {
        return new PlainDate(input.year, input.month, input.day)
      }
    }
    throw new TemporalPolyfillError(`Cannot convert to PlainDate: ${input}`)
  }

  static compare(a, b) {
    if (a._year !== b._year) return a._year - b._year
    if (a._month !== b._month) return a._month - b._month
    return a._day - b._day
  }
}

class PlainDateTime {
  constructor(year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0) {
    if (!isValidDate(year, month, day)) {
      throw new TemporalPolyfillError(`Invalid date: ${year}-${month}-${day}`)
    }
    if (!isValidTime(hour, minute, second, millisecond)) {
      throw new TemporalPolyfillError(`Invalid time: ${hour}:${minute}:${second}.${millisecond}`)
    }
    this._year = year
    this._month = month
    this._day = day
    this._hour = hour
    this._minute = minute
    this._second = second
    this._millisecond = millisecond
    Object.freeze(this)
  }

  get year() { return this._year }
  get month() { return this._month }
  get day() { return this._day }
  get hour() { return this._hour }
  get minute() { return this._minute }
  get second() { return this._second }
  get millisecond() { return this._millisecond }

  get plainDate() {
    return new PlainDate(this._year, this._month, this._day)
  }

  get dayOfWeek() {
    const d = new Date(this._year, this._month - 1, this._day)
    return d.getDay()
  }

  get daysInMonth() {
    return getDaysInMonth(this._year, this._month)
  }

  get isLeapYear() {
    return isLeapYear(this._year)
  }

  equals(other) {
    if (!(other instanceof PlainDateTime)) return false
    return this._year === other._year &&
      this._month === other._month &&
      this._day === other._day &&
      this._hour === other._hour &&
      this._minute === other._minute &&
      this._second === other._second &&
      this._millisecond === other._millisecond
  }

  toString() {
    const y = String(this._year).padStart(4, '0')
    const m = String(this._month).padStart(2, '0')
    const d = String(this._day).padStart(2, '0')
    const h = String(this._hour).padStart(2, '0')
    const min = String(this._minute).padStart(2, '0')
    const s = String(this._second).padStart(2, '0')
    const ms = this._millisecond > 0 ? `.${String(this._millisecond).padStart(3, '0')}` : ''
    return `${y}-${m}-${d}T${h}:${min}:${s}${ms}`
  }

  toJSON() {
    return this.toString()
  }

  toInstant(timeZone = 'UTC') {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(new Date(this._year, this._month - 1, this._day, this._hour, this._minute, this._second))
    const getPart = (type) => parts.find(p => p.type === type)?.value
    const offsetMinutes = this._getTimezoneOffsetMinutes(timeZone)
    const epochMs = Date.UTC(this._year, this._month - 1, this._day, this._hour, this._minute, this._second) + offsetMinutes * 60 * 1000
    return { epochMilliseconds: epochMs }
  }

  _getTimezoneOffsetMinutes(timeZone) {
    const now = new Date(this._year, this._month - 1, this._day, this._hour, this._minute)
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone }))
    return (utcDate.getTime() - tzDate.getTime()) / 60000
  }

  add({ years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0, milliseconds = 0 }) {
    const date = new Date(this._year, this._month - 1, this._day, this._hour, this._minute, this._second, this._millisecond)
    date.setFullYear(date.getFullYear() + years)
    date.setMonth(date.getMonth() + months)
    date.setDate(date.getDate() + days)
    date.setHours(date.getHours() + hours)
    date.setMinutes(date.getMinutes() + minutes)
    date.setSeconds(date.getSeconds() + seconds)
    date.setMilliseconds(date.getMilliseconds() + milliseconds)
    return PlainDateTime.from(date)
  }

  subtract({ years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0, milliseconds = 0 }) {
    return this.add({
      years: -years,
      months: -months,
      days: -days,
      hours: -hours,
      minutes: -minutes,
      seconds: -seconds,
      milliseconds: -milliseconds,
    })
  }

  static from(input) {
    if (input instanceof PlainDateTime) {
      return input
    }
    if (input instanceof Date) {
      return new PlainDateTime(
        input.getFullYear(),
        input.getMonth() + 1,
        input.getDate(),
        input.getHours(),
        input.getMinutes(),
        input.getSeconds(),
        input.getMilliseconds()
      )
    }
    if (typeof input === 'string') {
      const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{3}))?$/)
      if (isoMatch) {
        return new PlainDateTime(
          parseInt(isoMatch[1], 10),
          parseInt(isoMatch[2], 10),
          parseInt(isoMatch[3], 10),
          parseInt(isoMatch[4], 10),
          parseInt(isoMatch[5], 10),
          parseInt(isoMatch[6] || '0', 10),
          parseInt(isoMatch[7] || '0', 10)
        )
      }
    }
    if (typeof input === 'object' && input !== null) {
      if ('year' in input && 'month' in input && 'day' in input) {
        return new PlainDateTime(
          input.year,
          input.month,
          input.day,
          input.hour || 0,
          input.minute || 0,
          input.second || 0,
          input.millisecond || 0
        )
      }
    }
    throw new TemporalPolyfillError(`Cannot convert to PlainDateTime: ${input}`)
  }

  static compare(a, b) {
    if (a._year !== b._year) return a._year - b._year
    if (a._month !== b._month) return a._month - b._month
    if (a._day !== b._day) return a._day - b._day
    if (a._hour !== b._hour) return a._hour - b._hour
    if (a._minute !== b._minute) return a._minute - b._minute
    if (a._second !== b._second) return a._second - b._second
    return a._millisecond - b._millisecond
  }
}

const hasNativeTemporal = typeof Temporal !== 'undefined'

const PolyfilledPlainDate = hasNativeTemporal ? Temporal.PlainDate : PlainDate
const PolyfilledPlainDateTime = hasNativeTemporal ? Temporal.PlainDateTime : PlainDateTime

export {
  PlainDate,
  PlainDateTime,
  PolyfilledPlainDate,
  PolyfilledPlainDateTime,
  hasNativeTemporal,
  isLeapYear,
  getDaysInMonth,
  isValidDate,
  isValidTime,
}
