const ERROR_CODES = {
  NOT_ALLOWED: 'NOT_ALLOWED',
  SECURITY_ERROR: 'SECURITY_ERROR',
  INSECURE_CONTEXT: 'INSECURE_CONTEXT',
  API_NOT_AVAILABLE: 'API_NOT_AVAILABLE',
  USER_GESTURE_REQUIRED: 'USER_GESTURE_REQUIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  CLIPBOARD_WRITE_FAILED: 'CLIPBOARD_WRITE_FAILED',
  CLIPBOARD_READ_FAILED: 'CLIPBOARD_READ_FAILED',
  CONTENT_TOO_LARGE: 'CONTENT_TOO_LARGE',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_MIME_TYPE: 'INVALID_MIME_TYPE',
  ABORTED: 'ABORTED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NOT_ALLOWED]: '剪贴板操作被阻止。请确保您已授权，且在用户交互（如点击按钮）后重试。',
  [ERROR_CODES.SECURITY_ERROR]: '安全策略阻止了剪贴板访问。请在安全上下文（HTTPS 或 localhost）下使用，或尝试手动复制。',
  [ERROR_CODES.INSECURE_CONTEXT]: '当前页面在非安全上下文下运行。剪贴板 API 仅在 HTTPS 或 localhost 环境可用。请使用降级复制方式或手动复制。',
  [ERROR_CODES.API_NOT_AVAILABLE]: '您的浏览器不支持现代剪贴板 API。请尝试手动复制，或更新到最新版本的浏览器。',
  [ERROR_CODES.USER_GESTURE_REQUIRED]: '剪贴板操作需要用户交互触发。请点击按钮后重试。',
  [ERROR_CODES.PERMISSION_DENIED]: '您已拒绝剪贴板权限。请在浏览器设置中重新授权，或使用手动复制方式。',
  [ERROR_CODES.CLIPBOARD_WRITE_FAILED]: '写入剪贴板失败。请重试或使用手动复制方式。',
  [ERROR_CODES.CLIPBOARD_READ_FAILED]: '读取剪贴板失败。请确保已授权并点击按钮重试。',
  [ERROR_CODES.CONTENT_TOO_LARGE]: '内容过大，可能导致性能问题或写入失败。建议分批复制或压缩内容。',
  [ERROR_CODES.INVALID_INPUT]: '输入内容无效。',
  [ERROR_CODES.INVALID_MIME_TYPE]: '不支持的 MIME 类型。',
  [ERROR_CODES.ABORTED]: '操作已取消。',
  [ERROR_CODES.UNKNOWN_ERROR]: '发生未知错误。',
}

const USER_FRIENDLY_TIPS = {
  NOT_ALLOWED_TIP: '浏览器阻止了自动访问剪贴板。请点击下方按钮手动复制内容。',
  INSECURE_CONTEXT_TIP: '由于当前页面不是 HTTPS，现代剪贴板 API 不可用。系统已自动降级。如果仍失败，请手动选中并复制。',
  SAFARI_TIP: 'Safari 浏览器对剪贴板 API 支持有限。如果操作失败，请手动选中内容并按 Cmd+C 复制。',
  READ_PERMISSION_TIP: '读取剪贴板需要您的授权。点击按钮后，浏览器可能会弹出权限请求。',
}

const DEFAULT_DEBOUNCE_DELAY = 300

const MAX_TEXT_SIZE_BYTES = 1024 * 1024

const LARGE_TEXT_WARNING_THRESHOLD = 512 * 1024

const FEATURE_CACHE_TTL_MS = 5 * 60 * 1000

const FEATURE_CACHE_KEY = 'clipboard_bridge_feature_cache'

const CLIPBOARD_CAPABILITIES = {
  CLIPBOARD_API: 'clipboard_api',
  CLIPBOARD_WRITE_TEXT: 'clipboard_write_text',
  CLIPBOARD_READ_TEXT: 'clipboard_read_text',
  CLIPBOARD_ITEM: 'clipboard_item',
  CLIPBOARD_WRITE: 'clipboard_write',
  CLIPBOARD_READ: 'clipboard_read',
  EXEC_COMMAND_COPY: 'exec_command_copy',
  IS_SECURE_CONTEXT: 'is_secure_context',
}

const HTML_SANITIZE_WHITELIST = {
  tags: [
    'a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside',
    'b', 'bdi', 'bdo', 'big', 'blockquote', 'br',
    'caption', 'center', 'cite', 'code', 'col', 'colgroup',
    'data', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt',
    'em',
    'figcaption', 'figure', 'footer',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr',
    'i', 'img', 'ins',
    'kbd',
    'li',
    'main', 'mark', 'menu', 'menuitem',
    'nav',
    'ol',
    'p', 'picture', 'pre',
    'q',
    'rp', 'rt', 'ruby',
    's', 'samp', 'section', 'small', 'source', 'span', 'strike', 'strong', 'sub', 'summary', 'sup',
    'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track', 'tt',
    'u', 'ul',
    'var',
    'wbr',
  ],
  attributes: {
    '*': ['title', 'lang', 'dir', 'class', 'id', 'style'],
    'a': ['href', 'target', 'rel'],
    'img': ['src', 'alt', 'width', 'height', 'title'],
    'td': ['colspan', 'rowspan', 'align', 'valign'],
    'th': ['colspan', 'rowspan', 'align', 'valign'],
    'col': ['span', 'width'],
    'colgroup': ['span'],
    'table': ['border', 'cellpadding', 'cellspacing', 'width'],
    'source': ['srcset', 'media', 'type'],
    'picture': [],
    'time': ['datetime'],
    'data': ['value'],
  },
  protocols: {
    'a': ['http', 'https', 'mailto', 'tel'],
    'img': ['http', 'https', 'data'],
  },
  styles: [
    'color', 'background-color', 'background',
    'font-size', 'font-family', 'font-weight', 'font-style', 'text-decoration',
    'text-align', 'vertical-align',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'border', 'border-width', 'border-style', 'border-color',
    'border-collapse', 'border-spacing',
    'width', 'height',
    'display', 'float', 'clear',
    'white-space', 'word-break', 'word-wrap',
    'line-height',
  ],
}

