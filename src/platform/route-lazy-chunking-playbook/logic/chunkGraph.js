import { CHUNK_TYPES } from './constants'

export function buildChunkGraph(manifest) {
  const edges = []
  const chunkMap = new Map()

  Object.values(manifest).forEach((tool) => {
    const toolChunkId = `tool-${tool.id}`
    chunkMap.set(toolChunkId, {
      type: CHUNK_TYPES.MUTEX,
      size: tool.estimatedSize || 0,
      tools: [tool.id],
    })

    tool.sharedChunks?.forEach((sharedChunkId) => {
      if (!chunkMap.has(sharedChunkId)) {
        chunkMap.set(sharedChunkId, {
          type: CHUNK_TYPES.SHARED,
          size: 0,
          tools: [],
        })
      }
      chunkMap.get(sharedChunkId).tools.push(tool.id)

      edges.push({
        from: toolChunkId,
        to: sharedChunkId,
        type: 'dependency',
      })
    })
  })

  const sharedChunks = Array.from(chunkMap.entries()).filter(
    ([, chunk]) => chunk.type === CHUNK_TYPES.SHARED && chunk.tools.length > 1
  )

  sharedChunks.forEach(([id, chunk]) => {
    const otherShared = sharedChunks.filter(([otherId]) => otherId !== id)
    otherShared.forEach(([otherId]) => {
      const overlap = chunk.tools.filter((t) => chunkMap.get(otherId).tools.includes(t))
      if (overlap.length > 0) {
        edges.push({
          from: id,
          to: otherId,
          type: 'shared-overlap',
          overlapCount: overlap.length,
        })
      }
    })
  })

  return {
    nodes: Array.from(chunkMap.entries()).map(([id, chunk]) => ({
      id,
      ...chunk,
    })),
    edges,
  }
}

export function calculateChunkDependencies(graph, toolId) {
  const toolNode = graph.nodes.find((n) => n.id === `tool-${toolId}`)
  if (!toolNode) return []

  const dependencies = new Set([toolNode.id])
  const queue = [toolNode.id]

  while (queue.length > 0) {
    const current = queue.shift()
    graph.edges
      .filter((e) => e.from === current && e.type === 'dependency')
      .forEach((e) => {
        if (!dependencies.has(e.to)) {
          dependencies.add(e.to)
          queue.push(e.to)
        }
      })
  }

  return Array.from(dependencies)
}
