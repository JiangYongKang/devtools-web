import {
  ERROR_CODES,
  ERROR_MESSAGES,
  DEFAULT_MAX_HTML_SIZE_BYTES,
  DEFAULT_WHITELIST,
  TAGS_TO_ALWAYS_REMOVE,
  MAX_DATA_URL_LENGTH,
  ALLOWED_DATA_URL_MIME_TYPES,
  UNKNOWN_TAG_POLICIES,
  SANITIZATION_MODES,
  OWASP_SAMPLES,
} from './constants.js'

import {
  getErrorMessage,
  createError,
  isValidErrorCode,
} from './errors.js'

import {
  escapeHtmlForDisplay,
  escapeHtmlForAttribute,
  decodeHtmlEntities,
  approximateByteLength,
  isValidProtocol,
  isEventAttribute,
  htmlToPlainText,
  sanitizeWithDOMParser,
  sanitizeWithTokenizer,
  sanitizeRichText,
  createSanitizer,
} from './sanitize.js'

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  DEFAULT_MAX_HTML_SIZE_BYTES,
  DEFAULT_WHITELIST,
  TAGS_TO_ALWAYS_REMOVE,
  MAX_DATA_URL_LENGTH,
  ALLOWED_DATA_URL_MIME_TYPES,
  UNKNOWN_TAG_POLICIES,
  SANITIZATION_MODES,
  OWASP_SAMPLES,

  getErrorMessage,
  createError,
  isValidErrorCode,

  escapeHtmlForDisplay,
  escapeHtmlForAttribute,
  decodeHtmlEntities,
  approximateByteLength,
  isValidProtocol,
  isEventAttribute,
  htmlToPlainText,
  sanitizeWithDOMParser,
  sanitizeWithTokenizer,
  sanitizeRichText,
  createSanitizer,
}
