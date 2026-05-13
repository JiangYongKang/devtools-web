import {
  ERROR_CODES,
  MAX_TEXT_SIZE_BYTES,
  LARGE_TEXT_WARNING_THRESHOLD,
  DEFAULT_DEBOUNCE_DELAY,
} from './constants.js'
import {
  createError,
  classifyClipboardError,
} from './errors.js'
import {
  sanitizeHtml,
  htmlToPlainText,
} from './sanitize.js'
import {
  detectCapabilities,
  hasFeature,
  CLIPBOARD_CAPABILITIES,
} from './capabilityDetector.js'
import {
  isImageMime,
  isImagePng,
  getExtensionForMime,
  suggestFilenameFromMime,
} from './mimeMapping.js'

function approximateByteLength(str) {
  if (!str || typeof str !== 'string') return 0
  let len = 0
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) {
      len += 1
    } else if (code < 0x800) {
      len += 2
    } else if (code >= 0xD800 && code <= 0xDBFF) {
      len += 4
      i++
    } else {
      len += 3
    }
  }
  return len
}

function checkContentSize(text) {
  const byteLength = approximateByteLength(text)
  const isTooLarge = byteLength > MAX_TEXT_SIZE_BYTES
  const isLargeWarning = byteLength > LARGE_TEXT_WARNING_THRESHOLD
  return {
    byteLength,
    isTooLarge,
    isLargeWarning,
    maxAllowed: MAX_TEXT_SIZE_BYTES,
    warningThreshold: LARGE_TEXT_WARNING_THRESHOLD,
  }
}

function debounce(fn, delay = DEFAULT_DEBOUNCE_DELAY) {
  let timerId = null
  let lastCallTime = 0
  let pendingArgs = null
  let pendingResolve = null
  let pendingReject = null
  let pending = false

  const debounced = (...args) => {
    if (timerId) {
      clearTimeout(timerId)
      timerId = null
    }

    if (pending) {
      pendingReject?.(createError(ERROR_CODES.ABORTED, '连续写入已防抖，稍后的调用将覆盖此前的请求'))
    }

    pendingArgs = args
    pending = true

    return new Promise((resolve, reject) => {
      pendingResolve = resolve
      pendingReject = reject

      const execute = () => {
        lastCallTime = Date.now()
        timerId = null
        pending = false
        try {
          const result = fn(...pendingArgs)
          if (result && typeof result.then === 'function') {
            result.then(resolve).catch(reject)
          } else {
            resolve(result)
          }
        } catch (error) {
          reject(error)
        }
      }

      timerId = setTimeout(execute, delay)
    })
  }

  debounced.cancel = () => {
    if (timerId) {
      clearTimeout(timerId)
      timerId = null
    }
    if (pending) {
      pendingReject?.(createError(ERROR_CODES.ABORTED, '操作已取消'))
      pending = false
    }
  }

  return debounced
}

