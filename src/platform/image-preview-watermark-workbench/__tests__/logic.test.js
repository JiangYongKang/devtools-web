import { describe, expect, test, vi, beforeEach } from 'vitest'
import {
  ERROR_CODES,
  ANCHOR_POSITIONS,
  WATERMARK_TYPES,
  TILE_MODES,
  DEFAULT_TEXT_WATERMARK,

  getErrorMessage,
  getRecoveryHint,
  createError,
  createSuccess,
  createFailure,
  isValidErrorCode,

  hasDangerousPatterns,
  escapeHtml,
  sanitizeText,
  sanitizeColor,
  sanitizeFontFamily,

  normalizeRotation,
  estimateTextDimensions,
  generateTilePositions,
  validateWatermarkConfig,
  calculatePlanMemory,
  buildWatermarkPlan,

  calculateMemoryUsage,
  isImageTooLarge,
  getDownscaleFactor,
} from '../logic/index.js'

describe('constants module', () => {
  test('ERROR_CODES should contain all expected error codes', () => {
    expect(ERROR_CODES.IMAGE_LOAD_ERROR).toBe('IMAGE_LOAD_ERROR')
    expect(ERROR_CODES.INVALID_IMAGE_FORMAT).toBe('INVALID_IMAGE_FORMAT')
    expect(ERROR_CODES.IMAGE_TOO_LARGE).toBe('IMAGE_TOO_LARGE')
    expect(ERROR_CODES.CANVAS_NOT_SUPPORTED).toBe('CANVAS_NOT_SUPPORTED')
    expect(ERROR_CODES.RENDER_ERROR).toBe('RENDER_ERROR')
    expect(ERROR_CODES.TEXT_WATERMARK_EMPTY).toBe('TEXT_WATERMARK_EMPTY')
    expect(ERROR_CODES.WATERMARK_OUT_OF_BOUNDS).toBe('WATERMARK_OUT_OF_BOUNDS')
    expect(ERROR_CODES.INVALID_COLOR_FORMAT).toBe('INVALID_COLOR_FORMAT')
    expect(ERROR_CODES.INVALID_ROTATION_ANGLE).toBe('INVALID_ROTATION_ANGLE')
    expect(ERROR_CODES.ABORTED).toBe('ABORTED')
    expect(ERROR_CODES.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR')
    expect(ERROR_CODES.XSS_DETECTED).toBe('XSS_DETECTED')
  })

  test('ANCHOR_POSITIONS should contain all 9 positions', () => {
    expect(Object.keys(ANCHOR_POSITIONS).length).toBe(9)
  })

  test('DEFAULT_TEXT_WATERMARK should have sensible defaults', () => {
    expect(DEFAULT_TEXT_WATERMARK.content).toBe('WATERMARK')
    expect(DEFAULT_TEXT_WATERMARK.fontSize).toBe(32)
    expect(DEFAULT_TEXT_WATERMARK.opacity).toBe(0.3)
  })
})

describe('errors module', () => {
  test('getErrorMessage should return correct message for known codes', () => {
    expect(getErrorMessage(ERROR_CODES.IMAGE_LOAD_ERROR)).toBe('图片加载失败')
  })

  test('getErrorMessage should return default for unknown codes', () => {
    expect(getErrorMessage('UNKNOWN_CODE')).toBe('未知错误')
  })

  test('createError should create error object with correct structure', () => {
    const result = createError(ERROR_CODES.IMAGE_LOAD_ERROR)
    expect(result.errorCode).toBe(ERROR_CODES.IMAGE_LOAD_ERROR)
    expect(result.errorMessage).toBeDefined()
    expect(result.timestamp).toBeDefined()
  })

  test('createError should accept custom message', () => {
    const customMsg = 'Custom error message'
    const result = createError(ERROR_CODES.IMAGE_LOAD_ERROR, customMsg)
    expect(result.errorMessage).toBe(customMsg)
  })

  test('createSuccess should return success object', () => {
    const data = { foo: 'bar' }
    const result = createSuccess(data)
    expect(result.success).toBe(true)
    expect(result.foo).toBe('bar')
  })

  test('createFailure should return failure object with error', () => {
    const result = createFailure(ERROR_CODES.RENDER_ERROR)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error.errorCode).toBe(ERROR_CODES.RENDER_ERROR)
  })

  test('isValidErrorCode should validate correctly', () => {
    expect(isValidErrorCode(ERROR_CODES.IMAGE_LOAD_ERROR)).toBe(true)
    expect(isValidErrorCode('INVALID_CODE')).toBe(false)
  })
})

