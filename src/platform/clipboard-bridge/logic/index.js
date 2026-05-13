import {
  ERROR_CODES,
  ERROR_MESSAGES,
  USER_FRIENDLY_TIPS,
  DEFAULT_DEBOUNCE_DELAY,
  MAX_TEXT_SIZE_BYTES,
  LARGE_TEXT_WARNING_THRESHOLD,
  FEATURE_CACHE_TTL_MS,
  CLIPBOARD_CAPABILITIES,
  HTML_SANITIZE_WHITELIST,
  MIME_TO_EXTENSION,
  TEXT_BASED_MIMES,
  IMAGE_MIMES,
  READ_MODES,
} from './constants.js'

import {
  getErrorMessage,
  createError,
  isValidErrorCode,
  classifyClipboardError,
} from './errors.js'

import {
  sanitizeHtml,
  htmlToPlainText,
  escapeHtmlForDisplay,
} from './sanitize.js'

import {
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
} from './mimeMapping.js'

import {
  detectCapabilities,
  hasFeature,
  getFeatureMatrix,
  getBrowserSummary,
  clearCache,
  isSecureContext,
} from './capabilityDetector.js'

import {
  approximateByteLength,
  checkContentSize,
  debounce,
  createUserGestureToken,
  isValidUserGestureToken,
  verifyUserGesture,
  writeText,
  writeRichText,
  readClipboard,
  createClipboardBridge,
  buildClipboardItems,
} from './core.js'

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  USER_FRIENDLY_TIPS,
  DEFAULT_DEBOUNCE_DELAY,
  MAX_TEXT_SIZE_BYTES,
  LARGE_TEXT_WARNING_THRESHOLD,
  FEATURE_CACHE_TTL_MS,
  CLIPBOARD_CAPABILITIES,
  HTML_SANITIZE_WHITELIST,
  MIME_TO_EXTENSION,
  TEXT_BASED_MIMES,
  IMAGE_MIMES,
  READ_MODES,

  getErrorMessage,
  createError,
  isValidErrorCode,
  classifyClipboardError,

  sanitizeHtml,
  htmlToPlainText,
  escapeHtmlForDisplay,

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

  detectCapabilities,
  hasFeature,
  getFeatureMatrix,
  getBrowserSummary,
  clearCache,
  isSecureContext,

  approximateByteLength,
  checkContentSize,
  debounce,
  createUserGestureToken,
  isValidUserGestureToken,
  verifyUserGesture,
  writeText,
  writeRichText,
  readClipboard,
  createClipboardBridge,
  buildClipboardItems,
}
