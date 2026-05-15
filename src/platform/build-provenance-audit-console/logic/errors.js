export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class ParseError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ParseError'
  }
}

export class SemVerError extends Error {
  constructor(message) {
    super(message)
    this.name = 'SemVerError'
  }
}

export const errorMessages = {
  INVALID_SEMVER: '无效的语义化版本号格式',
  INVALID_AUDIT_JSON: '无效的 audit JSON 格式',
  INVALID_LICENSES_JSON: '无效的 licenses JSON 格式',
  INVALID_SBOM_XML: '无效的 SBOM XML 格式',
  MISSING_REQUIRED_FIELD: '缺少必需字段'
}