function createUserGestureToken() {
  return {
    timestamp: Date.now(),
    id: `gesture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }
}

function isValidUserGestureToken(token) {
  if (!token || typeof token !== 'object') return false
  if (!token.timestamp || !token.id) return false
  const age = Date.now() - token.timestamp
  return age < 5000
}

function verifyUserGesture(userGestureToken, requireExplicit = true) {
  if (requireExplicit) {
    return isValidUserGestureToken(userGestureToken)
  }

  if (isValidUserGestureToken(userGestureToken)) {
    return true
  }

  try {
    if (typeof document !== 'undefined' && document.hasFocus()) {
      return true
    }
  } catch {
  }

  return false
}

function createFallbackCopyElement(text) {
  if (typeof document === 'undefined') {
    return null
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  textarea.style.left = '-9999px'
  textarea.style.width = '1px'
  textarea.style.height = '1px'
  textarea.style.padding = '0'
  textarea.style.border = 'none'
  textarea.style.outline = 'none'
  textarea.style.boxShadow = 'none'
  textarea.style.background = 'transparent'
  textarea.setAttribute('readonly', '')

  return textarea
}

async function fallbackCopyText(text) {
  if (typeof document === 'undefined') {
    return {
      success: false,
      error: createError(ERROR_CODES.API_NOT_AVAILABLE, '当前环境不支持降级复制'),
      method: 'fallback_execCommand',
    }
  }

  const textarea = createFallbackCopyElement(text)
  if (!textarea) {
    return {
      success: false,
      error: createError(ERROR_CODES.API_NOT_AVAILABLE, '无法创建复制元素'),
      method: 'fallback_execCommand',
    }
  }

  try {
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, text.length)

    const success = document.execCommand('copy')

    if (!success) {
      return {
        success: false,
        error: createError(ERROR_CODES.CLIPBOARD_WRITE_FAILED, '降级复制失败，请手动复制'),
        method: 'fallback_execCommand',
      }
    }

    return {
      success: true,
      method: 'fallback_execCommand',
      bytesWritten: approximateByteLength(text),
    }
  } catch (error) {
    return {
      success: false,
      error: classifyClipboardError(error, 'write'),
      method: 'fallback_execCommand',
    }
  } finally {
    if (textarea && textarea.parentNode) {
      textarea.parentNode.removeChild(textarea)
    }
  }
}

async function writeTextViaApi(text, navigatorObj = null) {
  const nav = navigatorObj || (typeof navigator !== 'undefined' ? navigator : null)

  if (!nav || !nav.clipboard || typeof nav.clipboard.writeText !== 'function') {
    return {
      success: false,
      error: createError(ERROR_CODES.API_NOT_AVAILABLE, '剪贴板 API 不可用'),
      method: 'api_writeText',
    }
  }

  try {
    await nav.clipboard.writeText(text)
    return {
      success: true,
      method: 'api_writeText',
      bytesWritten: approximateByteLength(text),
    }
  } catch (error) {
    return {
      success: false,
      error: classifyClipboardError(error, 'write'),
      method: 'api_writeText',
    }
  }
}

async function buildClipboardItems(contents, options = {}) {
  const {
    sanitizeHtml: shouldSanitize = true,
    ClipboardItemClass = null,
    BlobClass = null,
  } = options

  const CIClass = ClipboardItemClass || (typeof ClipboardItem !== 'undefined' ? ClipboardItem : null)
  const BlobClassUsed = BlobClass || Blob

  if (!CIClass) {
    return {
      success: false,
      error: createError(ERROR_CODES.API_NOT_AVAILABLE, 'ClipboardItem 不可用，无法写入富文本'),
    }
  }

  const items = {}

  for (const content of contents) {
    const { type, data } = content

    if (!type || !data) continue

    if (type === 'text/html') {
      let htmlContent = data
      if (shouldSanitize) {
        const sanitizeResult = sanitizeHtml(htmlContent)
        if (!sanitizeResult.success) {
          return sanitizeResult
        }
        htmlContent = sanitizeResult.sanitizedHtml
      }

      items['text/html'] = new BlobClassUsed([htmlContent], { type: 'text/html' })

      if (!items['text/plain']) {
        const plain = htmlToPlainText(htmlContent)
        items['text/plain'] = new BlobClassUsed([plain], { type: 'text/plain' })
      }
    } else if (type === 'text/plain') {
      if (!items['text/plain']) {
        items['text/plain'] = new BlobClassUsed([data], { type: 'text/plain' })
      }
    } else if (type.startsWith('image/') && data instanceof Blob) {
      items[type] = data
    }
  }

  if (Object.keys(items).length === 0) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_INPUT, '没有可写入的内容'),
    }
  }

  try {
    const clipboardItem = new CIClass(items)
    return {
      success: true,
      item: clipboardItem,
      types: Object.keys(items),
    }
  } catch (error) {
    return {
      success: false,
      error: classifyClipboardError(error, 'write'),
    }
  }
}

async function writeRichTextViaApi(contents, options = {}) {
  const {
    navigatorObj = null,
    sanitizeHtml: shouldSanitize = true,
    ClipboardItemClass = null,
    BlobClass = null,
  } = options

  const nav = navigatorObj || (typeof navigator !== 'undefined' ? navigator : null)

  if (!nav || !nav.clipboard || typeof nav.clipboard.write !== 'function') {
    return {
      success: false,
      error: createError(ERROR_CODES.API_NOT_AVAILABLE, '剪贴板 write API 不可用'),
      method: 'api_write',
    }
  }

  const buildResult = await buildClipboardItems(contents, {
    sanitizeHtml: shouldSanitize,
    ClipboardItemClass,
    BlobClass,
  })

  if (!buildResult.success) {
    return {
      ...buildResult,
      method: 'api_write',
    }
  }

  try {
    await nav.clipboard.write([buildResult.item])
    return {
      success: true,
      method: 'api_write',
      types: buildResult.types,
    }
  } catch (error) {
    return {
      success: false,
      error: classifyClipboardError(error, 'write'),
      method: 'api_write',
    }
  }
}

async function writeText(text, options = {}) {
  const {
    userGestureToken = null,
    requireUserGesture = true,
    allowFallback = true,
    navigatorObj = null,
    skipSizeCheck = false,
    capabilities = null,
  } = options

  if (!verifyUserGesture(userGestureToken, requireUserGesture)) {
    return {
      success: false,
      error: createError(ERROR_CODES.USER_GESTURE_REQUIRED),
    }
  }

  if (typeof text !== 'string') {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_INPUT, '文本内容必须是字符串'),
    }
  }

  if (!skipSizeCheck) {
    const sizeCheck = checkContentSize(text)
    if (sizeCheck.isTooLarge) {
      return {
        success: false,
        error: createError(
          ERROR_CODES.CONTENT_TOO_LARGE,
          `内容过大: ${sizeCheck.byteLength} 字节，超过上限 ${sizeCheck.maxAllowed} 字节`
        ),
        sizeCheck,
      }
    }
  }

  const cap = capabilities || detectCapabilities({ navigator: navigatorObj }).features

  if (cap[CLIPBOARD_CAPABILITIES.CLIPBOARD_WRITE_TEXT]) {
    const apiResult = await writeTextViaApi(text, navigatorObj)
    if (apiResult.success) {
      return {
        ...apiResult,
        usedFallback: false,
      }
    }

    if (!allowFallback) {
      return apiResult
    }
  }

  if (allowFallback && cap[CLIPBOARD_CAPABILITIES.EXEC_COMMAND_COPY]) {
    const fallbackResult = await fallbackCopyText(text)
    return {
      ...fallbackResult,
      usedFallback: true,
    }
  }

  return {
    success: false,
    error: createError(ERROR_CODES.API_NOT_AVAILABLE, '无可用的剪贴板写入方式'),
  }
}

async function writeRichText(contents, options = {}) {
  const {
    userGestureToken = null,
    requireUserGesture = true,
    allowTextFallback = true,
    navigatorObj = null,
    sanitizeHtml: shouldSanitize = true,
    capabilities = null,
  } = options

  if (!verifyUserGesture(userGestureToken, requireUserGesture)) {
    return {
      success: false,
      error: createError(ERROR_CODES.USER_GESTURE_REQUIRED),
    }
  }

  const cap = capabilities || detectCapabilities({ navigator: navigatorObj }).features

  if (cap[CLIPBOARD_CAPABILITIES.CLIPBOARD_WRITE] && cap[CLIPBOARD_CAPABILITIES.CLIPBOARD_ITEM]) {
    const result = await writeRichTextViaApi(contents, {
      navigatorObj,
      sanitizeHtml: shouldSanitize,
    })
    if (result.success) {
      return {
        ...result,
        usedFallback: false,
      }
    }

    if (!allowTextFallback) {
      return result
    }
  }

  if (allowTextFallback) {
    const plainContent = contents.find((c) => c.type === 'text/plain')
    const htmlContent = contents.find((c) => c.type === 'text/html')

    let fallbackText = ''
    if (plainContent && plainContent.data) {
      fallbackText = plainContent.data
    } else if (htmlContent && htmlContent.data) {
      fallbackText = htmlToPlainText(htmlContent.data)
    }

    if (fallbackText) {
      const fallbackResult = await writeText(fallbackText, {
        userGestureToken,
        requireUserGesture,
        allowFallback: true,
        navigatorObj,
        capabilities: cap,
      })
      return {
        ...fallbackResult,
        usedFallback: true,
        fallbackReason: 'rich_text_not_supported',
      }
    }
  }

  return {
    success: false,
    error: createError(ERROR_CODES.API_NOT_AVAILABLE, '无法写入富文本，且无文本可降级'),
  }
}

async function readTextViaApi(navigatorObj = null) {
  const nav = navigatorObj || (typeof navigator !== 'undefined' ? navigator : null)

  if (!nav || !nav.clipboard || typeof nav.clipboard.readText !== 'function') {
    return {
      success: false,
      error: createError(ERROR_CODES.API_NOT_AVAILABLE, '剪贴板 readText API 不可用'),
      method: 'api_readText',
    }
  }

  try {
    const text = await nav.clipboard.readText()
    return {
      success: true,
      method: 'api_readText',
      text,
      bytesRead: approximateByteLength(text),
    }
  } catch (error) {
    return {
      success: false,
      error: classifyClipboardError(error, 'read'),
      method: 'api_readText',
    }
  }
}

async function readClipboardItemsViaApi(navigatorObj = null) {
  const nav = navigatorObj || (typeof navigator !== 'undefined' ? navigator : null)

  if (!nav || !nav.clipboard || typeof nav.clipboard.read !== 'function') {
    return {
      success: false,
      error: createError(ERROR_CODES.API_NOT_AVAILABLE, '剪贴板 read API 不可用'),
      method: 'api_read',
    }
  }

  try {
    const items = await nav.clipboard.read()
    return {
      success: true,
      method: 'api_read',
      items,
      itemCount: items.length,
    }
  } catch (error) {
    return {
      success: false,
      error: classifyClipboardError(error, 'read'),
      method: 'api_read',
    }
  }
}

async function extractImageFromClipboardItem(item) {
  if (!item || !item.types) {
    return null
  }

  const imageTypes = item.types.filter((t) => isImageMime(t))
  if (imageTypes.length === 0) {
    return null
  }

  const preferredType = imageTypes.find((t) => isImagePng(t)) || imageTypes[0]

  try {
    const blob = await item.getType(preferredType)
    const extResult = getExtensionForMime(preferredType)
    const suggestedFilename = suggestFilenameFromMime(preferredType)

    return {
      success: true,
      blob,
      mimeType: preferredType,
      size: blob.size,
      extension: extResult.success ? extResult.extension : 'bin',
      suggestedFilename,
      isPng: isImagePng(preferredType),
    }
  } catch (error) {
    return {
      success: false,
      error: classifyClipboardError(error, 'read'),
    }
  }
}

async function extractTextFromClipboardItem(item, modes = ['text/plain', 'text/html']) {
  if (!item || !item.types) {
    return null
  }

  const result = {
    hasPlainText: item.types.includes('text/plain'),
    hasHtml: item.types.includes('text/html'),
    types: item.types,
  }

  for (const mode of modes) {
    if (item.types.includes(mode) && typeof item.getType === 'function') {
      try {
        const blob = await item.getType(mode)
        const text = await blob.text()
        if (mode === 'text/plain') {
          result.plainText = text
        } else if (mode === 'text/html') {
          result.html = text
        }
      } catch {
      }
    }
  }

  return result
}

async function readClipboard(options = {}) {
  const {
    userGestureToken = null,
    requireUserGesture = true,
    navigatorObj = null,
    capabilities = null,
    preferRichText = true,
  } = options

  if (!verifyUserGesture(userGestureToken, requireUserGesture)) {
    return {
      success: false,
      error: createError(ERROR_CODES.USER_GESTURE_REQUIRED),
    }
  }

  const cap = capabilities || detectCapabilities({ navigator: navigatorObj }).features

  if (!cap[CLIPBOARD_CAPABILITIES.IS_SECURE_CONTEXT]) {
    return {
      success: false,
      error: createError(ERROR_CODES.INSECURE_CONTEXT),
    }
  }

  if (preferRichText && cap[CLIPBOARD_CAPABILITIES.CLIPBOARD_READ] && cap[CLIPBOARD_CAPABILITIES.CLIPBOARD_ITEM]) {
    const itemsResult = await readClipboardItemsViaApi(navigatorObj)
    if (itemsResult.success) {
      const result = {
        ...itemsResult,
        hasItems: true,
        hasImage: false,
        hasHtml: false,
        hasPlainText: false,
        extracted: null,
      }

      if (itemsResult.items.length > 0) {
        const firstItem = itemsResult.items[0]
        const hasImage = firstItem.types.some((t) => isImageMime(t))
        const hasHtml = firstItem.types.includes('text/html')
        const hasPlainText = firstItem.types.includes('text/plain')

        result.hasImage = hasImage
        result.hasHtml = hasHtml
        result.hasPlainText = hasPlainText

        if (hasImage) {
          const imageResult = await extractImageFromClipboardItem(firstItem)
          result.extracted = {
            type: 'image',
            ...imageResult,
          }
        } else {
          const textResult = await extractTextFromClipboardItem(firstItem)
          result.extracted = {
            type: 'text',
            ...textResult,
          }
        }
      }

      return result
    }
  }

  if (cap[CLIPBOARD_CAPABILITIES.CLIPBOARD_READ_TEXT]) {
    const textResult = await readTextViaApi(navigatorObj)
    if (textResult.success) {
      return {
        ...textResult,
        hasItems: false,
        hasImage: false,
        hasHtml: false,
        hasPlainText: true,
        extracted: {
          type: 'text',
          plainText: textResult.text,
          hasPlainText: true,
          hasHtml: false,
        },
      }
    }
    return textResult
  }

  return {
    success: false,
    error: createError(ERROR_CODES.API_NOT_AVAILABLE, '当前环境不支持读取剪贴板'),
  }
}

function createClipboardBridge(options = {}) {
  const {
    debounceDelay = DEFAULT_DEBOUNCE_DELAY,
    requireUserGesture = true,
    allowFallback = true,
    navigatorObj = null,
  } = options

  const debouncedWriteText = debounce(
    (text, opts) => writeText(text, {
      ...opts,
      navigatorObj,
      requireUserGesture,
      allowFallback,
    }),
    debounceDelay
  )

  return {
    writeText: (text, opts = {}) => writeText(text, {
      ...opts,
      navigatorObj,
      requireUserGesture,
      allowFallback,
    }),

    writeTextDebounced: (text, opts = {}) => debouncedWriteText(text, opts),

    writeRichText: (contents, opts = {}) => writeRichText(contents, {
      ...opts,
      navigatorObj,
      requireUserGesture,
    }),

    readClipboard: (opts = {}) => readClipboard({
      ...opts,
      navigatorObj,
      requireUserGesture,
    }),

    readText: async (opts = {}) => {
      const result = await readClipboard({
        ...opts,
        navigatorObj,
        requireUserGesture,
        preferRichText: false,
      })
      if (result.success) {
        return {
          success: true,
          text: result.text || result.extracted?.plainText || '',
          method: result.method,
        }
      }
      return result
    },

    createUserGestureToken,
    checkContentSize,
    approximateByteLength,
  }
}

export {
  approximateByteLength,
  checkContentSize,
  debounce,
  createUserGestureToken,
  isValidUserGestureToken,
  verifyUserGesture,
  createFallbackCopyElement,
  fallbackCopyText,
  writeTextViaApi,
  writeText,
  buildClipboardItems,
  writeRichTextViaApi,
  writeRichText,
  readTextViaApi,
  readClipboardItemsViaApi,
  extractImageFromClipboardItem,
  extractTextFromClipboardItem,
  readClipboard,
  createClipboardBridge,
}
