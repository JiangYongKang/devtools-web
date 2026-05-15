const MIME_TABLE = [
  { extension: 'png', mime: 'image/png', category: 'image' },
  { extension: 'jpg', mime: 'image/jpeg', category: 'image' },
  { extension: 'jpeg', mime: 'image/jpeg', category: 'image' },
  { extension: 'gif', mime: 'image/gif', category: 'image' },
  { extension: 'webp', mime: 'image/webp', category: 'image' },
  { extension: 'avif', mime: 'image/avif', category: 'image' },
  { extension: 'svg', mime: 'image/svg+xml', category: 'image' },
  { extension: 'bmp', mime: 'image/bmp', category: 'image' },
  { extension: 'ico', mime: 'image/x-icon', category: 'image' },
  { extension: 'tiff', mime: 'image/tiff', category: 'image' },
  { extension: 'tif', mime: 'image/tiff', category: 'image' },

  { extension: 'pdf', mime: 'application/pdf', category: 'document' },
  { extension: 'doc', mime: 'application/msword', category: 'document' },
  { extension: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'document' },
  { extension: 'xls', mime: 'application/vnd.ms-excel', category: 'document' },
  { extension: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'document' },
  { extension: 'ppt', mime: 'application/vnd.ms-powerpoint', category: 'document' },
  { extension: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', category: 'document' },
  { extension: 'odt', mime: 'application/vnd.oasis.opendocument.text', category: 'document' },
  { extension: 'ods', mime: 'application/vnd.oasis.opendocument.spreadsheet', category: 'document' },
  { extension: 'odp', mime: 'application/vnd.oasis.opendocument.presentation', category: 'document' },
  { extension: 'rtf', mime: 'application/rtf', category: 'document' },

  { extension: 'zip', mime: 'application/zip', category: 'archive' },
  { extension: 'rar', mime: 'application/x-rar-compressed', category: 'archive' },
  { extension: '7z', mime: 'application/x-7z-compressed', category: 'archive' },
  { extension: 'gz', mime: 'application/gzip', category: 'archive' },
  { extension: 'tar', mime: 'application/x-tar', category: 'archive' },
  { extension: 'bz2', mime: 'application/x-bzip2', category: 'archive' },
  { extension: 'xz', mime: 'application/x-xz', category: 'archive' },

  { extension: 'txt', mime: 'text/plain', category: 'text' },
  { extension: 'md', mime: 'text/markdown', category: 'text' },
  { extension: 'html', mime: 'text/html', category: 'text' },
  { extension: 'htm', mime: 'text/html', category: 'text' },
  { extension: 'css', mime: 'text/css', category: 'text' },
  { extension: 'js', mime: 'application/javascript', category: 'text' },
  { extension: 'mjs', mime: 'application/javascript', category: 'text' },
  { extension: 'json', mime: 'application/json', category: 'text' },
  { extension: 'xml', mime: 'application/xml', category: 'text' },
  { extension: 'csv', mime: 'text/csv', category: 'text' },
  { extension: 'yaml', mime: 'text/yaml', category: 'text' },
  { extension: 'yml', mime: 'text/yaml', category: 'text' },

  { extension: 'mp4', mime: 'video/mp4', category: 'video' },
  { extension: 'avi', mime: 'video/x-msvideo', category: 'video' },
  { extension: 'mov', mime: 'video/quicktime', category: 'video' },
  { extension: 'wmv', mime: 'video/x-ms-wmv', category: 'video' },
  { extension: 'flv', mime: 'video/x-flv', category: 'video' },
  { extension: 'webm', mime: 'video/webm', category: 'video' },
  { extension: 'mkv', mime: 'video/x-matroska', category: 'video' },
  { extension: 'mpeg', mime: 'video/mpeg', category: 'video' },
  { extension: 'mpg', mime: 'video/mpeg', category: 'video' },

  { extension: 'mp3', mime: 'audio/mpeg', category: 'audio' },
  { extension: 'wav', mime: 'audio/wav', category: 'audio' },
  { extension: 'ogg', mime: 'audio/ogg', category: 'audio' },
  { extension: 'flac', mime: 'audio/flac', category: 'audio' },
  { extension: 'aac', mime: 'audio/aac', category: 'audio' },
  { extension: 'm4a', mime: 'audio/mp4', category: 'audio' },
  { extension: 'wma', mime: 'audio/x-ms-wma', category: 'audio' },

  { extension: 'wasm', mime: 'application/wasm', category: 'executable' },
  { extension: 'exe', mime: 'application/vnd.microsoft.portable-executable', category: 'executable' },
  { extension: 'dll', mime: 'application/vnd.microsoft.portable-executable', category: 'executable' },
  { extension: 'bin', mime: 'application/octet-stream', category: 'executable' },
  { extension: 'so', mime: 'application/x-sharedlib', category: 'executable' },
  { extension: 'dylib', mime: 'application/x-mach-binary', category: 'executable' },
  { extension: 'app', mime: 'application/x-mach-binary', category: 'executable' },
  { extension: 'sh', mime: 'application/x-sh', category: 'executable' },
  { extension: 'bat', mime: 'application/x-bat', category: 'executable' },
  { extension: 'cmd', mime: 'application/x-cmd', category: 'executable' },
  { extension: 'ps1', mime: 'application/x-powershell', category: 'executable' },
]

function buildExtensionToMimeMap() {
  const map = new Map()
  MIME_TABLE.forEach((entry) => {
    const ext = normalizeExtension(entry.extension)
    if (!map.has(ext)) {
      map.set(ext, [])
    }
    map.get(ext).push(entry.mime)
  })
  return map
}

function buildMimeToExtensionMap() {
  const map = new Map()
  MIME_TABLE.forEach((entry) => {
    const mime = normalizeMime(entry.mime)
    if (!map.has(mime)) {
      map.set(mime, [])
    }
    map.get(mime).push(entry.extension)
  })
  return map
}

function buildCategoryMap() {
  const map = new Map()
  MIME_TABLE.forEach((entry) => {
    const category = entry.category
    if (!map.has(category)) {
      map.set(category, [])
    }
    map.get(category).push(entry)
  })
  return map
}

function normalizeExtension(ext) {
  if (ext == null) return ''
  let result = String(ext).trim().toLowerCase()
  if (result.startsWith('.')) {
    result = result.slice(1)
  }
  return result
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

function getExtensionFromFilename(filename) {
  if (!filename) return ''
  const lastDot = filename.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === filename.length - 1) {
    return ''
  }
  return normalizeExtension(filename.slice(lastDot + 1))
}

function getMimeForExtension(ext) {
  const normalized = normalizeExtension(ext)
  const map = buildExtensionToMimeMap()
  const mimes = map.get(normalized)
  return mimes && mimes.length > 0 ? mimes[0] : null
}

function getAllMimesForExtension(ext) {
  const normalized = normalizeExtension(ext)
  const map = buildExtensionToMimeMap()
  return map.get(normalized) || []
}

function getExtensionForMime(mime) {
  const normalized = normalizeMime(mime)
  const map = buildMimeToExtensionMap()
  const exts = map.get(normalized)
  return exts && exts.length > 0 ? exts[0] : null
}

function getAllExtensionsForMime(mime) {
  const normalized = normalizeMime(mime)
  const map = buildMimeToExtensionMap()
  return map.get(normalized) || []
}

function getCategoryForExtension(ext) {
  const normalized = normalizeExtension(ext)
  const entry = MIME_TABLE.find((e) => normalizeExtension(e.extension) === normalized)
  return entry ? entry.category : 'unknown'
}

function getCategoryForMime(mime) {
  const normalized = normalizeMime(mime)
  const entry = MIME_TABLE.find((e) => normalizeMime(e.mime) === normalized)
  return entry ? entry.category : 'unknown'
}

function isTextBasedMime(mime) {
  const category = getCategoryForMime(mime)
  return category === 'text' || mime.includes('text/') || mime.includes('json') || mime.includes('xml') || mime.includes('javascript')
}

function isImageMime(mime) {
  return getCategoryForMime(mime) === 'image' || mime.startsWith('image/')
}

function isArchiveMime(mime) {
  return getCategoryForMime(mime) === 'archive'
}

function isExecutableMime(mime) {
  const category = getCategoryForMime(mime)
  if (category === 'executable') return true

  const normalized = normalizeMime(mime)
  const executableTypes = [
    'application/wasm',
    'application/vnd.microsoft.portable-executable',
    'application/x-executable',
    'application/x-sharedlib',
    'application/x-mach-binary',
    'application/x-msdownload',
    'application/x-dosexec',
  ]
  return executableTypes.includes(normalized)
}

function isOctetStream(mime) {
  const normalized = normalizeMime(mime)
  return normalized === 'application/octet-stream' || normalized === 'application/x-binary'
}

export {
  MIME_TABLE,
  buildExtensionToMimeMap,
  buildMimeToExtensionMap,
  buildCategoryMap,
  normalizeExtension,
  normalizeMime,
  getExtensionFromFilename,
  getMimeForExtension,
  getAllMimesForExtension,
  getExtensionForMime,
  getAllExtensionsForMime,
  getCategoryForExtension,
  getCategoryForMime,
  isTextBasedMime,
  isImageMime,
  isArchiveMime,
  isExecutableMime,
  isOctetStream,
}
