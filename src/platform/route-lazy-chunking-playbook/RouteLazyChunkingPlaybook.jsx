import React, { useState, useEffect, useCallback, useRef } from 'react'
import { toolRouteManifest, mockBuildStats, syncBundleStats } from './toolRouteManifest'
import { buildChunkGraph, selectPreloadCandidates, withRetry, PRELOAD_PRIORITY, ANNOUNCER_MESSAGES } from './logic'
import { LazyRouteErrorBoundary } from './LazyRouteErrorBoundary'
import { LoadingFallback } from './LoadingFallback'
import { useAnnouncer } from './Announcer'
import { usePreload } from './usePreload'

function WaterfallChart({ data, title }) {
  const maxEnd = Math.max(...data.map((d) => d.end))

  return (
    <div style={{ marginBottom: '24px' }}>
      <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#495057' }}>{title}</h4>
      <div style={{
        background: '#f8f9fa',
        borderRadius: '8px',
        padding: '16px',
        position: 'relative',
      }}>
        {data.map((item, index) => (
          <div key={item.id} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px',
            height: '24px',
          }}>
            <span style={{
              width: '100px',
              fontSize: '12px',
              color: '#6c757d',
              flexShrink: 0,
            }}>
              {item.label}
            </span>
            <div style={{
              flex: 1,
              position: 'relative',
              height: '20px',
              background: '#e9ecef',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                left: `${(item.start / maxEnd) * 100}%`,
                width: `${((item.end - item.start) / maxEnd) * 100}%`,
                height: '100%',
                background: item.color || '#228be6',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: 'white',
                fontWeight: 'bold',
              }}>
                {item.size}KB
              </div>
            </div>
            <span style={{
              width: '60px',
              textAlign: 'right',
              fontSize: '11px',
              color: '#868e96',
              marginLeft: '8px',
            }}>
              {item.end}ms
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SizeComparisonTable({ syncStats, dynamicStats }) {
  return (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px',
    }}>
      <thead>
        <tr style={{ background: '#f1f3f5' }}>
          <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>打包方式</th>
          <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>初始加载体积</th>
          <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>Chunks 数量</th>
          <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>首屏节省</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
            <strong>同步打包</strong>
          </td>
          <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
            {syncStats.totalSize} KB
          </td>
          <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
            {syncStats.chunks.length}
          </td>
          <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
            -
          </td>
        </tr>
        <tr style={{ background: '#f8f9fa' }}>
          <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
            <strong style={{ color: '#2f9e44' }}>动态 import</strong>
          </td>
          <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
            ~120 KB (shared-ui)
          </td>
          <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
            {dynamicStats.chunks.length}
          </td>
          <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6', color: '#2f9e44', fontWeight: 'bold' }}>
            ~76%
          </td>
        </tr>
      </tbody>
    </table>
  )
}

function ChunkGraphVisualization({ graph }) {
  const typeColors = {
    mutex: '#f59f00',
    shared: '#228be6',
    vendor: '#868e96',
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      padding: '16px',
      background: '#f8f9fa',
      borderRadius: '8px',
    }}>
      {graph.nodes.map((node) => (
        <div key={node.id} style={{
          padding: '8px 16px',
          background: typeColors[node.type] || '#dee2e6',
          color: 'white',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '500',
        }}>
          {node.id} ({node.size}KB)
          <span style={{
            marginLeft: '8px',
            padding: '2px 6px',
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '10px',
            fontSize: '10px',
          }}>
            {node.type}
          </span>
        </div>
      ))}
    </div>
  )
}

function LazyLoadedTool({ tool, onLoad }) {
  const [Component, setComponent] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0)

  useEffect(() => {
    let isMounted = true
    const startTime = performance.now()

    setIsLoading(true)

    withRetry(() => tool.loader(), { maxRetries: 3 })
      .then((module) => {
        if (isMounted) {
          const loadTime = performance.now() - startTime
          setComponent(() => module.default || module[Object.keys(module)[0]])
          setIsLoading(false)
          onLoad?.({ toolId: tool.id, loadTime, success: true })
        }
      })
      .catch((error) => {
        if (isMounted) {
          setIsLoading(false)
          onLoad?.({ toolId: tool.id, error, success: false })
        }
      })

    return () => {
      isMounted = false
    }
  }, [tool, errorBoundaryKey])

  const handleRetry = () => {
    setErrorBoundaryKey((k) => k + 1)
  }

  return (
    <LazyRouteErrorBoundary key={errorBoundaryKey} onRetry={handleRetry} maxRetries={3}>
      {isLoading ? (
        <LoadingFallback toolName={tool.title} size="large" />
      ) : Component ? (
        <Component />
      ) : null}
    </LazyRouteErrorBoundary>
  )
}

