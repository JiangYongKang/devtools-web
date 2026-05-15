const TIMEZONE_MODE = {
  IANA: 'iana',
  FIXED_OFFSET: 'fixed_offset',
}

const WEEKDAYS = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
}

const DST_STATUS = {
  NORMAL: 'normal',
  SPRING_FORWARD_GAP: 'spring_forward_gap',
  FALL_BACK_REPEAT: 'fall_back_repeat',
}

const VALIDATION_ERROR_TYPE = {
  INVALID_DATE: 'invalid_date',
  BEFORE_MIN: 'before_min',
  AFTER_MAX: 'after_max',
  DISABLED_WEEKDAY: 'disabled_weekday',
  PRE_GREGORIAN: 'pre_gregorian',
  DST_GAP: 'dst_gap',
  LOCAL_WALL_CLOCK_NO_OFFSET: 'local_wall_clock_no_offset',
}

const INPUT_TYPE = {
  DATE: 'date',
  DATETIME_LOCAL: 'datetime-local',
  TIME: 'time',
  TEXT_FALLBACK: 'text',
}

const GREGORIAN_START_YEAR = 1582
const GREGORIAN_START_MONTH = 10
const GREGORIAN_START_DAY = 15

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const DAYS_IN_MONTH_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'America/Denver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
]

const EXAMPLE_KEYS = {
  SPRING_FORWARD: 'spring_forward',
  FALL_BACK: 'fall_back',
  UTC_YEAR_END: 'utc_year_end',
  SOUTHERN_DST: 'southern_dst',
}

export {
  TIMEZONE_MODE,
  WEEKDAYS,
  DST_STATUS,
  VALIDATION_ERROR_TYPE,
  INPUT_TYPE,
  GREGORIAN_START_YEAR,
  GREGORIAN_START_MONTH,
  GREGORIAN_START_DAY,
  DAYS_IN_MONTH,
  DAYS_IN_MONTH_LEAP,
  COMMON_TIMEZONES,
  EXAMPLE_KEYS,
}
