import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  planChunkedDownload,
  createDownloadExecutor,
  formatBytes,
  formatETA,
  detectBrowserType,
  getBrowserCompatibility,
  BROWSER_COMPATIBILITY_TABLE,
  ERROR_CODES,
  DOWNLOAD_MODES,
  SOURCE_TYPES,
} from './logic/index.js'

const TEST_PATTERNS = {
  text: 'Hello, World! 这是一个测试文本。',
  json: '{"name":"test","value":123}',
  csv: 'id,name,value\n1,test,123\n2,demo,456',
}

const SOURCE_TYPE_LABELS = {
  [SOURCE_TYPES.STRING]: '字符串 (String)',
  [SOURCE_TYPES.BLOB]: 'Blob 对象',
  [SOURCE_TYPES.READABLE_STREAM]: '可读流 (ReadableStream)',
  [SOURCE_TYPES.UINT8_ARRAY]: 'Uint8Array 数组',
}

export default function ChunkedDownloadOrchestratorDemo() {
  const [config, setConfig] = useState({
    fileSizeMB: 5,
    chunkSizeKB: 256,
    filename: 'test_export.txt',
    mimeType: 'text/plain;charset=utf-8',
    pattern: 'text',
    simulateDelayMs: 100,
    maxTotalBytes: 100 * 1024 * 1024,
    sourceType: SOURCE_TYPES.STRING,
  })

  const [progress, setProgress] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [downloadResult, setDownloadResult] = useState(null)
  const [showBrowserInfo, setShowBrowserInfo] = useState(false)

  const downloadPlanRef = useRef(null)
  const executorRef = useRef(null)

  const browserType = detectBrowserType()
  const browserCompat = getBrowserCompatibility()

  const generateTestData = useCallback(() => {
    const totalBytes = config.fileSizeMB * 1024 * 1024
    const pattern = TEST_PATTERNS[config.pattern] || TEST_PATTERNS.text
    const repeated = pattern.repeat(Math.ceil(totalBytes / pattern.length))
    return repeated.slice(0, totalBytes)
  }, [config.fileSizeMB, config.pattern])

  const createSourceByType = useCallback((textData, sourceType, mimeType) => {
    switch (sourceType) {
      case SOURCE_TYPES.STRING:
        return textData
      case SOURCE_TYPES.BLOB:
        return new Blob([textData], { type: mimeType })
      case SOURCE_TYPES.UINT8_ARRAY:
        return new TextEncoder().encode(textData)
      case SOURCE_TYPES.READABLE_STREAM:
        return new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder()
            const chunkSize = 64 * 1024
            let offset = 0
            const totalLength = textData.length

            const pushNextChunk = () => {
              if (offset >= totalLength) {
                controller.close()
                return
              }
              const end = Math.min(offset + chunkSize, totalLength)
              const chunk = encoder.encode(textData.slice(offset, end))
              controller.enqueue(chunk)
              offset = end
              setTimeout(pushNextChunk, 10)
            }
            pushNextChunk()
          },
        })
      default:
        return textData
    }
  }, [])

  const handleStartDownload = useCallback(async () => {
    try {
      setStatus('running')
      setError(null)
      setDownloadResult(null)

      const textData = generateTestData()
      const sourceData = createSourceByType(textData, config.sourceType, config.mimeType)

      const downloadPlan = planChunkedDownload(sourceData, {
        chunkSize: config.chunkSizeKB * 1024,
        maxTotalBytes: config.maxTotalBytes,
        filename: config.filename,
        mimeType: config.mimeType,
        simulateDelayMs: config.simulateDelayMs,
        onProgress: (p) => setProgress(p),
      })

      downloadPlanRef.current = downloadPlan

      const executor = createDownloadExecutor({
        onProgress: (p) => setProgress(p),
        onComplete: (result) => {
          setStatus('completed')
          setDownloadResult(result)
        },
        onError: (err) => {
          setStatus('error')
          setError(err)
        },
        onCancel: () => {
          setStatus('cancelled')
        },
      })

      executorRef.current = executor

      await executor.execute(downloadPlan)
    } catch (err) {
      setStatus('error')
      setError(err)
    }
  }, [config, generateTestData])

  const handleCancel = useCallback(() => {
    if (downloadPlanRef.current) {
      downloadPlanRef.current.cancel()
    }
  }, [])

  const handleReset = useCallback(() => {
    setStatus('idle')
    setProgress(null)
    setError(null)
    setDownloadResult(null)
    downloadPlanRef.current = null
    executorRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      if (downloadPlanRef.current) {
        downloadPlanRef.current.cancel()
        downloadPlanRef.current.revokeObjectUrl()
      }
      if (executorRef.current) {
        executorRef.current.cleanup()
      }
    }
  }, [])

  const getStatusColor = () => {
    switch (status) {
      case 'running': return '#2563eb'
      case 'completed': return '#16a34a'
      case 'cancelled': return '#f59e0b'
      case 'error': return '#dc2626'
      default: return '#6b7280'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'running': return '下载中...'
      case 'completed': return '已完成'
      case 'cancelled': return '已取消'
      case 'error': return '出错'
      default: return '就绪'
    }
  }

  return (
    <div style={{
      maxWidth: 900,
      margin: '0 auto',
      padding: 24,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <h1 style={{
        fontSize: 28,
        fontWeight: 700,
        marginBottom: 8,
        color: '#111827',
      }}>
        分块下载编排器 Demo
      </h1>
      <p style={{ color: '#6b7280', marginBottom: 32 }}>
        支持 Blob/ReadableStream/string 多源统一，按字节窗口分块下载
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        marginBottom: 32,
      }}>
        <div style={{
          background: '#f9fafb',
          borderRadius: 12,
          padding: 20,
          border: '1px solid #e5e7eb',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#111827' }}>
            配置选项
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
                文件大小 (MB)
              </label>
              <input
                type="number"
                value={config.fileSizeMB}
                onChange={(e) => setConfig({ ...config, fileSizeMB: Number(e.target.value) })}
                min={1}
                max={100}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
                分块大小 (KB)
              </label>
              <input
                type="number"
                value={config.chunkSizeKB}
                onChange={(e) => setConfig({ ...config, chunkSizeKB: Number(e.target.value) })}
                min={64}
                max={4096}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
                文件名
              </label>
              <input
                type="text"
                value={config.filename}
                onChange={(e) => setConfig({ ...config, filename: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
                MIME 类型
              </label>
              <select
                value={config.mimeType}
                onChange={(e) => setConfig({ ...config, mimeType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                }}
              >
                <option value="text/plain;charset=utf-8">Plain Text</option>
                <option value="text/csv;charset=utf-8">CSV</option>
                <option value="application/json">JSON</option>
                <option value="text/html;charset=utf-8">HTML</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
                模拟延迟 (ms)
              </label>
              <input
                type="number"
                value={config.simulateDelayMs}
                onChange={(e) => setConfig({ ...config, simulateDelayMs: Number(e.target.value) })}
                min={0}
                max={2000}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
                测试数据模式
              </label>
              <select
                value={config.pattern}
                onChange={(e) => setConfig({ ...config, pattern: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                }}
              >
                <option value="text">文本</option>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
                数据源类型
              </label>
              <select
                value={config.sourceType}
                onChange={(e) => setConfig({ ...config, sourceType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                }}
              >
                {Object.entries(SOURCE_TYPE_LABELS).map(([type, label]) => (
                  <option key={type} value={type}>{label}</option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                当前使用: {SOURCE_TYPE_LABELS[config.sourceType]}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: '#f9fafb',
          borderRadius: 12,
          padding: 20,
          border: '1px solid #e5e7eb',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#111827' }}>
            下载状态
          </h2>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20,
          }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: getStatusColor(),
            }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
              {getStatusText()}
            </span>
          </div>

          {progress && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                width: '100%',
                height: 8,
                background: '#e5e7eb',
                borderRadius: 4,
                overflow: 'hidden',
                marginBottom: 12,
              }}>
                <div
                  role="progressbar"
                  aria-valuenow={progress.percent || 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  style={{
                    height: '100%',
                    background: getStatusColor(),
                    width: `${progress.percent || 0}%`,
                    transition: 'width 0.1s ease-out',
                  }}
                />
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                fontSize: 13,
                color: '#4b5563',
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>已写入</div>
                  <div>{formatBytes(progress.writtenBytes || 0)}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}>总计</div>
                  <div>{progress.totalBytes ? formatBytes(progress.totalBytes) : '--'}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}>速度</div>
                  <div>{formatBytes(progress.speed || 0)}/s</div>
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}>预计剩余</div>
                  <div>{formatETA(progress.eta || 0)}</div>
                </div>
              </div>
            </div>
          )}

          {downloadResult && (
            <div style={{
              background: '#dcfce7',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              fontSize: 13,
              color: '#166534',
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>下载成功！</div>
              <div>分块数: {downloadResult.chunkCount}</div>
              <div>模式: {downloadResult.downloadResult?.mode || 'unknown'}</div>
            </div>
          )}

          {error && (
            <div style={{
              background: '#fee2e2',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              fontSize: 13,
              color: '#991b1b',
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {error.errorCode === ERROR_CODES.EXCEEDS_MAX_BYTES ? '超出大小限制' :
                 error.errorCode === ERROR_CODES.QUOTA_EXCEEDED ? '配额不足' :
                 error.errorCode === ERROR_CODES.USER_ABORTED ? '用户取消' : '错误'}
              </div>
              <div>{error.message || error.errorMessage || '未知错误'}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            {status === 'idle' && (
              <button
                onClick={handleStartDownload}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#2563eb',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                开始下载
              </button>
            )}

            {status === 'running' && (
              <button
                onClick={handleCancel}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 6,
                  border: '1px solid #dc2626',
                  background: 'white',
                  color: '#dc2626',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
            )}

            {(status === 'completed' || status === 'cancelled' || status === 'error') && (
              <button
                onClick={handleReset}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  background: 'white',
                  color: '#374151',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                重置
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{
        background: '#f9fafb',
        borderRadius: 12,
        padding: 20,
        border: '1px solid #e5e7eb',
        marginBottom: 24,
      }}>
        <button
          onClick={() => setShowBrowserInfo(!showBrowserInfo)}
          style={{
            width: '100%',
            textAlign: 'left',
            background: 'none',
            border: 'none',
            fontSize: 18,
            fontWeight: 600,
            color: '#111827',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>浏览器兼容性信息</span>
          <span style={{ fontSize: 14 }}>{showBrowserInfo ? '▼' : '▶'}</span>
        </button>

        {showBrowserInfo && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              background: 'white',
              borderRadius: 8,
              padding: 16,
              border: '1px solid #e5e7eb',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                当前浏览器: {browserType}
              </div>
              <div style={{ fontSize: 13, color: '#4b5563' }}>
                <div>Object URL: {browserCompat.objectUrl?.supported ? '✅ 支持' : '❌ 不支持'}</div>
                <div>Readable Stream: {browserCompat.readableStream?.supported ? '✅ 支持' : '❌ 不支持'}</div>
                <div>多 Blob 顺序下载: {browserCompat.multiBlobSequential?.supported ? '✅ 支持' : '❌ 不支持'}</div>
              </div>
              {browserCompat.objectUrl?.notes && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#f59e0b' }}>
                  ⚠️ {browserCompat.objectUrl.notes}
                </div>
              )}
            </div>

            <div style={{
              background: 'white',
              borderRadius: 8,
              padding: 16,
              border: '1px solid #e5e7eb',
              marginBottom: 16,
              overflowX: 'auto',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
                浏览器兼容性对照表
              </div>
              <table style={{
                width: '100%',
                fontSize: 12,
                borderCollapse: 'collapse',
              }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e5e7eb' }}>特性</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>Chrome/Edge</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>Safari</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>Firefox</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>其他</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 12px', fontWeight: 500, border: '1px solid #e5e7eb' }}>Object URL 合并</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>✅ 2GB+</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>⚠️ 500MB</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>✅ 800MB</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>✅ 500MB</td>
                  </tr>
                  <tr style={{ background: '#f9fafb' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500, border: '1px solid #e5e7eb' }}>ReadableStream</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>✅ 完全支持</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>✅ 14.1+</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>✅ 完全支持</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>✅ 基本支持</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 12px', fontWeight: 500, border: '1px solid #e5e7eb' }}>多 Blob 顺序下载</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>✅ 支持</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>⚠️ 可能拦截</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>✅ 支持</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>✅ 支持</td>
                  </tr>
                  <tr style={{ background: '#f9fafb' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500, border: '1px solid #e5e7eb' }}>StreamSaver 扩展</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>✅ 推荐</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>❌ 不稳定</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>❌ 支持有限</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>❌ 未检测</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 12px', fontWeight: 500, border: '1px solid #e5e7eb' }}>推荐分块大小</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>256KB - 1MB</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>128KB - 256KB</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>256KB - 512KB</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>128KB</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: 13, color: '#4b5563' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>可用下载模式优先级:</div>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                <li style={{ marginBottom: 4 }}><strong style={{ color: '#16a34a' }}>StreamSaver 风格</strong> (需引入第三方库): 流式写入文件系统，无内存限制，用户体验最佳</li>
                <li style={{ marginBottom: 4 }}><strong style={{ color: '#2563eb' }}>{DOWNLOAD_MODES.OBJECT_URL_MERGE}</strong> (首选): 合并为单个 Blob，浏览器限制 ~500MB-2GB</li>
                <li><strong style={{ color: '#f59e0b' }}>{DOWNLOAD_MODES.MULTI_BLOB_SEQUENTIAL}</strong> (降级方案): 每个分块单独下载，需手动合并</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      <div style={{
        background: '#dbeafe',
        borderRadius: 12,
        padding: 16,
        border: '1px solid #93c5fd',
        fontSize: 13,
        color: '#1e40af',
        marginBottom: 16,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>💡 StreamSaver 风格集成说明</div>
        <p style={{ margin: 0, marginBottom: 8 }}>
          本库预留了 StreamSaver.js 风格的流式下载接口，如需支持超大文件（>2GB）可手动集成：
        </p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li><strong>优势</strong>: 零内存占用、流式写入、支持超大文件、单文件输出</li>
          <li><strong>集成方式</strong>: 在 createDownloadTrigger 中扩展 streamSaver mode，调用 <code>streamSaver.createWriteStream()</code></li>
          <li><strong>注意</strong>: 需要引入第三方 streamSaver 库和 MITM 代理页面，有跨域限制</li>
        </ul>
      </div>

      <div style={{
        background: '#fef3c7',
        borderRadius: 12,
        padding: 16,
        border: '1px solid #fcd34d',
        fontSize: 13,
        color: '#92400e',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>⚠️ 降级方案说明</div>
        <p style={{ margin: 0 }}>
          当浏览器不支持 Object URL 合并大文件时，系统会自动降级为多 Blob 顺序下载模式。
          这会生成多个文件（如 <code>test_export.txt</code>, <code>test_export_part2.txt</code> 等），
          下载完成后需要手动合并。
        </p>
      </div>
    </div>
  )
}