describe('sanitizer module', () => {
  test('hasDangerousPatterns should detect script tags', () => {
    expect(hasDangerousPatterns('<script>alert(1)</script>')).toBe(true)
  })

  test('hasDangerousPatterns should detect javascript protocol', () => {
    expect(hasDangerousPatterns('javascript:alert(1)')).toBe(true)
  })

  test('hasDangerousPatterns should detect on event handlers', () => {
    expect(hasDangerousPatterns('<img onload="alert(1)">')).toBe(true)
  })

  test('hasDangerousPatterns should return false for safe text', () => {
    expect(hasDangerousPatterns('Hello World')).toBe(false)
    expect(hasDangerousPatterns('')).toBe(false)
    expect(hasDangerousPatterns(null)).toBe(false)
  })

  test('escapeHtml should escape special characters', () => {
    const input = '<script>alert("hi")</script>'
    const result = escapeHtml(input)
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
    expect(result).toContain('&lt;')
    expect(result).toContain('&gt;')
  })

  test('sanitizeText should return success for safe text', () => {
    const result = sanitizeText('Hello World')
    expect(result.success).toBe(true)
    expect(result.sanitized).toBe('Hello World')
  })

  test('sanitizeText should return failure for dangerous patterns', () => {
    const result = sanitizeText('<script>alert(1)</script>')
    expect(result.success).toBe(false)
    expect(result.error.errorCode).toBe(ERROR_CODES.XSS_DETECTED)
  })

  test('sanitizeColor should accept hex colors', () => {
    expect(sanitizeColor('#ff0000').success).toBe(true)
    expect(sanitizeColor('#f00').success).toBe(true)
  })

  test('sanitizeColor should accept rgb/rgba colors', () => {
    expect(sanitizeColor('rgb(255, 0, 0)').success).toBe(true)
    expect(sanitizeColor('rgba(255, 0, 0, 0.5)').success).toBe(true)
  })

  test('sanitizeColor should reject invalid formats', () => {
    expect(sanitizeColor('not-a-color').success).toBe(false)
  })

  test('sanitizeFontFamily should accept valid fonts', () => {
    const result = sanitizeFontFamily('Arial, sans-serif')
    expect(result.success).toBe(true)
    expect(result.sanitized).toBe('Arial, sans-serif')
  })
})

