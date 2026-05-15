import { describe, expect, test } from 'vitest'
import {
    fitView,
    forceDirectedLayout,
    getGraphBounds,
    runLayout,
    sugiyamaLayout,
} from '../logic/layout.js'

describe('Sugiyama 分层布局', () => {
  test('空图布局', () => {
    const result = sugiyamaLayout([], [])
    expect(result.nodes).toHaveLength(0)
    expect(result.iterations).toBeGreaterThanOrEqual(0)
    expect(result.duration).toBeGreaterThanOrEqual(0)
    expect(result.converged).toBe(true)
  })

  test('单个节点布局', () => {
    const nodes = [{ id: 'A', x: 0, y: 0, width: 120, height: 60 }]
    const result = sugiyamaLayout(nodes, [])
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].x).toBeDefined()
    expect(result.nodes[0].y).toBeDefined()
  })

  test('简单链布局', () => {
    const nodes = [
      { id: 'A', x: 0, y: 0, width: 120, height: 60 },
      { id: 'B', x: 0, y: 0, width: 120, height: 60 },
      { id: 'C', x: 0, y: 0, width: 120, height: 60 },
    ]
    const edges = [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ]
    const result = sugiyamaLayout(nodes, edges)
    expect(result.nodes).toHaveLength(3)

    const nodeA = result.nodes.find(n => n.id === 'A')
    const nodeB = result.nodes.find(n => n.id === 'B')
    const nodeC = result.nodes.find(n => n.id === 'C')

    expect(nodeA.y).toBeLessThan(nodeB.y)
    expect(nodeB.y).toBeLessThan(nodeC.y)
  })

  test('有入度分支的布局', () => {
    const nodes = [
      { id: 'A', x: 0, y: 0, width: 120, height: 60 },
      { id: 'B', x: 0, y: 0, width: 120, height: 60 },
      { id: 'C', x: 0, y: 0, width: 120, height: 60 },
      { id: 'D', x: 0, y: 0, width: 120, height: 60 },
    ]
    const edges = [
      { from: 'A', to: 'C' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'D' },
    ]
    const result = sugiyamaLayout(nodes, edges)
    expect(result.nodes).toHaveLength(4)
    expect(result.converged).toBe(true)
  })

  test('保留节点尺寸', () => {
    const nodes = [
      { id: 'A', x: 0, y: 0, width: 200, height: 80 },
      { id: 'B', x: 0, y: 0, width: 100, height: 50 },
    ]
    const edges = [{ from: 'A', to: 'B' }]
    const result = sugiyamaLayout(nodes, edges)

    expect(result.nodes[0].width).toBe(200)
    expect(result.nodes[0].height).toBe(80)
    expect(result.nodes[1].width).toBe(100)
    expect(result.nodes[1].height).toBe(50)
  })

  test('自定义布局参数', () => {
    const nodes = [
      { id: 'A', x: 0, y: 0, width: 120, height: 60 },
      { id: 'B', x: 0, y: 0, width: 120, height: 60 },
    ]
    const edges = [{ from: 'A', to: 'B' }]
    const result = sugiyamaLayout(nodes, edges, {
      maxIterations: 50,
      layerGap: 150,
      nodeGap: 50,
    })
    expect(result.iterations).toBeLessThanOrEqual(50)
    expect(result.converged).toBe(true)
  })
})

describe('力导向布局', () => {
  test('空图布局', () => {
    const result = forceDirectedLayout([], [])
    expect(result.nodes).toHaveLength(0)
    expect(result.iterations).toBeGreaterThanOrEqual(0)
  })

  test('单个节点布局', () => {
    const nodes = [{ id: 'A', width: 120, height: 60 }]
    const result = forceDirectedLayout(nodes, [])
    expect(result.nodes).toHaveLength(1)
  })

  test('简单链布局', () => {
    const nodes = [
      { id: 'A', width: 120, height: 60 },
      { id: 'B', width: 120, height: 60 },
      { id: 'C', width: 120, height: 60 },
    ]
    const edges = [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ]
    const result = forceDirectedLayout(nodes, edges)
    expect(result.nodes).toHaveLength(3)
    expect(result.converged).toBeDefined()
  })

  test('星形结构布局', () => {
    const nodes = [
      { id: 'center', width: 120, height: 60 },
      { id: 'A', width: 120, height: 60 },
      { id: 'B', width: 120, height: 60 },
      { id: 'C', width: 120, height: 60 },
      { id: 'D', width: 120, height: 60 },
    ]
    const edges = [
      { from: 'center', to: 'A' },
      { from: 'center', to: 'B' },
      { from: 'center', to: 'C' },
      { from: 'center', to: 'D' },
    ]
    const result = forceDirectedLayout(nodes, edges)
    expect(result.nodes).toHaveLength(5)
    expect(result.iterations).toBeGreaterThan(0)
  })

  test('自定义物理参数', () => {
    const nodes = [
      { id: 'A', width: 120, height: 60 },
      { id: 'B', width: 120, height: 60 },
    ]
    const edges = [{ from: 'A', to: 'B' }]
    const result = forceDirectedLayout(nodes, edges, {
      repulsion: 300,
      attraction: 0.02,
      damping: 0.8,
      maxIterations: 200,
    })
    expect(result.nodes).toHaveLength(2)
  })
})

