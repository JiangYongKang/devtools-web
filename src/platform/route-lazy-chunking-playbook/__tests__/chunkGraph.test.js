import { buildChunkGraph, calculateChunkDependencies } from '../logic'

describe('buildChunkGraph', () => {
  const mockManifest = {
    'tool-a': {
      id: 'tool-a',
      estimatedSize: 45,
      sharedChunks: ['shared-ui', 'shared-charts'],
    },
    'tool-b': {
      id: 'tool-b',
      estimatedSize: 38,
      sharedChunks: ['shared-ui', 'shared-export'],
    },
    'tool-c': {
      id: 'tool-c',
      estimatedSize: 62,
      sharedChunks: ['shared-ui', 'shared-charts', 'shared-utils'],
    },
  }

  it('应该正确构建节点，包含互斥 Chunk 和共享 Chunk', () => {
    const graph = buildChunkGraph(mockManifest)

    const nodeIds = graph.nodes.map((n) => n.id)
    expect(nodeIds).toContain('tool-tool-a')
    expect(nodeIds).toContain('tool-tool-b')
    expect(nodeIds).toContain('tool-tool-c')
    expect(nodeIds).toContain('shared-ui')
    expect(nodeIds).toContain('shared-charts')
    expect(nodeIds).toContain('shared-export')
    expect(nodeIds).toContain('shared-utils')
  })

  it('应该正确标记 Chunk 类型', () => {
    const graph = buildChunkGraph(mockManifest)

    const mutexNode = graph.nodes.find((n) => n.id === 'tool-tool-a')
    expect(mutexNode.type).toBe('mutex')

    const sharedNode = graph.nodes.find((n) => n.id === 'shared-ui')
    expect(sharedNode.type).toBe('shared')
  })

  it('应该正确构建工具到共享 Chunk 的依赖边', () => {
    const graph = buildChunkGraph(mockManifest)

    const dependencyEdges = graph.edges.filter((e) => e.type === 'dependency')
    expect(dependencyEdges.length).toBeGreaterThan(0)

    const toolADeps = dependencyEdges.filter((e) => e.from === 'tool-tool-a')
    expect(toolADeps.map((e) => e.to)).toContain('shared-ui')
    expect(toolADeps.map((e) => e.to)).toContain('shared-charts')
  })

  it('应该正确计算共享 Chunk 之间的重叠关系', () => {
    const graph = buildChunkGraph(mockManifest)

    const overlapEdges = graph.edges.filter((e) => e.type === 'shared-overlap')
    expect(overlapEdges.length).toBeGreaterThan(0)

    const uiChartsOverlap = overlapEdges.find(
      (e) => (e.from === 'shared-ui' && e.to === 'shared-charts') ||
             (e.from === 'shared-charts' && e.to === 'shared-ui')
    )
    expect(uiChartsOverlap).toBeDefined()
    expect(uiChartsOverlap.overlapCount).toBe(2)
  })

  it('空 manifest 应该返回空图', () => {
    const graph = buildChunkGraph({})
    expect(graph.nodes).toEqual([])
    expect(graph.edges).toEqual([])
  })
})

describe('calculateChunkDependencies', () => {
  const mockManifest = {
    'tool-a': {
      id: 'tool-a',
      estimatedSize: 45,
      sharedChunks: ['shared-ui', 'shared-charts'],
    },
  }

  it('应该正确计算工具的所有依赖 Chunk', () => {
    const graph = buildChunkGraph(mockManifest)
    const deps = calculateChunkDependencies(graph, 'tool-a')

    expect(deps).toContain('tool-tool-a')
    expect(deps).toContain('shared-ui')
    expect(deps).toContain('shared-charts')
  })

  it('不存在的工具应该返回空数组', () => {
    const graph = buildChunkGraph(mockManifest)
    const deps = calculateChunkDependencies(graph, 'non-existent-tool')
    expect(deps).toEqual([])
  })
})
