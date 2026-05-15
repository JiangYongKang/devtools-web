import { ERROR_CODES, WARNING_CODES, DATE_PARSING_STRATEGIES } from './constants.js'
import { createError, createSuccess, createWarning } from './errors.js'

function parseDatetime(input, options = {}) {
  const {
    parsingStrategy = DATE_PARSING_STRATEGIES.DAY_FIRST,
  } = options

  const warnings = []

  if (typeof input !== 'string' && !(input instanceof Date)) {
    return createError(ERROR_CODES.INVALID_INPUT, '输入必须为字符串或 Date 对象')
  }

  let str = input instanceof Date ? input.toISOString() : String(input).trim()

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(?:Z|([+-]\d{2}:\d{2}))?)?$/)
  if (isoMatch) {
    const [, year, month, day, hours = '00', minutes = '00', seconds = '00', ms = '0'] = isoMatch
    const date = new Date(Date.UTC(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds),
      parseInt(ms.padEnd(3, '0').slice(0, 3))
    ))

    if (isNaN(date.getTime())) {
      return createError(ERROR_CODES.PARSING_FAILED, '无效的 ISO 日期格式')
    }

    checkDstBoundary(date, warnings)

    return createSuccess({
      value: date,
      timestamp: date.getTime(),
      isoString: date.toISOString(),
      format: 'iso',
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hours: date.getUTCHours(),
      minutes: date.getUTCMinutes(),
      seconds: date.getUTCSeconds(),
    }, warnings)
  }

  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (slashMatch) {
    const [, part1, part2, year, hours = '00', minutes = '00', seconds = '00'] = slashMatch

    let day, month
    let isAmbiguous = false

    const p1 = parseInt(part1)
    const p2 = parseInt(part2)

    if (p1 > 12 && p2 <= 12) {
      day = p1
      month = p2
    } else if (p2 > 12 && p1 <= 12) {
      day = p2
      month = p1
    } else if (p1 <= 12 && p2 <= 12) {
      isAmbiguous = true

      if (parsingStrategy === DATE_PARSING_STRATEGIES.DAY_FIRST) {
        day = p1
        month = p2
      } else if (parsingStrategy === DATE_PARSING_STRATEGIES.MONTH_FIRST) {
        day = p2
        month = p1
      } else {
        return createError(ERROR_CODES.AMBIGUOUS_DATE, '日期格式歧义，需指定解析策略', {
          possibleFormats: [
            { day: p1, month: p2 },
            { day: p2, month: p1 },
          ],
        })
      }

      warnings.push(createWarning(WARNING_CODES.DATE_AMBIGUITY_RESOLVED, '', {
        strategy: parsingStrategy,
        original: `${part1}/${part2}/${year}`,
        parsed: { day, month, year: parseInt(year) },
      }))
    } else {
      return createError(ERROR_CODES.PARSING_FAILED, '无效的日期格式')
    }

    const date = new Date(
      parseInt(year),
      month - 1,
      day,
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    )

    if (isNaN(date.getTime())) {
      return createError(ERROR_CODES.PARSING_FAILED, '无效的日期值')
    }

    checkDstBoundary(date, warnings)

    return createSuccess({
      value: date,
      timestamp: date.getTime(),
      isoString: date.toISOString(),
      format: 'slash',
      isAmbiguous,
      parsingStrategyUsed: isAmbiguous ? parsingStrategy : null,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
    }, warnings)
  }

  const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (dotMatch) {
    const [, day, month, year, hours = '00', minutes = '00', seconds = '00'] = dotMatch

    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    )

    if (isNaN(date.getTime())) {
      return createError(ERROR_CODES.PARSING_FAILED, '无效的日期格式')
    }

    checkDstBoundary(date, warnings)

    return createSuccess({
      value: date,
      timestamp: date.getTime(),
      isoString: date.toISOString(),
      format: 'dot',
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
    }, warnings)
  }

  return createError(ERROR_CODES.PARSING_FAILED, '无法识别的日期格式')
}

function checkDstBoundary(date, warnings) {
  const month = date.getMonth()
  const day = date.getDate()

  if ((month === 2 || month === 9) && day >= 25 && day <= 31) {
    warnings.push(createWarning(WARNING_CODES.DST_BOUNDARY, '', {
      month: month + 1,
      day,
    }))
  }
}

function formatDatetime(date, options = {}) {
  const {
    locale = 'zh-CN',
    timezone = null,
    style = 'full',
  } = options

  const formatOptions = {}

  if (style === 'full') {
    Object.assign(formatOptions, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } else if (style === 'date') {
    Object.assign(formatOptions, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } else if (style === 'time') {
    Object.assign(formatOptions, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  if (timezone) {
    formatOptions.timeZone = timezone
  }

  return new Intl.DateTimeFormat(locale, formatOptions).format(date)
}

function formatRelativeTime(date, options = {}) {
  const {
    locale = 'zh-CN',
    style = 'long',
    numeric = 'auto',
    baseDate = new Date(),
  } = options

  const rtf = new Intl.RelativeTimeFormat(locale, { style, numeric })

  const diff = date.getTime() - baseDate.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (Math.abs(years) > 0) return rtf.format(years, 'year')
  if (Math.abs(months) > 0) return rtf.format(months, 'month')
  if (Math.abs(days) > 0) return rtf.format(days, 'day')
  if (Math.abs(hours) > 0) return rtf.format(hours, 'hour')
  if (Math.abs(minutes) > 0) return rtf.format(minutes, 'minute')
  return rtf.format(seconds, 'second')
}

function getDstBoundaryExamples() {
  return [
    new Date(2024, 2, 31, 2, 0, 0),
    new Date(2024, 9, 27, 2, 0, 0),
    new Date(2025, 2, 30, 2, 0, 0),
    new Date(2025, 9, 26, 2, 0, 0),
  ]
}

export {
  parseDatetime,
  formatDatetime,
  formatRelativeTime,
  getDstBoundaryExamples,
}