describe('watermarkPlan module', () => {
  test('normalizeRotation should normalize angles to 0-360', () => {
    expect(normalizeRotation(0)).toBe(0)
    expect(normalizeRotation(360)).toBe(0)
    expect(normalizeRotation(450)).toBe(90)
    expect(normalizeRotation(-90)).toBe(270)
  })

  test('estimateTextDimensions should calculate dimensions', () => {
    const result = estimateTextDimensions('Hello', 16, 'Arial')
    expect(result.width).toBeGreaterThan(0)
    expect(result.height).toBeGreaterThan(0)
  })

  test('estimateTextDimensions should handle newlines', () => {
    const singleLine = estimateTextDimensions('Hello', 16, 'Arial')
    const multiLine = estimateTextDimensions('Hello\nWorld', 16, 'Arial')
    expect(multiLine.height).toBe(singleLine.height * 2)
  })

  test('generateTilePositions should generate multiple positions', () => {
    const positions = generateTilePositions(500, 500, 50, 50, 10, 10)
    expect(positions.length).toBeGreaterThan(1)
    expect(positions[0].x).toBeDefined()
    expect(positions[0].y).toBeDefined()
  })

  test('generateTilePositions should apply row offset for even rows', () => {
    const positions = generateTilePositions(500, 500, 50, 50, 10, 10)
    const firstRow = positions.filter((p) => p.y === positions[0].y)
    const secondRow = positions.filter((p) => p.y !== positions[0].y).slice(0, firstRow.length)
    if (firstRow.length > 0 && secondRow.length > 0) {
      expect(firstRow[0].x).not.toBe(secondRow[0].x)
    }
  })

  test('validateWatermarkConfig should detect empty text', () => {
    const warnings = validateWatermarkConfig({
      type: WATERMARK_TYPES.TEXT,
      content: '',
    })
    const error = warnings.find((w) => w.code === ERROR_CODES.TEXT_WATERMARK_EMPTY)
    expect(error).toBeDefined()
  })

  test('validateWatermarkConfig should detect small font size', () => {
    const warnings = validateWatermarkConfig({
      type: WATERMARK_TYPES.TEXT,
      content: 'Test',
      fontSize: 2,
    })
    const warning = warnings.find((w) => w.code === 'FONT_SIZE_TOO_SMALL')
    expect(warning).toBeDefined()
  })

  test('validateWatermarkConfig should detect invalid opacity', () => {
    const warnings = validateWatermarkConfig({
      type: WATERMARK_TYPES.TEXT,
      content: 'Test',
      opacity: 2,
    })
    const warning = warnings.find((w) => w.code === 'INVALID_OPACITY')
    expect(warning).toBeDefined()
  })

  test('calculatePlanMemory should calculate memory correctly', () => {
    const imageMeta = { width: 100, height: 100 }
    const layers = []
    const result = calculatePlanMemory(imageMeta, layers)
    expect(result.base).toBe(100 * 100 * 4)
    expect(result.total).toBe(result.base + result.layers)
  })

  test('buildWatermarkPlan should return failure for invalid image meta', () => {
    const result = buildWatermarkPlan({}, null)
    expect(result.success).toBe(false)
    expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_IMAGE_FORMAT)
  })

  test('buildWatermarkPlan should build plan with text watermark', () => {
    const imageMeta = { width: 500, height: 500 }
    const config = {
      type: WATERMARK_TYPES.TEXT,
      content: 'Test Watermark',
    }

    const result = buildWatermarkPlan(config, imageMeta)
    expect(result.success).toBe(true)
    expect(result.layers.length).toBeGreaterThan(0)
    expect(result.summary.textLayers).toBeGreaterThan(0)
  })

  test('buildWatermarkPlan should handle tiled watermarks', () => {
    const imageMeta = { width: 500, height: 500 }
    const config = {
      type: WATERMARK_TYPES.TEXT,
      content: 'Tiled',
      tileMode: TILE_MODES.GRID,
      tileSpacingX: 20,
      tileSpacingY: 20,
    }

    const result = buildWatermarkPlan(config, imageMeta)
    expect(result.success).toBe(true)
    expect(result.summary.totalPositions).toBeGreaterThan(1)
  })

  test('buildWatermarkPlan should detect out of bounds watermarks', () => {
    const imageMeta = { width: 100, height: 100 }
    const config = {
      type: WATERMARK_TYPES.TEXT,
      content: 'Test',
      fontSize: 200,
      marginX: 100,
      marginY: 100,
    }

    const result = buildWatermarkPlan(config, imageMeta)
    expect(result.success).toBe(true)
    expect(result.summary.hasOutOfBounds).toBe(true)
  })
})

describe('imageLoader module', () => {
  test('calculateMemoryUsage should calculate bytes correctly', () => {
    const result = calculateMemoryUsage(100, 100)
    expect(result.bytes).toBe(100 * 100 * 4)
    expect(result.kilobytes).toBe((100 * 100 * 4) / 1024)
  })

  test('isImageTooLarge should detect oversized dimensions', () => {
    expect(isImageTooLarge(8000, 1000)).toBe(true)
    expect(isImageTooLarge(1000, 1000)).toBe(false)
  })

  test('getDownscaleFactor should return scale <= 1', () => {
    expect(getDownscaleFactor(10000, 1000)).toBeLessThanOrEqual(1)
    expect(getDownscaleFactor(100, 100)).toBe(1)
  })
})
