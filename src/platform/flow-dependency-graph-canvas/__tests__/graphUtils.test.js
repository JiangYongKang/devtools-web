import { describe, expect, test } from 'vitest'
import {
    detectCycle,
    findIsolatedNodes,
    lineIntersectsRect,
    lineSegmentsIntersect,
    pointInRect,
    routeOrthogonalEdge,
    topologicalSort,
    topologicalSortLayers,
} from '../logic/graphUtils.js'

describe('环检测 (detectCycle)', () => {
  test('空图无环', () => {
    const result = detectCycle([], [])
    expect(result.hasCycle).toBe(false)
    expect(result.cycle).toBeNull()
  })

  test('简单DAG无环', () => {
    const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }]
    const edges = [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ]
    const result = detectCycle(nodes, edges)
    expect(result.hasCycle).toBe(false)
  })

  test('检测到简单环', () => {
    const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }]
    const edges = [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'A' },
    ]
    const result = detectCycle(nodes, edges)
    expect(result.hasCycle).toBe(true)
    expect(result.cycle).toBeDefined()
    expect(result.cycle).toContain('A')
    expect(result.cycle).toContain('B')
    expect(result.cycle).toContain('C')
  })

  test('自环检测', () => {
    const nodes = [{ id: 'A' }, { id: 'B' }]
    const edges = [
      { from: 'A', to: 'A' },
      { from: 'A', to: 'B' },
    ]
    const result = detectCycle(nodes, edges)
    expect(result.hasCycle).toBe(true)
  })

  test('复杂DAG无环', () => {
    const nodes = [
      { id: 'A' }, { id: 'B' }, { id: 'C' },
      { id: 'D' }, { id: 'E' }, { id: 'F' },
    ]
    const edges = [
      { from: 'A', to: 'B' },
      { from: 'A', to: 'C' },
      { from: 'B', to: 'D' },
      { from: 'B', to: 'E' },
      { from: 'C', to: 'E' },
      { from: 'D', to: 'F' },
      { from: 'E', to: 'F' },
    ]
    const result = detectCycle(nodes, edges)
    expect(result.hasCycle).toBe(false)
  })
})

describe('拓扑排序 (topologicalSort)', () => {
  test('空图排序', () => {
    const result = topologicalSort([], [])
    expect(result).toEqual([])
  })

  test('孤立节点排序', () => {
    const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }]
    const result = topologicalSort(nodes, [])
    expect(result).toHaveLength(3)
  })

  test('简单链排序', () => {
    const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }]
    const edges = [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ]
    const result = topologicalSort(nodes, edges)
    expect(result.indexOf('A')).toBeLessThan(result.indexOf('B'))
    expect(result.indexOf('B')).toBeLessThan(result.indexOf('C'))
  })
})

describe('拓扑分层 (topologicalSortLayers)', () => {
  test('简单链分层', () => {
    const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }]
    const edges = [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ]
    const layers = topologicalSortLayers(nodes, edges)
    expect(layers).toHaveLength(3)
    expect(layers[0]).toContain('A')
    expect(layers[1]).toContain('B')
    expect(layers[2]).toContain('C')
  })

  test('扇入扇出分层', () => {
    const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }]
    const edges = [
      { from: 'A', to: 'C' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'D' },
    ]
    const layers = topologicalSortLayers(nodes, edges)
    expect(layers[0]).toContain('A')
    expect(layers[0]).toContain('B')
    expect(layers[1]).toContain('C')
    expect(layers[2]).toContain('D')
  })

  test('同层节点约束', () => {
    const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }]
    const edges = [
      { from: 'A', to: 'C' },
      { from: 'B', to: 'D' },
    ]
    const layers = topologicalSortLayers(nodes, edges, {
      sameLayerNodes: [['C', 'D']],
    })
    const cLayer = layers.findIndex(l => l.includes('C'))
    const dLayer = layers.findIndex(l => l.includes('D'))
    expect(cLayer).toBe(dLayer)
  })
})

