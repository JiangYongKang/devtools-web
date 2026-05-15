import {
  ERROR_CODES,
  ANCHOR_POSITIONS,
  WATERMARK_TYPES,
  TILE_MODES,
  DEFAULT_TEXT_WATERMARK,
  DEFAULT_IMAGE_WATERMARK,
  MEMORY_PER_PIXEL,
} from './constants.js'
import { createSuccess, createFailure } from './errors.js'
import { sanitizeText, sanitizeColor, sanitizeFontFamily } from './sanitizer.js'

function calculateAnchorPosition(anchor, canvasWidth, canvasHeight, watermarkWidth, watermarkHeight) {
  let x = 0
  let y = 0

  switch (anchor) {
    case ANCHOR_POSITIONS.TOP_LEFT:
      x = 0
      y = 0
      break
    case ANCHOR_POSITIONS.TOP_CENTER:
      x = (canvasWidth - watermarkWidth) / 2
      y = 0
      break
    case ANCHOR_POSITIONS.TOP_RIGHT:
      x = canvasWidth - watermarkWidth
      y = 0
      break
    case ANCHOR_POSITIONS.CENTER_LEFT:
      x = 0
      y = (canvasHeight - watermarkHeight) / 2
      break
    case ANCHOR_POSITIONS.CENTER:
      x = (canvasWidth - watermarkWidth) / 2
      y = (canvasHeight - watermarkHeight) / 2
      break
    case ANCHOR_POSITIONS.CENTER_RIGHT:
      x = canvasWidth - watermarkWidth
      y = (canvasHeight - watermarkHeight) / 2
      break
    case ANCHOR_POSITIONS.BOTTOM_LEFT:
      x = 0
      y = canvasHeight - watermarkHeight
      break
    case ANCHOR_POSITIONS.BOTTOM_CENTER:
      x = (canvasWidth - watermarkWidth) / 2
      y = canvasHeight - watermarkHeight
      break
    case ANCHOR_POSITIONS.BOTTOM_RIGHT:
      x = canvasWidth - watermarkWidth
      y = canvasHeight - watermarkHeight
      break
    default:
      x = (canvasWidth - watermarkWidth) / 2
      y = (canvasHeight - watermarkHeight) / 2
  }

  return { x, y }
}

function normalizeRotation(rotation) {
  let normalized = rotation % 360
  if (normalized < 0) {
    normalized += 360
  }
  return normalized
}

function estimateTextDimensions(text, fontSize, fontFamily) {
  const avgCharWidth = fontSize * 0.6
  const lineHeight = fontSize * 1.2
  const lines = text.split('\n')
  const maxChars = Math.max(...lines.map((l) => l.length), 1)

  return {
    width: maxChars * avgCharWidth,
    height: lines.length * lineHeight,
    lineHeight,
  }
}

function generateTilePositions(
  canvasWidth,
  canvasHeight,
  watermarkWidth,
  watermarkHeight,
  spacingX,
  spacingY,
  offsetY = 0
) {
  const positions = []
  const stepX = watermarkWidth + spacingX
  const stepY = watermarkHeight + spacingY

  const diagonalOffset = offsetY > 0 ? canvasWidth * Math.tan((offsetY * Math.PI) / 180) : 0

  const startX = -watermarkWidth
  const startY = -watermarkHeight - diagonalOffset

  const endX = canvasWidth + watermarkWidth
  const endY = canvasHeight + watermarkHeight + diagonalOffset

  let rowIndex = 0
  for (let y = startY; y < endY; y += stepY) {
    const rowOffset = (rowIndex % 2) * (stepX / 2)
    for (let x = startX + rowOffset; x < endX; x += stepX) {
      const diagonalY = y + (x / canvasWidth) * diagonalOffset
      positions.push({ x, y: diagonalY })
    }
    rowIndex++
  }

  return positions
}

