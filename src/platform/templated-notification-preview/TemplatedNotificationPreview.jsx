import React, { useState, useEffect, useCallback } from 'react'
import { compileTemplate, SAMPLE_SCENARIOS, benchmarkTemplate } from './logic'
import { VariablePanel } from './VariablePanel'
import { PreviewPanel } from './PreviewPanel'
import './TemplatedNotificationPreview.css'

export function TemplatedNotificationPreview() {
  const [template, setTemplate] = useState(SAMPLE_SCENARIOS.orderNotification.template)
  const [context, setContext] = useState(SAMPLE_SCENARIOS.orderNotification.context)
  const [output, setOutput] = useState('')
  const [warnings, setWarnings] = useState([])
  const [error, setError] = useState(null)
  const [benchmarkResult, setBenchmarkResult] = useState(null)
  const [isBenchmarking, setIsBenchmarking] = useState(false)

  const compile = useCallback(() => {
    const result = compileTemplate(template, context)
    if (result.success) {
      setOutput(result.output)
      setWarnings(result.warnings)
      setError(null)
    } else {
      setOutput('')
      setWarnings([])
      setError(result.error)
    }
  }, [template, context])

  useEffect(() => {
    compile()
  }, [compile])

  const loadSample = (sampleKey) => {
    const sample = SAMPLE_SCENARIOS[sampleKey]
    if (sample) {
      setTemplate(sample.template)
      setContext(sample.context)
    }
  }

  const handleBenchmark = async () => {
    setIsBenchmarking(true)
    try {
      const result = await benchmarkTemplate(template, context, 100)
      setBenchmarkResult(result)
    } finally {
      setIsBenchmarking(false)
    }
  }

  return (
    <div className="templated-notification-preview">
      <div className="main-toolbar">
        <h2>模板通知预览器</h2>
        <div className="toolbar-spacer" />
        <div className="sample-selector">
          <button className="sample-btn" onClick={() => loadSample('orderNotification')}>
            订单通知
          </button>
          <button className="sample-btn" onClick={() => loadSample('passwordReset')}>
            密码重置
          </button>
          <button className="sample-btn" onClick={() => loadSample('billingSummary')}>
            账单摘要
          </button>
        </div>
        <button
          className="benchmark-btn"
          onClick={handleBenchmark}
          disabled={isBenchmarking}
        >
          {isBenchmarking ? (
            <>
              <span className="loading-spinner" />
              性能测试中...
            </>
          ) : (
            '性能测试'
          )}
        </button>
      </div>

      <div className="main-content">
        <div className="left-panel">
          <VariablePanel
            context={context}
            onChange={setContext}
            warnings={warnings}
          />
        </div>

        <div className="center-panel">
          <div className="template-editor">
            <div className="panel-header">
              <h3>模板编辑</h3>
            </div>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="在此输入模板，支持 {{variable}}, {{#if condition}}, {{#each list}} 等语法..."
              spellCheck={false}
            />
          </div>
        </div>

        <div className="right-panel">
          <PreviewPanel output={output} error={error} />
        </div>
      </div>

      {benchmarkResult && (
        <div className="benchmark-panel">
          <div className="benchmark-header">
            <h4>性能测试结果</h4>
            <button
              className="benchmark-close"
              onClick={() => setBenchmarkResult(null)}
            >
              ×
            </button>
          </div>
          <div className="benchmark-results">
            <div className="benchmark-item">
              <div className="benchmark-label">总耗时</div>
              <div className="benchmark-value">{benchmarkResult.totalTime} ms</div>
            </div>
            <div className="benchmark-item">
              <div className="benchmark-label">平均耗时</div>
              <div className="benchmark-value">{benchmarkResult.avgTime} ms</div>
            </div>
            <div className="benchmark-item">
              <div className="benchmark-label">模板大小</div>
              <div className="benchmark-value">{benchmarkResult.templateSize} B</div>
            </div>
            <div className="benchmark-item">
              <div className="benchmark-label">吞吐量</div>
              <div className="benchmark-value">{benchmarkResult.opsPerSecond}/s</div>
            </div>
          </div>
          <div className="benchmark-note">
            测试基于 {benchmarkResult.iterations} 次渲染循环，包含分词、解析和渲染全过程。
            时间复杂度为 O(n)，其中 n 为模板长度。
          </div>
        </div>
      )}
    </div>
  )
}

export default TemplatedNotificationPreview
