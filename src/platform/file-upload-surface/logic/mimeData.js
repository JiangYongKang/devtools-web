const CATEGORIES = {
  WEB: 'web',
  MEDIA: 'media',
  OFFICE: 'office',
  COMPRESSION: 'compression',
  OTHER: 'other',
}

const MIME_TABLE = [
  {
    extension: 'txt',
    mime: 'text/plain',
    category: CATEGORIES.OTHER,
    priority: 100,
    isRecommended: true,
  },
  {
    extension: 'md',
    mime: 'text/markdown',
    category: CATEGORIES.OTHER,
    priority: 100,
    isRecommended: true,
  },
  {
    extension: 'json',
    mime: 'application/json',
    category: CATEGORIES.WEB,
    priority: 100,
    isRecommended: true,
  },
  {
    extension: 'xml',
    mime: 'application/xml',
    category: CATEGORIES.WEB,
    priority: 100,
    isRecommended: true,
  },
  {
    extension: 'html',
    mime: 'text/html',
    category: CATEGORIES.WEB,
    priority: 100,
    isRecommended: true,
  },
  {
    extension: 'htm',
    mime: 'text/html',
    category: CATEGORIES.WEB,
    priority: 90,
    isRecommended: false,
  },
  {
    extension: 'css',
    mime: 'text/css',
    category: CATEGORIES.WEB,
    priority: 100,
    isRecommended: true,
  },
  {
    extension: 'js',
    mime: 'application/javascript',
    category: CATEGORIES.WEB,
    priority: 100,
    isRecommended: true,
  },
  {
    extension: 'mjs',
    mime: 'application/javascript',
    category: CATEGORIES.WEB,
    priority: 95,
    isRecommended: false,
  },
  {
    extension: 'png',
    mime: 'image/png',
    category: CATEGORIES.MEDIA,
    priority: 100,
    isRecommended: true,
  },
  {
    extension: 'jpg',
    mime: 'image/jpeg',
    category: CATEGORIES.MEDIA,
    priority: 100,
    isRecommended: true,
  },
  {
    extension: 'jpeg',
    mime: 'image/jpeg',
    category: CATEGORIES.MEDIA,
    priority: 95,
    isRecommended: false,
  },
  {
    extension: 'gif',
    mime: 'image/gif',
    category: CATEGORIES.MEDIA,
    priority: 100,
    isRecommended: true,
  },
  {
    extension: 'webp',
    mime: 'image/webp',
    category: CATEGORIES.MEDIA,
    priority: 100,
    isRecommended: true,
  },
  {
    extension: 'avif',
    mime: 'image/avif',
    category: CATEGORIES.MEDIA,
    priority: 100,
    isRecommended: true,
  },
  {
    extension: 'svg',
    mime: 'image/svg+xml',
    category: CATEGORIES.MEDIA,
    priority: 100,
    isRecommended: true,
  },
  {
    extension: 'pdf',
    mime: 'application/pdf',
    category: CATEGORIES.OFFICE,
    priority: 100,
    isRecommended: true,
  },
  {
    extension: 'csv',
    mime: 'text/csv',
    category: CATEGORIES.OFFICE,
    priority: 100,
    isRecommended: true,
  },
  {
    extension: 'zip',
    mime: 'application/zip',
    category: CATEGORIES.COMPRESSION,
    priority: 100,
    isRecommended: true,
  },
  {
    extension: 'exe',
    mime: 'application/vnd.microsoft.portable-executable',
    category: CATEGORIES.OTHER,
    priority: 70,
    isRecommended: false,
  },
  {
    extension: 'bin',
    mime: 'application/octet-stream',
    category: CATEGORIES.OTHER,
    priority: 60,
    isRecommended: false,
  },
]

