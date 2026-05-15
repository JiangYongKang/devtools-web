import {
  ENCODING_MODES,
  DEFAULT_CONFIG,
  ERROR_CODES,
} from './constants.js'
import {
  createError,
} from './errors.js'

function validateEncoding(encoding) {
  return encoding === ENCODING_MODES.UTF_16 || encoding === ENCODING_MODES.UTF_8
}

function getUtf8ByteLength(str) {
  let length = 0
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) {
      length += 1
    } else if (code < 0x800) {
      length += 2
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        length += 4
        i++
      } else {
        length += 3
      }
    } else {
      length += 3
    }
  }
  return length
}

function findUtf8SafeBreakPoint(str, startIndex, targetBytes, maxIndex) {
  let byteCount = 0
  let lastSafeIndex = startIndex

  for (let i = startIndex; i <= maxIndex && i < str.length; i++) {
    const code = str.charCodeAt(i)
    let charBytes = 1

    if (code < 0x80) {
      charBytes = 1
    } else if (code < 0x800) {
      charBytes = 2
    } else if (code >= 0xd800 && code <= 0xdbff) {
      charBytes = 4
    } else {
      charBytes = 3
    }

    if (byteCount + charBytes > targetBytes) {
      break
    }

    byteCount += charBytes
    lastSafeIndex = i
  }

  return {
    index: Math.min(lastSafeIndex + 1, str.length),
    bytes: byteCount,
  }
}

function createTextChunkIterator(text, options = {}) {
  const encoding = options.encoding ?? ENCODING_MODES.UTF_16
  const chunkSize = options.chunkSize ?? (
    encoding === ENCODING_MODES.UTF_16
      ? DEFAULT_CONFIG.CHUNK_SIZE_UTF16
      : DEFAULT_CONFIG.CHUNK_SIZE_UTF8
  )

  if (!validateEncoding(encoding)) {
    throw createError(ERROR_CODES.INVALID_ENCODING, `编码必须是 ${ENCODING_MODES.UTF_16} 或 ${ENCODING_MODES.UTF_8}`)
  }

  if (typeof chunkSize !== 'number' || chunkSize <= 0) {
    throw createError(ERROR_CODES.INVALID_CHUNK_SIZE, '分片大小必须为正整数')
  }

  const str = String(text || '')
  let currentPosition = 0
  const totalLength = str.length
  let chunkIndex = 0

  const iterator = {
    [Symbol.iterator]() {
      return this
    },
    next() {
      if (currentPosition >= totalLength) {
        return {
          value: undefined,
          done: true,
          isFirst: false,
          isLast: true,
        }
      }

      let chunkEnd = currentPosition
      let chunkSizeInBytes = 0

      if (encoding === ENCODING_MODES.UTF_16) {
        chunkEnd = Math.min(currentPosition + chunkSize, totalLength)
        if (chunkEnd < totalLength) {
          const charBefore = str.charCodeAt(chunkEnd - 1)
          if (charBefore >= 0xd800 && charBefore <= 0xdbff) {
            chunkEnd++
          }
        }
        chunkSizeInBytes = (chunkEnd - currentPosition) * 2
      } else {
        const result = findUtf8SafeBreakPoint(
          str,
          currentPosition,
          chunkSize,
          totalLength
        )
        chunkEnd = result.index
        chunkSizeInBytes = result.bytes
      }

      const chunk = str.slice(currentPosition, chunkEnd)
      const isFirst = currentPosition === 0
      const isLast = chunkEnd >= totalLength
      const startIndex = currentPosition
      const endIndex = chunkEnd

      currentPosition = chunkEnd
      chunkIndex++

      return {
        value: {
          chunk,
          chunkIndex: chunkIndex - 1,
          startIndex,
          endIndex,
          length: chunk.length,
          byteSize: chunkSizeInBytes,
          encoding,
          isFirst,
          isLast,
        },
        done: false,
        isFirst,
        isLast,
      }
    },
    getTotalChunks() {
      if (encoding === ENCODING_MODES.UTF_16) {
        return Math.ceil(totalLength / chunkSize) || 1
      }
      let count = 0
      let pos = 0
      while (pos < totalLength) {
        const result = findUtf8SafeBreakPoint(str, pos, chunkSize, totalLength)
        pos = result.index
        count++
      }
      return count || 1
    },
    getTotalLength() {
      return totalLength
    },
    getEncoding() {
      return encoding
    },
    reset() {
      currentPosition = 0
      chunkIndex = 0
    },
    collectAll() {
      this.reset()
      const chunks = []
      let result = this.next()
      while (!result.done) {
        chunks.push(result.value)
        result = this.next()
      }
      return chunks
    },
  }

  return iterator
}

function* textChunkGenerator(text, options = {}) {
  const iterator = createTextChunkIterator(text, options)
  let result = iterator.next()
  while (!result.done) {
    yield result.value
    result = iterator.next()
  }
}

function estimateTextByteSize(text, encoding = ENCODING_MODES.UTF_16) {
  if (!text) return 0
  if (encoding === ENCODING_MODES.UTF_16) {
    return text.length * 2
  }
  return getUtf8ByteLength(text)
}

export {
  createTextChunkIterator,
  textChunkGenerator,
  estimateTextByteSize,
  getUtf8ByteLength,
  findUtf8SafeBreakPoint,
}
