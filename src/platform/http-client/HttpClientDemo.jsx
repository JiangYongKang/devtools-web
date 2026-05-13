import { useCallback, useState } from 'react'
import './HttpClientDemo.css'
import {
    createRequestIdInterceptor,
    ERROR_CODES,
    HttpClient,
    PRESET_ENVIRONMENTS,
    QUERY_ARRAY_FORMATS,
    serializeQueryParams,
} from './logic/index.js'

function LogItem({ log }) {
  const [copying, setCopying] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!log.data) return
    const text = JSON.stringify(log.data, null, 2)
    try {
      setCopying(true)
      await navigator.clipboard.writeText(text)
      setTimeout(() => setCopying(false), 1500)
    } catch {
      setCopying(false)
    }
  }, [log.data])

  return (
    <div className={`log-item log-${log.type}`}>
      <div className="log-header">
        <span className="log-type">{log.type.toUpperCase()}</span>
        <span className="log-time">{log.timestamp}</span>
      </div>
      <div className="log-message">{log.message}</div>
      {log.data && (
        <div className="log-data-wrapper">
          <pre className="log-data">{JSON.stringify(log.data, null, 2)}</pre>
          <button
            className={`copy-btn ${copying ? 'copying' : ''}`}
            onClick={handleCopy}
            title="复制数据"
          >
            {copying ? '已复制!' : '复制'}
          </button>
        </div>
      )}
    </div>
  )
}