const MAGIC_NUMBERS = [
  {
    signature: [0x25, 0x50, 0x44, 0x46],
    mime: 'application/pdf',
    description: 'PDF document',
  },
  {
    signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    mime: 'image/png',
    description: 'PNG image',
  },
  {
    signature: [0xFF, 0xD8, 0xFF],
    mime: 'image/jpeg',
    description: 'JPEG image',
  },
  {
    signature: [0x47, 0x49, 0x46, 0x38],
    mime: 'image/gif',
    description: 'GIF image',
  },
  {
    signature: [0x52, 0x49, 0x46, 0x46],
    mime: 'image/webp',
    description: 'WebP image',
    offset: 0,
    trailingCheck: {
      offset: 8,
      signature: [0x57, 0x45, 0x42, 0x50],
    },
  },
  {
    signature: [0x50, 0x4B, 0x03, 0x04],
    mime: 'application/zip',
    description: 'ZIP archive',
  },
  {
    signature: [0x50, 0x4B, 0x05, 0x06],
    mime: 'application/zip',
    description: 'ZIP archive (empty)',
  },
  {
    signature: [0x50, 0x4B, 0x07, 0x08],
    mime: 'application/zip',
    description: 'ZIP archive (spanned)',
  },
  {
    signature: [0x4D, 0x5A],
    mime: 'application/vnd.microsoft.portable-executable',
    description: 'Windows executable (PE)',
  },
  {
    signature: [0x3C, 0x3F, 0x78, 0x6D, 0x6C],
    mime: 'application/xml',
    description: 'XML document',
  },
  {
    signature: [0xEF, 0xBB, 0xBF],
    mime: 'text/plain',
    description: 'UTF-8 BOM text',
  },
]

const MIME_TO_EXTENSION = {
  'text/plain': 'txt',
  'text/markdown': 'md',
  'application/json': 'json',
  'application/xml': 'xml',
  'text/html': 'html',
  'text/css': 'css',
  'application/javascript': 'js',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'application/zip': 'zip',
  'application/vnd.microsoft.portable-executable': 'exe',
  'application/octet-stream': 'bin',
}

const IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
])

const TEXT_BASED_MIMES = new Set([
  'text/plain',
  'text/markdown',
  'text/html',
  'text/css',
  'application/json',
  'application/xml',
  'application/javascript',
  'text/csv',
  'image/svg+xml',
])

function buildExtensionIndex(table = MIME_TABLE) {
  const index = new Map()
  table.forEach((entry) => {
    const ext = normalizeExtension(entry.extension)
    if (!index.has(ext)) {
      index.set(ext, [])
    }
    index.get(ext).push({
      ...entry,
    })
  })
  return index
}

function buildMimeIndex(table = MIME_TABLE) {
  const index = new Map()
  table.forEach((entry) => {
    const mime = normalizeMime(entry.mime)
    if (!index.has(mime)) {
      index.set(mime, [])
    }
    index.get(mime).push({
      ...entry,
    })
  })
  return index
}

function normalizeExtension(ext) {
  if (ext == null) return ''
  let result = String(ext).trim()
  if (result.startsWith('.')) {
    result = result.slice(1)
  }
  return result.toLowerCase()
}

function normalizeMime(mime) {
  if (mime == null) return ''
  let result = String(mime).trim().toLowerCase()
  const semiIndex = result.indexOf(';')
  if (semiIndex !== -1) {
    result = result.slice(0, semiIndex).trim()
  }
  return result
}

function getExtensionForMime(mime) {
  const normalized = normalizeMime(mime)
  return MIME_TO_EXTENSION[normalized] || null
}

function getExtensionForMimeOrDefault(mime, defaultExt = 'bin') {
  return getExtensionForMime(mime) || defaultExt
}

function suggestFilenameFromMime(mime, prefix = 'clipboard-file') {
  const ext = getExtensionForMimeOrDefault(mime, 'bin')
  return `${prefix}.${ext}`
}

function isTextBasedMime(mime) {
  return TEXT_BASED_MIMES.has(normalizeMime(mime))
}

function isImageMime(mime) {
  return IMAGE_MIMES.has(normalizeMime(mime))
}

function getExtensionFromFilename(filename) {
  if (!filename) return ''
  const lastDot = filename.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === filename.length - 1) {
    return ''
  }
  return normalizeExtension(filename.slice(lastDot + 1))
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  if (bytes == null) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

export {
  CATEGORIES,
  MIME_TABLE,
  MAGIC_NUMBERS,
  MIME_TO_EXTENSION,
  IMAGE_MIMES,
  TEXT_BASED_MIMES,
  buildExtensionIndex,
  buildMimeIndex,
  normalizeExtension,
  normalizeMime,
  getExtensionForMime,
  getExtensionForMimeOrDefault,
  suggestFilenameFromMime,
  isTextBasedMime,
  isImageMime,
  getExtensionFromFilename,
  formatSize,
}