export function RouteLazyChunkingPlaybook() {
  const [activeTool, setActiveTool] = useState(null)
  const [navHistory, setNavHistory] = useState([])
  const [loadEvents, setLoadEvents] = useState([])
  const [activeTab, setActiveTab] = useState('demo')
  const { announce, AnnouncerComponent } = useAnnouncer()
  const { createPreloadHandlers, isPreloaded } = usePreload(toolRouteManifest, {
    strategy: 'idle-callback',
  })

  const chunkGraph = buildChunkGraph(toolRouteManifest)
  const preloadCandidates = selectPreloadCandidates(navHistory, { maxCandidates: 3 })

  const handleToolSelect = useCallback((toolId) => {
    const tool = toolRouteManifest[toolId]
    if (tool) {
      announce(ANNOUNCER_MESSAGES.LOADING(tool.title))
      setActiveTool(toolId)
      setNavHistory((prev) => [
        { toolId, timestamp: Date.now(), frequency: (prev.find((p) => p.toolId === toolId)?.frequency || 0) + 1 },
        ...prev,
      ])
    }
  }, [announce])

  const handleToolLoad = useCallback(({ toolId, loadTime, success }) => {
    const tool = toolRouteManifest[toolId]
    if (success) {
      announce(ANNOUNCER_MESSAGES.LOADED(tool.title))
    } else {
      announce(ANNOUNCER_MESSAGES.ERROR(tool.title))
    }
    setLoadEvents((prev) => [...prev, { toolId, loadTime, success, timestamp: Date.now() }])
  }, [announce])

  const syncWaterfallData = [
    { id: 'main', label: 'main-bundle', start: 0, end: 800, size: 505, color: '#868e96' },
  ]

  const dynamicWaterfallData = [
    { id: 'shared-ui', label: 'shared-ui', start: 0, end: 200, size: 120, color: '#228be6' },
    { id: 'tool-a', label: 'tool-a', start: 200, end: 320, size: 45, color: '#f59f00' },
    { id: 'shared-charts', label: 'shared-charts', start: 200, end: 380, size: 85, color: '#228be6' },
    { id: 'tool-b', label: 'tool-b', start: 400, end: 500, size: 38, color: '#f59f00' },
    { id: 'shared-export', label: 'shared-export', start: 400, end: 480, size: 40, color: '#228be6' },
  ]

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <AnnouncerComponent />

      <h1 style={{
        fontSize: '28px',
        fontWeight: '700',
        color: '#212529',
        margin: '0 0 8px',
      }}>
        按工具拆分路由 - 可落地方案
      </h1>
      <p style={{
        fontSize: '14px',
        color: '#6c757d',
        margin: '0 0 24px',
      }}>
        本 Playground 演示了动态 import + React.lazy + Error Boundary 的完整懒加载路由方案
      </p>

      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid #dee2e6',
        paddingBottom: '8px',
      }}>
        {['demo', 'comparison', 'graph', 'preload'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: activeTab === tab ? '#228be6' : 'transparent',
              color: activeTab === tab ? 'white' : '#495057',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? '600' : '400',
            }}
          >
            {tab === 'demo' && '实时演示'}
            {tab === 'comparison' && '体积对比'}
            {tab === 'graph' && 'Chunk 依赖图'}
            {tab === 'preload' && '预加载策略'}
          </button>
        ))}
      </div>

      {activeTab === 'demo' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
          <div>
            <h3 style={{ fontSize: '16px', margin: '0 0 16px', color: '#343a40' }}>工具列表</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.values(toolRouteManifest).map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool.id)}
                  {...createPreloadHandlers(tool.id)}
                  style={{
                    padding: '12px 16px',
                    border: '2px solid',
                    borderColor: activeTool === tool.id ? '#228be6' : '#dee2e6',
                    background: activeTool === tool.id ? '#e7f5ff' : 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    fontWeight: '600',
                    color: '#343a40',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    {tool.title}
                    {isPreloaded(tool.id) && (
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        background: '#d3f9d8',
                        color: '#2b8a3e',
                        borderRadius: '10px',
                      }}>
                        已预加载
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    {tool.description}
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    marginTop: '8px',
                  }}>
                    {tool.sharedChunks.map((chunk) => (
                      <span key={chunk} style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        background: '#f1f3f5',
                        color: '#495057',
                        borderRadius: '10px',
                      }}>
                        {chunk}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            {loadEvents.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ fontSize: '14px', margin: '0 0 12px', color: '#495057' }}>加载日志</h4>
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  padding: '12px',
                }}>
                  {loadEvents.slice().reverse().map((event, i) => (
                    <div key={i} style={{
                      fontSize: '12px',
                      padding: '4px 0',
                      borderBottom: '1px solid #e9ecef',
                      color: event.success ? '#2b8a3e' : '#c92a2a',
                    }}>
                      [{new Date(event.timestamp).toLocaleTimeString()}] {event.toolId}:
                      {event.success ? ` 加载完成 (${Math.round(event.loadTime)}ms)` : ' 加载失败'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '16px', margin: '0 0 16px', color: '#343a40' }}>
              {activeTool ? toolRouteManifest[activeTool]?.title : '请选择一个工具'}
            </h3>
            {activeTool ? (
              <LazyLoadedTool
                tool={toolRouteManifest[activeTool]}
                onLoad={handleToolLoad}
              />
            ) : (
              <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                color: '#868e96',
                border: '2px dashed #dee2e6',
                borderRadius: '8px',
              }}>
                点击左侧工具按钮体验动态加载
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div>
          <h3 style={{ fontSize: '18px', margin: '0 0 24px', color: '#343a40' }}>
            同步打包 vs 动态 import 体积对比
          </h3>
          <div style={{ marginBottom: '32px' }}>
            <SizeComparisonTable syncStats={syncBundleStats} dynamicStats={mockBuildStats} />
          </div>

          <h4 style={{ fontSize: '16px', margin: '0 0 16px', color: '#495057' }}>加载瀑布模拟</h4>
          <WaterfallChart data={syncWaterfallData} title="同步打包 - 单 Bundle 加载" />
          <WaterfallChart data={dynamicWaterfallData} title="动态 import - 并行 Chunk 加载" />

          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: '#fff9db',
            borderLeft: '4px solid #f59f00',
            borderRadius: '4px',
          }}>
            <h4 style={{ margin: '0 0 8px', color: '#e67700', fontSize: '14px' }}>💡 关键优化点</h4>
            <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '13px', color: '#5c4b00' }}>
              <li>首屏只加载 shared-ui，初始体积从 505KB 降至 ~120KB，节省 76%</li>
              <li>工具 Chunk 按需加载，互斥 Chunk 之间不会重复加载</li>
              <li>共享依赖自动提升，不会重复打包 shared-* 模块</li>
              <li>利用浏览器并行加载，整体加载时间更短</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'graph' && (
        <div>
          <h3 style={{ fontSize: '18px', margin: '0 0 24px', color: '#343a40' }}>
            Chunk 依赖关系图
          </h3>

          <ChunkGraphVisualization graph={chunkGraph} />

          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontSize: '16px', margin: '0 0 12px', color: '#495057' }}>依赖边列表</h4>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
            }}>
              <thead>
                <tr style={{ background: '#f1f3f5' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #dee2e6' }}>From</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #dee2e6' }}>To</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #dee2e6' }}>类型</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #dee2e6' }}>说明</th>
                </tr>
              </thead>
              <tbody>
                {chunkGraph.edges.map((edge, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px 12px', border: '1px solid #dee2e6' }}>{edge.from}</td>
                    <td style={{ padding: '8px 12px', border: '1px solid #dee2e6' }}>{edge.to}</td>
                    <td style={{ padding: '8px 12px', border: '1px solid #dee2e6' }}>{edge.type}</td>
                    <td style={{ padding: '8px 12px', border: '1px solid #dee2e6' }}>
                      {edge.type === 'dependency' ? '工具依赖共享模块' : `共享重叠 (${edge.overlapCount} 个工具)`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'preload' && (
        <div>
          <h3 style={{ fontSize: '18px', margin: '0 0 24px', color: '#343a40' }}>
            预加载策略配置
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            marginBottom: '24px',
          }}>
            <div style={{
              padding: '16px',
              background: '#f8f9fa',
              borderRadius: '8px',
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#343a40' }}>触发时机</h4>
              <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '13px', color: '#495057' }}>
                <li><strong>hover:</strong> 鼠标悬停时预加载</li>
                <li><strong>focus:</strong> 键盘聚焦时预加载</li>
                <li><strong>nav history:</strong> 根据浏览历史智能预取</li>
              </ul>
            </div>

            <div style={{
              padding: '16px',
              background: '#f8f9fa',
              borderRadius: '8px',
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#343a40' }}>调度策略</h4>
              <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '13px', color: '#495057' }}>
                <li><strong>requestIdleCallback:</strong> 浏览器空闲时执行（推荐）</li>
                <li><strong>setTimeout:</strong> 延迟执行（降级方案）</li>
                <li><strong>优先级队列:</strong> 按 PRELOAD_PRIORITY 排序执行</li>
              </ul>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '14px', margin: '0 0 12px', color: '#495057' }}>
              当前预加载候选（基于浏览历史）
            </h4>
            {preloadCandidates.length > 0 ? (
              <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
              }}>
                {preloadCandidates.map((candidate) => (
                  <div key={candidate.toolId} style={{
                    padding: '12px 16px',
                    background: '#e7f5ff',
                    border: '1px solid #74c0fc',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}>
                    <div style={{ fontWeight: '600', color: '#1864ab', marginBottom: '4px' }}>
                      {toolRouteManifest[candidate.toolId]?.title}
                    </div>
                    <div style={{ color: '#495057' }}>
                      得分: {candidate.score.toFixed(2)} |
                      优先级: {Object.keys(PRELOAD_PRIORITY).find(
                        (k) => PRELOAD_PRIORITY[k] === candidate.priority
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#868e96' }}>
                请先在「实时演示」标签页浏览几个工具，然后回来查看智能预取结果
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default RouteLazyChunkingPlaybook
