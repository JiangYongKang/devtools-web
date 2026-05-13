import { STREAMING_CHUNK_DEFAULTS } from './constants.js'

function createStreamingCursor(chunkSize = STREAMING_CHUNK_DEFAULTS.MAX_CHUNK_SIZE) {
  return {
    position: 0,
    chunkSize,
    chunkCount: 0,
    totalSize: 0,
  }
}

function advanceCursor(cursor, chunk) {
  const chunkSize = chunk ? chunk.length : 0
  return {
    ...cursor,
    position: cursor.position + chunkSize,
    chunkCount: cursor.chunkCount + 1,
    totalSize: cursor.totalSize + chunkSize,
  }
}

function resetCursor(cursor) {
  return {
    ...createStreamingCursor(cursor.chunkSize),
    chunkSize: cursor.chunkSize,
  }
}

function mergeChunks(chunks) {
  if (!Array.isArray(chunks)) return ''
  if (chunks.length === 0) return ''
  if (typeof chunks[0] === 'string') {
    return chunks.join('')
  }
  if (chunks[0] instanceof Uint8Array) {
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }
    return result
  }
  return chunks.join('')
}

function chunkString(str, chunkSize = STREAMING_CHUNK_DEFAULTS.MAX_CHUNK_SIZE) {
  if (!str) return []
  const chunks = []
  let position = 0
  while (position < str.length) {
    chunks.push(str.slice(position, position + chunkSize))
    position += chunkSize
  }
  return chunks
}

function getVirtualScrollRange(totalItems, visibleStart, visibleEnd, pageSize = STREAMING_CHUNK_DEFAULTS.VIRTUAL_SCROLL_PAGE_SIZE) {
  const safeStart = Math.max(0, visibleStart - pageSize)
  const safeEnd = Math.min(totalItems, visibleEnd + pageSize)
  return {
    start: safeStart,
    end: safeEnd,
    count: safeEnd - safeStart,
    paddingTop: safeStart,
    paddingBottom: totalItems - safeEnd,
  }
}

function estimateScrollPositionForIndex(index, itemHeight, containerScrollTop) {
  return index * itemHeight
}

function estimateIndexForScrollPosition(scrollTop, itemHeight) {
  if (itemHeight <= 0) return 0
  return Math.floor(scrollTop / itemHeight)
}

function calculatePlaceholderHeight(totalItems, itemHeight, renderedStart, renderedEnd) {
  const paddingTop = renderedStart * itemHeight
  const renderedHeight = (renderedEnd - renderedStart) * itemHeight
  const paddingBottom = (totalItems - renderedEnd) * itemHeight
  return { paddingTop, renderedHeight, paddingBottom }
}

export {
  createStreamingCursor,
  advanceCursor,
  resetCursor,
  mergeChunks,
  chunkString,
  getVirtualScrollRange,
  estimateScrollPositionForIndex,
  estimateIndexForScrollPosition,
  calculatePlaceholderHeight,
}