function validateWatermarkConfig(config) {
  const warnings = []

  if (config.type === WATERMARK_TYPES.TEXT) {
    if (!config.content || config.content.trim() === '') {
      warnings.push({
        code: ERROR_CODES.TEXT_WATERMARK_EMPTY,
        message: '水印文本为空',
        level: 'error',
      })
    }

    if (config.fontSize < 4) {
      warnings.push({
        code: 'FONT_SIZE_TOO_SMALL',
        message: '字体可能过小导致不可见',
        level: 'warning',
      })
    }

    if (config.fontSize > 500) {
      warnings.push({
        code: 'FONT_SIZE_TOO_LARGE',
        message: '字体过大可能超出画布',
        level: 'warning',
      })
    }
  }

  if (config.opacity < 0 || config.opacity > 1) {
    warnings.push({
      code: 'INVALID_OPACITY',
      message: '透明度应在 0-1 之间',
      level: 'warning',
    })
  }

  return warnings
}

function calculatePlanMemory(imageMeta, layers) {
  const baseMemory = imageMeta.width * imageMeta.height * MEMORY_PER_PIXEL
  const layerMemory = layers.reduce((total, layer) => {
    if (layer.type === WATERMARK_TYPES.IMAGE && layer.image) {
      return total + layer.image.width * layer.image.height * MEMORY_PER_PIXEL
    }
    return total
  }, 0)

  return {
    base: baseMemory,
    layers: layerMemory,
    total: baseMemory + layerMemory,
  }
}

function buildTextWatermarkLayer(config, imageMeta) {
  const {
    content,
    fontFamily,
    fontSize,
    color,
    rotation,
    opacity,
    antialias,
    tileMode,
    tileSpacingX,
    tileSpacingY,
    tileOffsetY,
    anchor,
    marginX,
    marginY,
  } = { ...DEFAULT_TEXT_WATERMARK, ...config }

  const textResult = sanitizeText(content)
  const fontResult = sanitizeFontFamily(fontFamily)
  const colorResult = sanitizeColor(color)

  const sanitizedContent = textResult.success ? textResult.sanitized : ''
  const sanitizedFont = fontResult.success ? fontResult.sanitized : DEFAULT_TEXT_WATERMARK.fontFamily
  const sanitizedColor = colorResult.success ? colorResult.sanitized : DEFAULT_TEXT_WATERMARK.color

  const normalizedRotation = normalizeRotation(rotation)
  const clampedOpacity = Math.max(0, Math.min(1, opacity))

  const dimensions = estimateTextDimensions(sanitizedContent, fontSize, sanitizedFont)

  const basePosition = calculateAnchorPosition(
    anchor,
    imageMeta.width,
    imageMeta.height,
    dimensions.width,
    dimensions.height
  )

  const position = {
    x: basePosition.x + marginX,
    y: basePosition.y + marginY,
  }

  const positions = []
  if (tileMode === TILE_MODES.NONE) {
    positions.push(position)
  } else {
    const tilePositions = generateTilePositions(
      imageMeta.width,
      imageMeta.height,
      dimensions.width,
      dimensions.height,
      tileSpacingX,
      tileSpacingY,
      tileOffsetY
    )
    positions.push(...tilePositions)
  }

  return {
    type: WATERMARK_TYPES.TEXT,
    content: sanitizedContent,
    originalContent: content,
    fontFamily: sanitizedFont,
    fontSize,
    color: sanitizedColor,
    rotation: normalizedRotation,
    opacity: clampedOpacity,
    antialias: Boolean(antialias),
    tileMode,
    dimensions,
    positions,
    anchor,
    marginX,
    marginY,
    wasSanitized: textResult.wasEscaped || fontResult.wasSanitized || colorResult.original !== colorResult.sanitized,
  }
}

