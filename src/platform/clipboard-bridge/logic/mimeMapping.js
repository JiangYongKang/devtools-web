import {
  MIME_TO_EXTENSION,
  TEXT_BASED_MIMES,
  IMAGE_MIMES,
  ERROR_CODES,
} from './constants.js'
import { createError } from './errors.js'

function normalizeMimeType(mimeType) {
  if (!mimeType || typeof mimeType !== 'string') {
    return ''
  }
  return mimeType.toLowerCase().split(';')[0].trim()
}

function getExtensionForMime(mimeType) {
  const normalized = normalizeMimeType(mimeType)
  if (!normalized) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_MIME_TYPE, 'MIME 类型不能为空'),
    }
  }

  const mapping = MIME_TO_EXTENSION[normalized]
  if (mapping) {
    return {
      success: true,
      extension: mapping.extension,
      isRecommended: mapping.isRecommended,
      mimeType: normalized,
    }
  }

  const parts = normalized.split('/')
  if (parts.length === 2) {
    const subtype = parts[1].toLowerCase()
    const knownSubtypes = ['png', 'jpeg', 'jpg', 'gif', 'webp', 'pdf', 'zip', 'html', 'css', 'js', 'json', 'xml']
    if (knownSubtypes.includes(subtype)) {
      return {
        success: true,
        extension: subtype === 'jpeg' ? 'jpg' : subtype,
        isRecommended: false,
        mimeType: normalized,
        isInferred: true,
      }
    }
  }

  return {
    success: false,
    error: createError(ERROR_CODES.INVALID_MIME_TYPE, `未知的 MIME 类型: ${mimeType}`),
    mimeType: normalized,
  }
}

function getExtensionForMimeOrDefault(mimeType, defaultExt = 'bin') {
  const result = getExtensionForMime(mimeType)
  if (result.success) {
    return result.extension
  }
  return defaultExt
}

function suggestFilenameFromMime(mimeType, prefix = 'clipboard') {
  const extResult = getExtensionForMime(mimeType)
  const ext = extResult.success ? extResult.extension : 'bin'
  const timestamp = Date.now()
  return `${prefix}_${timestamp}.${ext}`
}

function isTextBasedMime(mimeType) {
  const normalized = normalizeMimeType(mimeType)
  if (TEXT_BASED_MIMES.includes(normalized)) {
    return true
  }
  return normalized.startsWith('text/')
}

function isImageMime(mimeType) {
  const normalized = normalizeMimeType(mimeType)
  return IMAGE_MIMES.includes(normalized)
}

function isImagePng(mimeType) {
  const normalized = normalizeMimeType(mimeType)
  return normalized === 'image/png'
}

function isImageJpeg(mimeType) {
  const normalized = normalizeMimeType(mimeType)
  return normalized === 'image/jpeg' || normalized === 'image/jpg'
}

function getAllKnownMimes() {
  return Object.keys(MIME_TO_EXTENSION)
}

function getAllImageMimes() {
  return [...IMAGE_MIMES]
}

export {
  normalizeMimeType,
  getExtensionForMime,
  getExtensionForMimeOrDefault,
  suggestFilenameFromMime,
  isTextBasedMime,
  isImageMime,
  isImagePng,
  isImageJpeg,
  getAllKnownMimes,
  getAllImageMimes,
}
