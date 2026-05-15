import { ERROR_CODES } from './constants.js'
import { createError } from './errors.js'
import { isSSR } from './capabilityDetector.js'

export const SOURCE_TYPES = {
  STRING: 'string',
  BLOB: 'blob',
  READABLE_STREAM: 'readableStream',
  UINT8_ARRAY: 'uint8Array',
  ARRAY_BUFFER: 'arrayBuffer',
}

export function detectSourceType(source) {
  if (source == null) {
    return null
  }

  if (typeof source === 'string') {
    return SOURCE_TYPES.STRING
  }

  if (!isSSR()) {
    if (source instanceof Blob) {
      return SOURCE_TYPES.BLOB
    }
    if (source instanceof ReadableStream) {
      return SOURCE_TYPES.READABLE_STREAM
    }
  }

  if (source instanceof Uint8Array) {
    return SOURCE_TYPES.UINT8_ARRAY
  }

  if (source instanceof ArrayBuffer) {
    return SOURCE_TYPES.ARRAY_BUFFER
  }

  return null
}

export async function getSourceSize(source, sourceType = null) {
  const type = sourceType || detectSourceType(source)

  switch (type) {
    case SOURCE_TYPES.STRING:
      return new TextEncoder().encode(source).length
    case SOURCE_TYPES.BLOB:
      return source.size
    case SOURCE_TYPES.UINT8_ARRAY:
      return source.length
    case SOURCE_TYPES.ARRAY_BUFFER:
      return source.byteLength
    case SOURCE_TYPES.READABLE_STREAM:
      return null
    default:
      return null
  }
}

async function* stringChunkIterator(str, chunkSize) {
  const encoder = new TextEncoder()
  const encoded = encoder.encode(str)
  let offset = 0

  while (offset < encoded.length) {
    const chunk = encoded.slice(offset, offset + chunkSize)
    offset += chunk.length
    yield chunk
  }
}

async function* blobChunkIterator(blob, chunkSize, abortSignal) {
  let offset = 0

  while (offset < blob.size) {
    if (abortSignal?.aborted) {
      throw createError(ERROR_CODES.USER_ABORTED)
    }

    const end = Math.min(offset + chunkSize, blob.size)
    const slice = blob.slice(offset, end)
    const chunk = new Uint8Array(await slice.arrayBuffer())
    offset = end
    yield chunk
  }
}

async function* readableStreamChunkIterator(stream, chunkSize, abortSignal) {
  const reader = stream.getReader()

  try {
    let buffer = new Uint8Array(0)

    while (true) {
      if (abortSignal?.aborted) {
        throw createError(ERROR_CODES.USER_ABORTED)
      }

      const { done, value } = await reader.read()

      if (done) {
        if (buffer.length > 0) {
          yield buffer
        }
        break
      }

      if (value) {
        const newBuffer = new Uint8Array(buffer.length + value.length)
        newBuffer.set(buffer, 0)
        newBuffer.set(value, buffer.length)
        buffer = newBuffer

        while (buffer.length >= chunkSize) {
          yield buffer.slice(0, chunkSize)
          buffer = buffer.slice(chunkSize)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

async function* uint8ArrayChunkIterator(uint8Array, chunkSize) {
  let offset = 0

  while (offset < uint8Array.length) {
    const chunk = uint8Array.slice(offset, offset + chunkSize)
    offset += chunk.length
    yield chunk
  }
}

async function* arrayBufferChunkIterator(arrayBuffer, chunkSize) {
  const uint8Array = new Uint8Array(arrayBuffer)
  yield* uint8ArrayChunkIterator(uint8Array, chunkSize)
}

export function createChunkIterator(source, chunkSize, abortSignal = null) {
  const sourceType = detectSourceType(source)

  if (!sourceType) {
    throw createError(ERROR_CODES.INVALID_SOURCE_TYPE)
  }

  switch (sourceType) {
    case SOURCE_TYPES.STRING:
      return stringChunkIterator(source, chunkSize)
    case SOURCE_TYPES.BLOB:
      return blobChunkIterator(source, chunkSize, abortSignal)
    case SOURCE_TYPES.READABLE_STREAM:
      return readableStreamChunkIterator(source, chunkSize, abortSignal)
    case SOURCE_TYPES.UINT8_ARRAY:
      return uint8ArrayChunkIterator(source, chunkSize)
    case SOURCE_TYPES.ARRAY_BUFFER:
      return arrayBufferChunkIterator(source, chunkSize)
    default:
      throw createError(ERROR_CODES.INVALID_SOURCE_TYPE)
  }
}

export function createExportSource(source, options = {}) {
  const {
    filename = 'download',
    mimeType = null,
  } = options

  const sourceType = detectSourceType(source)

  if (!sourceType) {
    throw createError(ERROR_CODES.INVALID_SOURCE_TYPE)
  }

  return {
    source,
    sourceType,
    filename,
    mimeType,
    getSize: () => getSourceSize(source, sourceType),
    createIterator: (chunkSize, abortSignal) =>
      createChunkIterator(source, chunkSize, abortSignal),
  }
}

export function createMemoryStream(initialContent = '') {
  let buffer = initialContent
  const encoder = new TextEncoder()

  return new ReadableStream({
    start(controller) {
      if (buffer) {
        controller.enqueue(encoder.encode(buffer))
      }
    },
    pull(controller) {
    },
    cancel() {
      buffer = ''
    },
  })
}

export function createTestSource(pattern, totalBytes) {
  const repeated = pattern.repeat(Math.ceil(totalBytes / pattern.length))
  return repeated.slice(0, totalBytes)
}