const MIME_TO_EXTENSION = {
  'text/plain': { extension: 'txt', isRecommended: true },
  'text/html': { extension: 'html', isRecommended: true },
  'text/css': { extension: 'css', isRecommended: true },
  'text/javascript': { extension: 'js', isRecommended: true },
  'application/javascript': { extension: 'js', isRecommended: true },
  'text/json': { extension: 'json', isRecommended: true },
  'application/json': { extension: 'json', isRecommended: true },
  'text/xml': { extension: 'xml', isRecommended: true },
  'application/xml': { extension: 'xml', isRecommended: true },
  'text/markdown': { extension: 'md', isRecommended: true },
  'text/csv': { extension: 'csv', isRecommended: true },
  'text/tab-separated-values': { extension: 'tsv', isRecommended: true },
  'text/rtf': { extension: 'rtf', isRecommended: true },

  'image/png': { extension: 'png', isRecommended: true },
  'image/jpeg': { extension: 'jpg', isRecommended: true },
  'image/jpg': { extension: 'jpg', isRecommended: true },
  'image/gif': { extension: 'gif', isRecommended: true },
  'image/webp': { extension: 'webp', isRecommended: true },
  'image/svg+xml': { extension: 'svg', isRecommended: true },
  'image/bmp': { extension: 'bmp', isRecommended: true },
  'image/tiff': { extension: 'tiff', isRecommended: true },
  'image/x-icon': { extension: 'ico', isRecommended: true },
  'image/vnd.microsoft.icon': { extension: 'ico', isRecommended: true },
  'image/avif': { extension: 'avif', isRecommended: true },

  'application/pdf': { extension: 'pdf', isRecommended: true },
  'application/msword': { extension: 'doc', isRecommended: true },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { extension: 'docx', isRecommended: true },
  'application/vnd.ms-excel': { extension: 'xls', isRecommended: true },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { extension: 'xlsx', isRecommended: true },
  'application/vnd.ms-powerpoint': { extension: 'ppt', isRecommended: true },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { extension: 'pptx', isRecommended: true },

  'application/zip': { extension: 'zip', isRecommended: true },
  'application/x-7z-compressed': { extension: '7z', isRecommended: true },
  'application/x-rar-compressed': { extension: 'rar', isRecommended: true },
  'application/gzip': { extension: 'gz', isRecommended: true },
  'application/x-tar': { extension: 'tar', isRecommended: true },

  'audio/mpeg': { extension: 'mp3', isRecommended: true },
  'audio/mp4': { extension: 'm4a', isRecommended: true },
  'audio/ogg': { extension: 'ogg', isRecommended: true },
  'audio/wav': { extension: 'wav', isRecommended: true },
  'audio/webm': { extension: 'webm', isRecommended: true },
  'audio/flac': { extension: 'flac', isRecommended: true },

  'video/mp4': { extension: 'mp4', isRecommended: true },
  'video/webm': { extension: 'webm', isRecommended: true },
  'video/ogg': { extension: 'ogv', isRecommended: true },
  'video/quicktime': { extension: 'mov', isRecommended: true },
  'video/x-msvideo': { extension: 'avi', isRecommended: true },
  'video/x-matroska': { extension: 'mkv', isRecommended: true },

  'application/octet-stream': { extension: 'bin', isRecommended: true },
}

const TEXT_BASED_MIMES = [
  'text/plain', 'text/html', 'text/css', 'text/javascript', 'text/json',
  'application/javascript', 'application/json', 'text/xml', 'application/xml',
  'text/markdown', 'text/csv', 'text/tab-separated-values', 'text/rtf',
]

const IMAGE_MIMES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
  'image/svg+xml', 'image/bmp', 'image/tiff', 'image/x-icon',
  'image/vnd.microsoft.icon', 'image/avif',
]

const READ_MODES = {
  PLAIN_TEXT: 'plain_text',
  RAW_HTML: 'raw_html',
}

export {
    CLIPBOARD_CAPABILITIES, DEFAULT_DEBOUNCE_DELAY, ERROR_CODES,
    ERROR_MESSAGES, FEATURE_CACHE_KEY, FEATURE_CACHE_TTL_MS, HTML_SANITIZE_WHITELIST, IMAGE_MIMES, LARGE_TEXT_WARNING_THRESHOLD, MAX_TEXT_SIZE_BYTES, MIME_TO_EXTENSION, READ_MODES, TEXT_BASED_MIMES, USER_FRIENDLY_TIPS
}

