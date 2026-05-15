import {
  ERROR_CODES,
  EXIF_ORIENTATIONS,
  MAX_TEXTURE_SIZE,
  MAX_CANVAS_AREA,
  MEMORY_PER_PIXEL,
  EXIF_APP1_MARKER,
  EXIF_HEADER,
} from './constants.js'
import { createSuccess, createFailure, wrapError } from './errors.js'

function readArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

function parseExifOrientation(arrayBuffer) {
  try {
    const dataView = new DataView(arrayBuffer)
    let offset = 2

    while (offset < dataView.byteLength - 1) {
      const marker = dataView.getUint16(offset, false)
      offset += 2

      if (marker === EXIF_APP1_MARKER) {
        const length = dataView.getUint16(offset, false)
        offset += 2

        if (offset + 4 <= dataView.byteLength) {
          const exifHeaderCheck = dataView.getUint32(offset, false)
          if (exifHeaderCheck === EXIF_HEADER) {
            offset += 6
            const isLittleEndian = dataView.getUint16(offset, false) === 0x4949
            offset += 2

            const offsetToFirstIFD = dataView.getUint32(offset, isLittleEndian)
            offset += offsetToFirstIFD - 8

            const numEntries = dataView.getUint16(offset, isLittleEndian)
            offset += 2

            for (let i = 0; i < numEntries; i++) {
              const tag = dataView.getUint16(offset, isLittleEndian)
              offset += 2

              if (tag === 0x0112) {
                offset += 6
                const orientation = dataView.getUint16(offset, isLittleEndian)
                return orientation
              }
              offset += 10
            }
          }
        }
        break
      } else if ((marker & 0xFF00) !== 0xFF00) {
        break
      } else {
        const segmentLength = dataView.getUint16(offset, false)
        offset += segmentLength
      }
    }
  } catch (e) {
  }

  return 1
}

function applyExifOrientation(image, orientation) {
  const orientInfo = EXIF_ORIENTATIONS[orientation] || EXIF_ORIENTATIONS[1]

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  let width = image.width
  let height = image.height

  if (orientInfo.rotation === 90 || orientInfo.rotation === 270) {
    [width, height] = [height, width]
  }

  canvas.width = width
  canvas.height = height

  ctx.translate(width / 2, height / 2)
  ctx.rotate((orientInfo.rotation * Math.PI) / 180)

  if (orientInfo.flipX) {
    ctx.scale(-1, 1)
  }
  if (orientInfo.flipY) {
    ctx.scale(1, -1)
  }

  ctx.drawImage(image, -image.width / 2, -image.height / 2)

  return canvas
}

async function loadImageFromBlob(blob, signal = null) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'))
      return
    }

    const url = URL.createObjectURL(blob)
    const img = new Image()

    const cleanup = () => {
      URL.revokeObjectURL(url)
      img.onload = null
      img.onerror = null
    }

    const abortHandler = () => {
      cleanup()
      img.src = ''
      reject(new Error('Aborted'))
    }

    signal?.addEventListener('abort', abortHandler)

    img.onload = () => {
      signal?.removeEventListener('abort', abortHandler)
      cleanup()
      resolve(img)
    }

    img.onerror = () => {
      signal?.removeEventListener('abort', abortHandler)
      cleanup()
      reject(new Error('图片加载失败'))
    }

    img.src = url
  })
}

async function loadImageWithCreateImageBitmap(blob, signal = null) {
  try {
    const bitmap = await createImageBitmap(blob, { signal })
    return bitmap
  } catch (e) {
    if (e.name === 'AbortError') {
      throw e
    }
    return loadImageFromBlob(blob, signal)
  }
}

function calculateMemoryUsage(width, height) {
  const pixelCount = width * height
  const bytes = pixelCount * MEMORY_PER_PIXEL
  const megabytes = bytes / (1024 * 1024)

  return {
    bytes,
    kilobytes: bytes / 1024,
    megabytes,
    gigabytes: megabytes / 1024,
  }
}

