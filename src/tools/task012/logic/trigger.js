function getFieldMatches(fieldInfo, value) {
  if (fieldInfo.raw === '*' || fieldInfo.raw === '?') {
    return true
  }

  if (fieldInfo.values && fieldInfo.values.includes(value)) {
    return true
  }

  return false
}

function calculateNextTriggers(parsed, timezoneId, count = 5) {
  const triggers = []
  let currentDate = new Date()

  const maxIterations = 10000
  let iterations = 0

  while (triggers.length < count && iterations < maxIterations) {
    iterations++

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    const day = currentDate.getDate()
    const hour = currentDate.getHours()
    const minute = currentDate.getMinutes()
    const second = currentDate.getSeconds()

    if (!getFieldMatches(parsed.month, month)) {
      currentDate = new Date(year, month, 1, 0, 0, 0)
      continue
    }

    if (!getFieldMatches(parsed.dayOfMonth, day) && parsed.dayOfMonth.raw !== '?' && parsed.dayOfMonth.raw !== 'L') {
      currentDate = new Date(year, month - 1, day + 1, 0, 0, 0)
      continue
    }

    if (!getFieldMatches(parsed.dayOfWeek, currentDate.getDay()) && parsed.dayOfWeek.raw !== '?' && parsed.dayOfWeek.raw !== 'L') {
      currentDate = new Date(year, month - 1, day + 1, 0, 0, 0)
      continue
    }

    if (!getFieldMatches(parsed.hours, hour)) {
      currentDate = new Date(year, month - 1, day, hour + 1, 0, 0)
      continue
    }

    if (!getFieldMatches(parsed.minutes, minute)) {
      currentDate = new Date(year, month - 1, day, hour, minute + 1, 0)
      continue
    }

    if (parsed.hasSeconds && !getFieldMatches(parsed.seconds, second)) {
      currentDate = new Date(year, month - 1, day, hour, minute, second + 1)
      continue
    }

    triggers.push(new Date(currentDate))

    if (parsed.hasSeconds) {
      currentDate = new Date(year, month - 1, day, hour, minute, second + 1)
    } else {
      currentDate = new Date(year, month - 1, day, hour, minute + 1, 0)
    }
  }

  return triggers
}

function formatTriggerTime(date, timezoneId, language) {
  try {
    return date.toLocaleString(
      language === 'en' ? 'en-US' : 'zh-CN',
      {
        timeZone: timezoneId,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      },
    )
  } catch {
    return date.toLocaleString()
  }
}

export {
  calculateNextTriggers,
  formatTriggerTime,
  getFieldMatches,
}