describe('正交边路由 (routeOrthogonalEdge)', () => {
  test('水平方向边', () => {
    const a = { x: 0, y: 0 }
    const b = { x: 100, y: 0 }
    const path = routeOrthogonalEdge(a, b, [])
    expect(path).toBeDefined()
    expect(Array.isArray(path)).toBe(true)
    expect(path.length).toBeGreaterThan(0)
  })

  test('垂直方向边', () => {
    const a = { x: 0, y: 0 }
    const b = { x: 0, y: 100 }
    const path = routeOrthogonalEdge(a, b, [])
    expect(path).toBeDefined()
    expect(Array.isArray(path)).toBe(true)
    expect(path.length).toBeGreaterThan(0)
  })

  test('对角线边', () => {
    const a = { x: 0, y: 0 }
    const b = { x: 100, y: 100 }
    const path = routeOrthogonalEdge(a, b, [])
    expect(path).toBeDefined()
    expect(Array.isArray(path)).toBe(true)
    expect(path.length).toBeGreaterThan(0)
  })

  test('绕过障碍物', () => {
    const a = { x: 0, y: 0 }
    const b = { x: 200, y: 200 }
    const obstacles = [
      { x: 80, y: 80, width: 40, height: 40 },
    ]
    const path = routeOrthogonalEdge(a, b, obstacles)
    expect(path).toBeDefined()
    expect(Array.isArray(path)).toBe(true)
    expect(path.length).toBeGreaterThan(0)
  })

  test('同点返回简单路径', () => {
    const a = { x: 50, y: 50 }
    const path = routeOrthogonalEdge(a, a, [])
    expect(path).toBeDefined()
    expect(Array.isArray(path)).toBe(true)
    expect(path[0].x).toBe(a.x)
    expect(path[0].y).toBe(a.y)
  })
})

describe('孤立节点检测 (findIsolatedNodes)', () => {
  test('全连接图无孤立节点', () => {
    const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }]
    const edges = [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ]
    const isolated = findIsolatedNodes(nodes, edges)
    expect(isolated).toHaveLength(0)
  })

  test('检测到孤立节点', () => {
    const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }]
    const edges = [
      { from: 'A', to: 'B' },
    ]
    const isolated = findIsolatedNodes(nodes, edges)
    expect(isolated).toContain('C')
    expect(isolated).toContain('D')
    expect(isolated).not.toContain('A')
    expect(isolated).not.toContain('B')
  })

  test('空图无孤立节点', () => {
    const isolated = findIsolatedNodes([], [])
    expect(isolated).toHaveLength(0)
  })
})

describe('几何工具函数', () => {
  test('点在矩形内', () => {
    const point = { x: 50, y: 50 }
    const rect = { x: 0, y: 0, width: 100, height: 100 }
    expect(pointInRect(point, rect)).toBe(true)
  })

  test('点在矩形外', () => {
    const point = { x: 150, y: 50 }
    const rect = { x: 0, y: 0, width: 100, height: 100 }
    expect(pointInRect(point, rect)).toBe(false)
  })

  test('点在矩形边界上', () => {
    const point = { x: 0, y: 0 }
    const rect = { x: 0, y: 0, width: 100, height: 100 }
    expect(pointInRect(point, rect)).toBe(true)
  })

  test('线段与矩形相交 - 穿过中心', () => {
    const p1 = { x: -50, y: 50 }
    const p2 = { x: 150, y: 50 }
    const rect = { x: 0, y: 0, width: 100, height: 100 }
    expect(lineIntersectsRect(p1, p2, rect)).toBe(true)
  })

  test('线段与矩形不相交', () => {
    const p1 = { x: -50, y: -50 }
    const p2 = { x: -10, y: -10 }
    const rect = { x: 0, y: 0, width: 100, height: 100 }
    expect(lineIntersectsRect(p1, p2, rect)).toBe(false)
  })

  test('线段完全在矩形内', () => {
    const p1 = { x: 10, y: 10 }
    const p2 = { x: 90, y: 90 }
    const rect = { x: 0, y: 0, width: 100, height: 100 }
    expect(lineIntersectsRect(p1, p2, rect)).toBe(true)
  })

  test('两线段相交', () => {
    const p1 = { x: 0, y: 0 }
    const p2 = { x: 100, y: 100 }
    const p3 = { x: 0, y: 100 }
    const p4 = { x: 100, y: 0 }
    expect(lineSegmentsIntersect(p1, p2, p3, p4)).toBe(true)
  })

  test('两线段不相交', () => {
    const p1 = { x: 0, y: 0 }
    const p2 = { x: 50, y: 50 }
    const p3 = { x: 60, y: 60 }
    const p4 = { x: 100, y: 100 }
    expect(lineSegmentsIntersect(p1, p2, p3, p4)).toBe(false)
  })

  test('两线段端点接触', () => {
    const p1 = { x: 0, y: 0 }
    const p2 = { x: 50, y: 50 }
    const p3 = { x: 50, y: 50 }
    const p4 = { x: 100, y: 100 }
    expect(lineSegmentsIntersect(p1, p2, p3, p4)).toBe(true)
  })
})