function isImageTooLarge(width, height) {
  if (width > MAX_TEXTURE_SIZE || height > MAX_TEXTURE_SIZE) {
    return true
  }

  if (width * height > MAX_CANVAS_AREA) {
    return true
  }

  return false
}

function getDownscaleFactor(width, height) {
  let scaleX = 1
  let scaleY = 1

  if (width > MAX_TEXTURE_SIZE) {
    scaleX = MAX_TEXTURE_SIZE / width
  }
  if (height > MAX_TEXTURE_SIZE) {
    scaleY = MAX_TEXTURE_SIZE / height
  }

  const areaScale = Math.sqrt(MAX_CANVAS_AREA / (width * height))
  const minScale = Math.min(scaleX, scaleY, areaScale, 1)

  return minScale
}

async function loadImage(source, options = {}) {
  const {
    autoOrient = true,
    useCreateImageBitmap = true,
    downscaleIfTooLarge = true,
    signal = null,
  } = options

  try {
    let image
    let originalWidth
    let originalHeight
    let exifOrientation = 1
    let wasDownscaled = false
    let downscaleFactor = 1

    if (source instanceof Blob || source instanceof File) {
      const arrayBuffer = await readArrayBuffer(source)
      exifOrientation = parseExifOrientation(arrayBuffer)

      if (useCreateImageBitmap && typeof createImageBitmap === 'function') {
        image = await loadImageWithCreateImageBitmap(source, signal)
      } else {
        image = await loadImageFromBlob(source, signal)
      }

      originalWidth = image.width
      originalHeight = image.height
    } else if (source instanceof HTMLImageElement || source instanceof ImageBitmap) {
      image = source
      originalWidth = image.width
      originalHeight = image.height
    } else {
      return createFailure(ERROR_CODES.INVALID_IMAGE_FORMAT, '不支持的图片源类型')
    }

    if (isImageTooLarge(originalWidth, originalHeight)) {
      if (downscaleIfTooLarge) {
        downscaleFactor = getDownscaleFactor(originalWidth, originalHeight)

        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(originalWidth * downscaleFactor)
        canvas.height = Math.floor(originalHeight * downscaleFactor)

        const ctx = canvas.getContext('2d')
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

        image = canvas
        wasDownscaled = true
      } else {
        return createFailure(
          ERROR_CODES.IMAGE_TOO_LARGE,
          `图片尺寸 ${originalWidth}x${originalHeight} 超出最大限制 ${MAX_TEXTURE_SIZE}x${MAX_TEXTURE_SIZE}`,
          {
            width: originalWidth,
            height: originalHeight,
            maxSize: MAX_TEXTURE_SIZE,
            suggestedScale: getDownscaleFactor(originalWidth, originalHeight),
          }
        )
      }
    }

    if (autoOrient && exifOrientation !== 1) {
      image = applyExifOrientation(image, exifOrientation)
    }

    const memoryUsage = calculateMemoryUsage(image.width, image.height)

    return createSuccess({
      image,
      originalWidth,
      originalHeight,
      width: image.width,
      height: image.height,
      exifOrientation,
      exifOrientationInfo: EXIF_ORIENTATIONS[exifOrientation],
      memoryUsage,
      wasDownscaled,
      downscaleFactor,
      supportsOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      supportsCreateImageBitmap: typeof createImageBitmap === 'function',
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      return createFailure(ERROR_CODES.ABORTED)
    }
    return createFailure(ERROR_CODES.IMAGE_LOAD_ERROR, error?.message, {
      originalError: String(error),
    })
  }
}

async function loadImageFromDataUrl(dataUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      resolve(loadImage(img, options))
    }

    img.onerror = () => {
      reject(createFailure(ERROR_CODES.IMAGE_LOAD_ERROR, 'Data URL 加载失败'))
    }

    img.src = dataUrl
  })
}

export {
  loadImage,
  loadImageFromBlob,
  loadImageFromDataUrl,
  loadImageWithCreateImageBitmap,
  parseExifOrientation,
  applyExifOrientation,
  calculateMemoryUsage,
  isImageTooLarge,
  getDownscaleFactor,
}
