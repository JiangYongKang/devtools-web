function countUtf8Bytes(str) {
  if (str == null || str === '') return 0
  const encoder = new TextEncoder()
  return encoder.encode(str).length
}

function countLines(str) {
  if (str == null || str === '') return 0
  if (str[str.length - 1] === '\n') {
    return str.split('\n').length - 1
  }
  return str.split('\n').length
}

function countWords(str) {
  if (str == null || str === '') return 0
  const trimmed = str.trim()
  if (trimmed === '') return 0
  return trimmed.split(/\s+/).length
}

function countCharacters(str) {
  if (str == null || str === '') return 0
  return Array.from(str).length
}

function calculateTextMetrics(text) {
  const utf8Bytes = countUtf8Bytes(text)
  const lines = countLines(text)
  const words = countWords(text)
  const chars = countCharacters(text)
  const wordDensity = lines > 0 ? (words / lines).toFixed(2) : '0.00'
  
  return {
    utf8Bytes,
    lines,
    words,
    chars,
    wordDensity,
  }
}

function formatSize(bytes) {
  if (bytes == null || bytes < 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function isOutputTooLarge(byteCount, maxSize) {
  return byteCount > maxSize
}

function getSizeCategory(byteCount, warnThreshold, maxThreshold) {
  if (byteCount <= 0) return 'empty'
  if (byteCount <= warnThreshold) return 'normal'
  if (byteCount <= maxThreshold) return 'warning'
  return 'exceeded'
}

export {
  countUtf8Bytes,
  countLines,
  countWords,
  countCharacters,
  calculateTextMetrics,
  formatSize,
  isOutputTooLarge,
  getSizeCategory,
}
