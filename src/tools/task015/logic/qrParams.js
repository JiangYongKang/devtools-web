import { ERROR_CODES, createQRError } from './qrErrors.js'

const VALID_ERROR_LEVELS = ['L', 'M', 'Q', 'H']
const VALID_FORMATS = ['png', 'svg', 'jpeg']
const DPI_PER_INCH = 96
const MM_PER_INCH = 25.4
const MAX_PIXEL_SIZE = 4096
const MAX_SAFE_OUTPUT_BYTES = 10 * 1024 * 1024

const DEFAULT_PARAMS = {
  errorLevel: 'M',
  margin: 4,
  moduleSize: 5,
  outputFormat: 'png',
}

function normalizeInput(rawContent) {
  if (rawContent === null || rawContent === undefined) {
    return null
  }
  const str = String(rawContent)
  return str
}

function isNumberInRange(value, min, max, allowFloat = true) {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return false
  }
  if (!allowFloat && !Number.isInteger(value)) {
    return false
  }
  return value >= min && value <= max
}

function validateErrorLevel(level) {
  if (level === undefined || level === null) return DEFAULT_PARAMS.errorLevel
  const normalized = String(level).toUpperCase()
  if (!VALID_ERROR_LEVELS.includes(normalized)) {
    throw createQRError(ERROR_CODES.INVALID_PARAMETER, `errorLevel 必须是 ${VALID_ERROR_LEVELS.join(', ')} 之一`)
  }
  return normalized
}

function validateMargin(margin) {
  if (margin === undefined || margin === null) return DEFAULT_PARAMS.margin
  const parsed = typeof margin === 'string' ? parseInt(margin, 10) : margin
  if (!isNumberInRange(parsed, 0, 20, false)) {
    throw createQRError(ERROR_CODES.INVALID_MARGIN)
  }
  return parsed
}

function validateModuleSize(moduleSize) {
  if (moduleSize === undefined || moduleSize === null) return null
  const parsed = typeof moduleSize === 'string' ? parseInt(moduleSize, 10) : moduleSize
  if (!isNumberInRange(parsed, 1, 50, false)) {
    throw createQRError(ERROR_CODES.INVALID_MODULE_SIZE)
  }
  return parsed
}

function validateNominalSizeMm(size) {
  if (size === undefined || size === null) return null
  const parsed = typeof size === 'string' ? parseFloat(size) : size
  if (!isNumberInRange(parsed, 10, 500, true)) {
    throw createQRError(ERROR_CODES.INVALID_NOMINAL_SIZE)
  }
  return parsed
}

function validateOutputFormat(format) {
  if (format === undefined || format === null) return DEFAULT_PARAMS.outputFormat
  const normalized = String(format).toLowerCase()
  if (!VALID_FORMATS.includes(normalized)) {
    throw createQRError(ERROR_CODES.INVALID_FORMAT)
  }
  return normalized
}

function assembleParams(rawParams) {
  const {
    content,
    errorLevel,
    margin,
    moduleSize,
    nominalSizeMm,
    outputFormat,
  } = rawParams || {}

  const normalizedContent = normalizeInput(content)
  if (normalizedContent === null || normalizedContent === '') {
    throw createQRError(ERROR_CODES.NULL_INPUT)
  }

  if (normalizedContent.length === 0) {
    throw createQRError(ERROR_CODES.CONTENT_TOO_SHORT)
  }

  const parsedModuleSize = validateModuleSize(moduleSize)
  const parsedNominalSizeMm = validateNominalSizeMm(nominalSizeMm)

  if (parsedModuleSize !== null && parsedNominalSizeMm !== null) {
    throw createQRError(ERROR_CODES.OPTION_CONFLICT)
  }

  return {
    content: normalizedContent,
    errorLevel: validateErrorLevel(errorLevel),
    margin: validateMargin(margin),
    moduleSize: parsedModuleSize,
    nominalSizeMm: parsedNominalSizeMm,
    outputFormat: validateOutputFormat(outputFormat),
  }
}

function computeModuleSizeFromNominalSize(nominalSizeMm, version) {
  const modulesPerSide = (version - 1) * 4 + 21
  const totalPixels = (nominalSizeMm / MM_PER_INCH) * DPI_PER_INCH
  const moduleSize = Math.max(1, Math.floor(totalPixels / modulesPerSide))
  return Math.min(moduleSize, 50)
}

function getMimeType(format) {
  const map = {
    png: 'image/png',
    svg: 'image/svg+xml',
    jpeg: 'image/jpeg',
  }
  return map[format] || 'image/png'
}

function estimateMaxContentLength(version, errorLevel) {
  const capacityMap = {
    L: [17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858, 929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953],
    M: [14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331],
    Q: [11, 20, 32, 46, 60, 74, 86, 108, 130, 151, 177, 203, 241, 258, 292, 322, 364, 394, 442, 482, 509, 565, 611, 661, 715, 751, 805, 868, 908, 982, 1030, 1112, 1168, 1228, 1283, 1351, 1423, 1499, 1579, 1663],
    H: [7, 14, 24, 34, 44, 58, 64, 84, 98, 119, 137, 155, 177, 194, 220, 250, 280, 310, 338, 382, 403, 439, 461, 511, 535, 593, 625, 658, 698, 742, 790, 842, 898, 958, 983, 1051, 1093, 1139, 1219, 1273],
  }
  const capacities = capacityMap[errorLevel] || capacityMap['M']
  return capacities[Math.min(version - 1, capacities.length - 1)]
}

export {
  assembleParams,
  validateErrorLevel,
  validateMargin,
  validateModuleSize,
  validateNominalSizeMm,
  validateOutputFormat,
  normalizeInput,
  computeModuleSizeFromNominalSize,
  getMimeType,
  estimateMaxContentLength,
  VALID_ERROR_LEVELS,
  VALID_FORMATS,
  DEFAULT_PARAMS,
  MAX_PIXEL_SIZE,
  MAX_SAFE_OUTPUT_BYTES,
  DPI_PER_INCH,
  MM_PER_INCH,
}
