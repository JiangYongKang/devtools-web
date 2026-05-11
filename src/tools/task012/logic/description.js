import {
  FIELD_DEFINITIONS,
  MONTH_NAMES_ZH,
  MONTH_NAMES_EN,
  WEEKDAY_NAMES_ZH,
  WEEKDAY_NAMES_EN,
} from './constants'

function joinValues(values, language, fieldDef) {
  const isEn = language === 'en'

  if (fieldDef.position === 4) {
    const names = isEn ? MONTH_NAMES_EN : MONTH_NAMES_ZH
    return values.map((v) => names[v]).join(isEn ? ', ' : '、')
  }

  if (fieldDef.position === 5) {
    const names = isEn ? WEEKDAY_NAMES_EN : WEEKDAY_NAMES_ZH
    return values.map((v) => names[v]).join(isEn ? ', ' : '、')
  }

  return values.join(isEn ? ', ' : '、')
}

function describeSingleField(fieldInfo, fieldDef, language) {
  const isEn = language === 'en'
  const raw = fieldInfo.raw
  const values = fieldInfo.values
  const fieldName = isEn ? fieldDef.nameEn : fieldDef.nameZh

  if (values && values.length === fieldDef.max - fieldDef.min + 1) {
    return isEn
      ? `Every ${fieldName.toLowerCase()}`
      : `每${fieldName}`
  }

  if (raw === '?') {
    return isEn
      ? `No specific ${fieldName.toLowerCase()}`
      : `不指定${fieldName}`
  }

  if (fieldInfo.special === 'LAST_DAY') {
    return isEn
      ? 'Last day of month'
      : '每月最后一天'
  }

  if (fieldInfo.special === 'LAST_WEEKDAY') {
    return isEn
      ? 'Last weekday of month'
      : '每月最后一个工作日'
  }

  if (values && values.length === 1) {
    const displayValue = fieldDef.position === 4
      ? (isEn ? MONTH_NAMES_EN[values[0]] : MONTH_NAMES_ZH[values[0]])
      : fieldDef.position === 5
        ? (isEn ? WEEKDAY_NAMES_EN[values[0]] : WEEKDAY_NAMES_ZH[values[0]])
        : values[0]
    return isEn
      ? `${fieldName} ${displayValue}`
      : `${fieldName} ${displayValue}`
  }

  if (values && values.length > 1) {
    const displayValues = joinValues(values, language, fieldDef)
    return isEn
      ? `${fieldName} ${displayValues}`
      : `${fieldName} ${displayValues}`
  }

  return isEn
    ? `Invalid ${fieldName.toLowerCase()}`
    : `无效的${fieldName}`
}

function buildFieldDescriptions(parsed, language) {
  const descriptions = {}

  if (parsed.hasSeconds) {
    descriptions.secondsDescription = describeSingleField(
      parsed.seconds,
      FIELD_DEFINITIONS.seconds,
      language,
    )
  }

  descriptions.minutesDescription = describeSingleField(
    parsed.minutes,
    FIELD_DEFINITIONS.minutes,
    language,
  )

  descriptions.hoursDescription = describeSingleField(
    parsed.hours,
    FIELD_DEFINITIONS.hours,
    language,
  )

  descriptions.dayOfMonthDescription = describeSingleField(
    parsed.dayOfMonth,
    FIELD_DEFINITIONS.dayOfMonth,
    language,
  )

  descriptions.monthDescription = describeSingleField(
    parsed.month,
    FIELD_DEFINITIONS.month,
    language,
  )

  descriptions.dayOfWeekDescription = describeSingleField(
    parsed.dayOfWeek,
    FIELD_DEFINITIONS.dayOfWeek,
    language,
  )

  return descriptions
}

function buildFullDescription(parsed, language) {
  const isEn = language === 'en'
  const descriptions = buildFieldDescriptions(parsed, language)

  const parts = []

  if (parsed.hasSeconds && parsed.seconds.values) {
    parts.push(descriptions.secondsDescription)
  }

  if (parsed.minutes.values) {
    parts.push(descriptions.minutesDescription)
  }

  if (parsed.hours.values) {
    parts.push(descriptions.hoursDescription)
  }

  if (parsed.dayOfMonth.values || parsed.dayOfMonth.raw === '?') {
    parts.push(descriptions.dayOfMonthDescription)
  }

  if (parsed.month.values) {
    parts.push(descriptions.monthDescription)
  }

  if (parsed.dayOfWeek.values || parsed.dayOfWeek.raw === '?') {
    parts.push(descriptions.dayOfWeekDescription)
  }

  const filteredParts = parts.filter((p) => {
    if (isEn) {
      return !p.startsWith('No specific')
    }
    return !p.startsWith('不指定')
  })

  return isEn
    ? filteredParts.join(', ')
    : filteredParts.join('，')
}

export {
  describeSingleField,
  buildFieldDescriptions,
  buildFullDescription,
}