function HttpClientDemo() {
  const [logs, setLogs] = useState([])
  const [activeTab, setActiveTab] = useState('basic')

  const addLog = useCallback((type, message, data = null) => {
    setLogs((prev) => [
      {
        id: Date.now() + Math.random(),
        type,
        message,
        data,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ])
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const runBasicGet = useCallback(async () => {
    const client = HttpClient.create({
      baseURL: PRESET_ENVIRONMENTS.httpbin.baseURL,
    })

    addLog('info', 'Starting GET request to /get', { url: 'https://httpbin.org/get' })

    try {
      const result = await client.get('/get', {
        params: { foo: 'bar', hello: 'world' },
      })
      addLog('success', 'GET request completed', {
        status: result.status,
        data: result.data,
      })
    } catch (error) {
      addLog('error', 'GET request failed', {
        errorCode: error.errorCode,
        message: error.message,
      })
    }
  }, [addLog])

  const runPostJson = useCallback(async () => {
    const client = HttpClient.create({
      baseURL: PRESET_ENVIRONMENTS.httpbin.baseURL,
    })

    const postData = { name: 'Test', value: 123, nested: { key: 'value' } }
    addLog('info', 'Starting POST request to /post', { data: postData })

    try {
      const result = await client.post('/post', postData)
      addLog('success', 'POST request completed', {
        status: result.status,
        data: result.data,
      })
    } catch (error) {
      addLog('error', 'POST request failed', {
        errorCode: error.errorCode,
        message: error.message,
      })
    }
  }, [addLog])

  const runWithInterceptor = useCallback(async () => {
    const client = HttpClient.create({
      baseURL: PRESET_ENVIRONMENTS.httpbin.baseURL,
    })

    const unregister = client.useRequest(createRequestIdInterceptor())

    addLog('info', 'Adding X-Request-Id interceptor and sending request')

    try {
      const result = await client.get('/headers')
      addLog('success', 'Request with interceptor completed', {
        sentHeaders: result.data?.headers,
        requestId: result.data?.headers?.['X-Request-Id'],
      })
    } catch (error) {
      addLog('error', 'Request failed', {
        errorCode: error.errorCode,
        message: error.message,
      })
    } finally {
      unregister()
      addLog('info', 'Interceptor unregistered')
    }
  }, [addLog])

  const runTimeoutDemo = useCallback(async () => {
    const client = HttpClient.create({
      baseURL: PRESET_ENVIRONMENTS.httpbin.baseURL,
      timeout: 1000,
    })

    addLog('info', 'Testing timeout (1s timeout, 3s delay endpoint)')

    try {
      await client.get('/delay/3')
      addLog('error', 'Timeout should have occurred', { status: 'unexpected' })
    } catch (error) {
      addLog(error.errorCode === ERROR_CODES.TIMEOUT ? 'info' : 'error',
        error.errorCode === ERROR_CODES.TIMEOUT ? 'Timeout correctly triggered' : 'Request failed',
        {
          errorCode: error.errorCode,
          message: error.message,
        }
      )
    }
  }, [addLog])

  const runManualCancel = useCallback(async () => {
    const client = HttpClient.create({
      baseURL: PRESET_ENVIRONMENTS.httpbin.baseURL,
    })

    const controller = new AbortController()

    addLog('info', 'Testing manual cancel (will cancel after 500ms)')

    const requestPromise = client.get('/delay/3', { signal: controller.signal })

    setTimeout(() => {
      controller.abort()
      addLog('info', 'Abort signal sent')
    }, 500)

    try {
      await requestPromise
      addLog('error', 'Cancel should have occurred', { status: 'unexpected' })
    } catch (error) {
      addLog(error.errorCode === ERROR_CODES.ABORTED ? 'info' : 'error',
        error.errorCode === ERROR_CODES.ABORTED ? 'Manual cancel correctly triggered' : 'Request failed',
        {
          errorCode: error.errorCode,
          message: error.message,
        }
      )
    }
  }, [addLog])

  const runEnvironmentSwitch = useCallback(async () => {
    const client = HttpClient.create({
      environments: PRESET_ENVIRONMENTS,
    })

    addLog('info', 'Current environment info', {
      environments: Object.keys(PRESET_ENVIRONMENTS),
      currentBaseURL: client.baseURL,
    })

    client.addEnvironment('custom', {
      name: 'Custom',
      baseURL: 'https://custom.example.com/api',
      headers: { 'X-Custom': 'value' },
    })

    addLog('info', 'Added custom environment')

    client.setEnvironment('httpbin')
    addLog('info', 'Switched to httpbin environment', { baseURL: client.baseURL })

    try {
      const result = await client.get('/get')
      addLog('success', 'Environment switch demo completed', {
        status: result.status,
        baseURL: client.baseURL,
      })
    } catch (error) {
      addLog('error', 'Request failed', {
        errorCode: error.errorCode,
        message: error.message,
      })
    }
  }, [addLog])

  const runUrlNormalizationDemo = useCallback(() => {
    addLog('info', 'URL Normalization Demo', {
      note: 'Testing baseURL normalization (double slashes and backslashes)',
    })

    const testCases = [
      { input: 'https://api.example.com//api//v1/', expected: 'https://api.example.com/api/v1' },
      { input: 'https://api.example.com\\\\api\\\\v1\\\\', expected: 'https://api.example.com/api/v1' },
      { input: 'https://api.example.com/api/v1', expected: 'https://api.example.com/api/v1' },
    ]

    const results = testCases.map(({ input, expected }) => {
      const client = HttpClient.create({ baseURL: input })
      const actual = client.baseURL
      const passed = actual === expected
      return {
        input,
        expected,
        actual,
        passed,
      }
    })

    const allPassed = results.every((r) => r.passed)
    addLog(allPassed ? 'success' : 'error', 'URL Normalization results', { results })
  }, [addLog])

  const runQuerySerializationDemo = useCallback(() => {
    addLog('info', 'Query Serialization Demo', {
      note: 'Testing nested objects and array encoding strategies',
    })

    const nestedParams = {
      user: { name: 'John', age: 30 },
      tags: ['js', 'react', 'node'],
    }

    const results = {
      brackets: serializeQueryParams(nestedParams, { arrayFormat: QUERY_ARRAY_FORMATS.BRACKETS }),
      indices: serializeQueryParams(nestedParams, { arrayFormat: QUERY_ARRAY_FORMATS.INDICES }),
      repeat: serializeQueryParams(nestedParams, { arrayFormat: QUERY_ARRAY_FORMATS.REPEAT }),
      comma: serializeQueryParams(nestedParams, { arrayFormat: QUERY_ARRAY_FORMATS.COMMA }),
    }

    addLog('success', 'Query Serialization results', results)
  }, [addLog])

  const tabs = [
    { id: 'basic', label: '基本请求' },
    { id: 'interceptor', label: '拦截器' },
    { id: 'timeout', label: '超时与取消' },
    { id: 'advanced', label: '高级功能' },
  ]

  return (
    <div className="http-client-demo">
      <section className="tool-section">
        <div className="demo-header">
          <h2>HTTP Client 库演示</h2>
          <p>展示 HttpClient 库的核心功能：请求封装、拦截器、超时取消、环境切换等</p>
        </div>

        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="tab-content-wrapper">
          {activeTab === 'basic' && (
            <div className="action-group">
              <h3>基本请求</h3>
              <button className="demo-btn" onClick={runBasicGet}>
                GET /get with params
              </button>
              <button className="demo-btn" onClick={runPostJson}>
                POST /post with JSON body
              </button>
            </div>
          )}

          {activeTab === 'interceptor' && (
            <div className="action-group">
              <h3>拦截器</h3>
              <button className="demo-btn" onClick={runWithInterceptor}>
                使用 X-Request-Id 拦截器
              </button>
              <p className="hint">请求拦截器会自动注入 X-Request-Id 头，完成后自动取消注册</p>
            </div>
          )}

          {activeTab === 'timeout' && (
            <div className="action-group">
              <h3>超时与取消</h3>
              <button className="demo-btn" onClick={runTimeoutDemo}>
                测试超时 (1s)
              </button>
              <button className="demo-btn" onClick={runManualCancel}>
                测试手动取消
              </button>
              <p className="hint">演示不同的 errorCode：TIMEOUT vs ABORTED</p>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="action-group">
              <h3>高级功能</h3>
              <button className="demo-btn" onClick={runEnvironmentSwitch}>
                环境切换演示
              </button>
              <button className="demo-btn" onClick={runUrlNormalizationDemo}>
                URL 规范化演示
              </button>
              <button className="demo-btn" onClick={runQuerySerializationDemo}>
                查询参数序列化
              </button>
            </div>
          )}
        </div>

        <button className="clear-btn" onClick={clearLogs}>
          清空日志
        </button>
      </section>

      <section className="tool-section logs-section">
        <h2>执行日志</h2>
        <div className="logs-container">
          {logs.length === 0 ? (
            <p className="no-logs">点击上方按钮开始演示...</p>
          ) : (
            logs.map((log) => <LogItem key={log.id} log={log} />)
          )}
        </div>
      </section>
    </div>
  )
}

export default HttpClientDemo