describe('统一布局入口', () => {
  test('调用分层布局', () => {
    const nodes = [
      { id: 'A', width: 120, height: 60 },
      { id: 'B', width: 120, height: 60 },
    ]
    const edges = [{ from: 'A', to: 'B' }]
    const result = runLayout('sugiyama', nodes, edges)
    expect(result).toBeDefined()
    expect(result.nodes).toHaveLength(2)
  })

  test('调用力导向布局', () => {
    const nodes = [
      { id: 'A', width: 120, height: 60 },
      { id: 'B', width: 120, height: 60 },
    ]
    const edges = [{ from: 'A', to: 'B' }]
    const result = runLayout('force_directed', nodes, edges)
    expect(result).toBeDefined()
    expect(result.nodes).toHaveLength(2)
  })

  test('未知算法默认使用力导向', () => {
    const nodes = [{ id: 'A', width: 120, height: 60 }]
    const result = runLayout('unknown', nodes, [])
    expect(result).toBeDefined()
  })
})

describe('图边界计算', () => {
  test('空图边界', () => {
    const bounds = getGraphBounds([])
    expect(bounds.minX).toBe(0)
    expect(bounds.maxX).toBe(0)
    expect(bounds.minY).toBe(0)
    expect(bounds.maxY).toBe(0)
    expect(bounds.width).toBe(0)
    expect(bounds.height).toBe(0)
  })

  test('单个节点边界', () => {
    const nodes = [{ id: 'A', x: 100, y: 100, width: 120, height: 60 }]
    const bounds = getGraphBounds(nodes)
    expect(bounds.minX).toBe(40)
    expect(bounds.maxX).toBe(160)
    expect(bounds.minY).toBe(70)
    expect(bounds.maxY).toBe(130)
    expect(bounds.width).toBe(120)
    expect(bounds.height).toBe(60)
  })

  test('多个节点边界', () => {
    const nodes = [
      { id: 'A', x: 0, y: 0, width: 100, height: 100 },
      { id: 'B', x: 200, y: 200, width: 100, height: 100 },
    ]
    const bounds = getGraphBounds(nodes)
    expect(bounds.minX).toBe(-50)
    expect(bounds.maxX).toBe(250)
    expect(bounds.minY).toBe(-50)
    expect(bounds.maxY).toBe(250)
    expect(bounds.width).toBe(300)
    expect(bounds.height).toBe(300)
  })
})

describe('视图适配计算', () => {
  test('空图适配', () => {
    const result = fitView([], 800, 600)
    expect(result.zoom).toBe(1)
    expect(result.panX).toBe(400)
    expect(result.panY).toBe(300)
  })

  test('单个节点居中适配', () => {
    const nodes = [{ id: 'A', x: 0, y: 0, width: 120, height: 60 }]
    const result = fitView(nodes, 800, 600)
    expect(result.zoom).toBeGreaterThan(0)
    expect(result.zoom).toBeLessThanOrEqual(3)
  })

  test('大图缩小适配', () => {
    const nodes = [
      { id: 'A', x: -500, y: -500, width: 100, height: 100 },
      { id: 'B', x: 500, y: 500, width: 100, height: 100 },
    ]
    const result = fitView(nodes, 800, 600)
    expect(result.zoom).toBeLessThan(1)
  })

  test('带内边距的适配', () => {
    const nodes = [
      { id: 'A', x: 0, y: 0, width: 100, height: 100 },
    ]
    const result = fitView(nodes, 800, 600, 100)
    expect(result.zoom).toBeGreaterThan(0)
  })

  test('缩放上限不超过3', () => {
    const nodes = [{ id: 'A', x: 0, y: 0, width: 10, height: 10 }]
    const result = fitView(nodes, 800, 600)
    expect(result.zoom).toBeLessThanOrEqual(3)
  })
})