function buildImageWatermarkLayer(config, imageMeta) {
  const {
    image,
    anchor,
    marginX,
    marginY,
    maxWidth,
    maxHeight,
    scale,
    opacity,
  } = { ...DEFAULT_IMAGE_WATERMARK, ...config }

  const clampedOpacity = Math.max(0, Math.min(1, opacity))
  const clampedScale = Math.max(0.01, Math.min(10, scale))

  let finalWidth = image?.width || 100
  let finalHeight = image?.height || 100

  if (image) {
    const aspectRatio = image.width / image.height

    if (maxWidth && finalWidth > maxWidth) {
      finalWidth = maxWidth
      finalHeight = finalWidth / aspectRatio
    }
    if (maxHeight && finalHeight > maxHeight) {
      finalHeight = maxHeight
      finalWidth = finalHeight * aspectRatio
    }

    finalWidth *= clampedScale
    finalHeight *= clampedScale
  }

  const position = calculateAnchorPosition(
    anchor,
    imageMeta.width,
    imageMeta.height,
    finalWidth,
    finalHeight
  )

  return {
    type: WATERMARK_TYPES.IMAGE,
    image,
    width: finalWidth,
    height: finalHeight,
    originalWidth: image?.width,
    originalHeight: image?.height,
    x: position.x + marginX,
    y: position.y + marginY,
    opacity: clampedOpacity,
    scale: clampedScale,
    anchor,
    marginX,
    marginY,
    positions: [{ x: position.x + marginX, y: position.y + marginY }],
  }
}

function buildWatermarkPlan(config, imageMeta) {
  if (!imageMeta || !imageMeta.width || !imageMeta.height) {
    return createFailure(ERROR_CODES.INVALID_IMAGE_FORMAT, '无效的图片元数据')
  }

  const warnings = []
  const layers = []
  const sanitizedConfig = { ...config }

  const textWatermarks = config.textWatermarks || (config.type === WATERMARK_TYPES.TEXT ? [config] : [])
  const imageWatermarks = config.imageWatermarks || (config.type === WATERMARK_TYPES.IMAGE ? [config] : [])

  for (const textConfig of textWatermarks) {
    const layer = buildTextWatermarkLayer(textConfig, imageMeta)
    layers.push(layer)

    const layerWarnings = validateWatermarkConfig({ ...textConfig, type: WATERMARK_TYPES.TEXT })
    warnings.push(...layerWarnings)
  }

  for (const imageConfig of imageWatermarks) {
    if (imageConfig.image) {
      const layer = buildImageWatermarkLayer(imageConfig, imageMeta)
      layers.push(layer)
    }
  }

  if (layers.length === 0 && textWatermarks.length > 0) {
    const defaultLayer = buildTextWatermarkLayer(DEFAULT_TEXT_WATERMARK, imageMeta)
    layers.push(defaultLayer)
  }

  const memoryEstimate = calculatePlanMemory(imageMeta, layers)

  const allPositions = layers.flatMap((layer) =>
    layer.positions.map((pos) => ({
      layerType: layer.type,
      x: pos.x,
      y: pos.y,
      width: layer.dimensions?.width || layer.width,
      height: layer.dimensions?.height || layer.height,
    }))
  )

  const hasOutOfBounds = allPositions.some((p) => {
    const overlapX = Math.max(0, Math.min(p.x + p.width, imageMeta.width) - Math.max(p.x, 0))
    const overlapY = Math.max(0, Math.min(p.y + p.height, imageMeta.height) - Math.max(p.y, 0))
    const overlapArea = overlapX * overlapY
    const totalArea = p.width * p.height
    return overlapArea < totalArea * 0.5 || overlapArea === 0
  })

  if (hasOutOfBounds) {
    warnings.push({
      code: ERROR_CODES.WATERMARK_OUT_OF_BOUNDS,
      message: '部分水印可能超出画布边界',
      level: 'warning',
    })
  }

  return createSuccess({
    layers,
    warnings,
    memoryEstimate,
    canvasSize: {
      width: imageMeta.width,
      height: imageMeta.height,
    },
    config: sanitizedConfig,
    summary: {
      totalLayers: layers.length,
      textLayers: layers.filter((l) => l.type === WATERMARK_TYPES.TEXT).length,
      imageLayers: layers.filter((l) => l.type === WATERMARK_TYPES.IMAGE).length,
      totalPositions: allPositions.length,
      hasOutOfBounds,
    },
  })
}

export {
  buildWatermarkPlan,
  calculateAnchorPosition,
  normalizeRotation,
  estimateTextDimensions,
  generateTilePositions,
  validateWatermarkConfig,
  calculatePlanMemory,
  buildTextWatermarkLayer,
  buildImageWatermarkLayer,
}
