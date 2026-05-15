import { ERROR_CODES, WATERMARK_TYPES } from './constants.js'
import { createSuccess, createFailure } from './errors.js'

function createCanvas(width, height, useOffscreen = false) {
  if (useOffscreen && typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height)
  }
  return document.createElement('canvas')
}

function getContext(canvas) {
  const ctx = canvas.getContext('2d', {
    alpha: true,
    willReadFrequently: false,
  })

  if (!ctx) {
    throw new Error('无法获取 Canvas 2D 上下文')
  }

  return ctx
}

function drawTextWatermark(ctx, layer, position) {
  const { content, fontFamily, fontSize, color, rotation, opacity, antialias } = layer

  ctx.save()

  ctx.globalAlpha = opacity
  ctx.textBaseline = 'top'
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.fillStyle = color
  ctx.imageSmoothingEnabled = antialias

  const centerX = position.x + layer.dimensions.width / 2
  const centerY = position.y + layer.dimensions.height / 2

  if (rotation !== 0) {
    ctx.translate(centerX, centerY)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-centerX, -centerY)
  }

  const lines = content.split('\n')
  lines.forEach((line, index) => {
    ctx.fillText(line, position.x, position.y + index * layer.dimensions.lineHeight)
  })

  ctx.restore()
}

function drawImageWatermark(ctx, layer, position) {
  const { image, opacity } = layer

  if (!image) {
    return
  }

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.drawImage(image, position.x, position.y, layer.width, layer.height)
  ctx.restore()
}

function drawLayer(ctx, layer) {
  const positions = layer.positions || []

  for (const position of positions) {
    if (layer.type === WATERMARK_TYPES.TEXT) {
      drawTextWatermark(ctx, layer, position)
    } else if (layer.type === WATERMARK_TYPES.IMAGE) {
      drawImageWatermark(ctx, layer, position)
    }
  }
}

function drawBackground(ctx, image, width, height, showOriginal = false) {
  if (showOriginal || !image) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }

  if (image) {
    ctx.drawImage(image, 0, 0, width, height)
  }
}

function checkAbortSignal(signal) {
  if (signal?.aborted) {
    throw createFailure(ERROR_CODES.ABORTED)
  }
}

async function rasterizePreview(plan, image, options = {}) {
  const {
    showOriginal = false,
    useOffscreen = true,
    signal = null,
    scale = 1,
  } = options

  try {
    if (!plan || !plan.success) {
      return createFailure(ERROR_CODES.RENDER_ERROR, '无效的渲染计划')
    }

    const { canvasSize, layers } = plan

    checkAbortSignal(signal)

    const outputWidth = Math.floor(canvasSize.width * scale)
    const outputHeight = Math.floor(canvasSize.height * scale)

    const canvas = createCanvas(outputWidth, outputHeight, useOffscreen)
    const ctx = getContext(canvas)

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    if (scale !== 1) {
      ctx.scale(scale, scale)
    }

    drawBackground(ctx, showOriginal ? null : image, canvasSize.width, canvasSize.height, showOriginal)

    checkAbortSignal(signal)

    for (const layer of layers) {
      drawLayer(ctx, layer)
      checkAbortSignal(signal)
    }

    return createSuccess({
      canvas,
      width: outputWidth,
      height: outputHeight,
      originalWidth: canvasSize.width,
      originalHeight: canvasSize.height,
      scale,
    })
  } catch (error) {
    if (error?.error?.errorCode === ERROR_CODES.ABORTED) {
      return createFailure(ERROR_CODES.ABORTED)
    }
    return createFailure(ERROR_CODES.RENDER_ERROR, error?.message, {
      originalError: String(error),
    })
  }
}

async function rasterizeCompare(plan, image, options = {}) {
  const { useOffscreen = true, signal = null } = options

  try {
    const [originalResult, watermarkedResult] = await Promise.all([
      rasterizePreview(plan, image, { showOriginal: true, useOffscreen, signal }),
      rasterizePreview(plan, image, { showOriginal: false, useOffscreen, signal }),
    ])

    if (!originalResult.success) {
      return originalResult
    }
    if (!watermarkedResult.success) {
      return watermarkedResult
    }

    return createSuccess({
      original: originalResult.canvas,
      watermarked: watermarkedResult.canvas,
      width: originalResult.width,
      height: originalResult.height,
    })
  } catch (error) {
    return createFailure(ERROR_CODES.RENDER_ERROR, error?.message, {
      originalError: String(error),
    })
  }
}

function canvasToBlob(canvas, mimeType = 'image/png', quality = 0.92) {
  return new Promise((resolve, reject) => {
    try {
      if (canvas instanceof OffscreenCanvas) {
        canvas.convertToBlob({ type: mimeType, quality }).then(resolve).catch(reject)
      } else {
        canvas.toBlob(resolve, mimeType, quality)
      }
    } catch (error) {
      reject(error)
    }
  })
}

function canvasToDataUrl(canvas, mimeType = 'image/png', quality = 0.92) {
  if (!canvas) {
    return null
  }
  if (canvas instanceof OffscreenCanvas) {
    return null
  }
  return canvas.toDataURL(mimeType, quality)
}

async function downloadCanvas(canvas, filename, mimeType = 'image/png', quality = 0.92) {
  try {
    const blob = await canvasToBlob(canvas, mimeType, quality)
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 100)

    return createSuccess({
      filename,
      size: blob.size,
      mimeType: blob.type,
    })
  } catch (error) {
    return createFailure(ERROR_CODES.RENDER_ERROR, '导出图片失败', {
      originalError: String(error),
    })
  }
}

export {
  rasterizePreview,
  rasterizeCompare,
  canvasToBlob,
  canvasToDataUrl,
  downloadCanvas,
  createCanvas,
  getContext,
  drawTextWatermark,
  drawImageWatermark,
  drawLayer,
  drawBackground,
}
