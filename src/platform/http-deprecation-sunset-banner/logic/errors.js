export class HeaderParseError extends Error {
  constructor(message, headerName, rawValue) {
    super(message)
    this.name = 'HeaderParseError'
    this.headerName = headerName
    this.rawValue = rawValue
  }
}

export class InvalidDateError extends HeaderParseError {
  constructor(rawValue, headerName) {
    super(`无效的日期格式: ${rawValue}`, headerName, rawValue)
    this.name = 'InvalidDateError'
  }
}

export class InvalidLinkHeaderError extends HeaderParseError {
  constructor(rawValue) {
    super(`无效的 Link 头格式: ${rawValue}`, 'link', rawValue)
    this.name = 'InvalidLinkHeaderError'
  }
}

export class InvalidWarningHeaderError extends HeaderParseError {
  constructor(rawValue) {
    super(`无效的 Warning 头格式: ${rawValue}`, 'warning', rawValue)
    this.name = 'InvalidWarningHeaderError'
  }
}
