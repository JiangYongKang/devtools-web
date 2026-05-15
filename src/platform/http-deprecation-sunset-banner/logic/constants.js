export const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  BLOCKING: 'blocking',
}

export const HEADER_NAMES = {
  DEPRECATION: 'deprecation',
  SUNSET: 'sunset',
  SUNSET_DATE: 'sunset-date',
  LINK: 'link',
  WARNING: 'warning',
}

export const LINK_REL = {
  SUNSET: 'sunset',
  DEPRECATION: 'deprecation',
}

export const SNOOZE_TYPE = {
  SESSION: 'session',
  MINUTES: 'minutes',
}

export const DEFAULT_SNOOZE_MINUTES = 15

export const STORAGE_KEYS = {
  SNOOZED_NOTICES: 'http_deprecation_snoozed',
}

export const WARNING_CODE = {
  DEPRECATION: 299,
  SUNSET: 298,
}

export const SEVERITY_ORDER = [SEVERITY.BLOCKING, SEVERITY.WARNING, SEVERITY.INFO]
