import { useState } from 'react'
import { generateDemoTools, generateInvalidEntries, mergeToolLists, ERROR_CODES } from './logic/index.js'

export default function DemoPanel({
  onInjectDemo,
  onShowError,
  onReset,
}) {
  const [showIgnored, setShowIgnored] = useState(false)
  const [ignoredEntries, setIgnoredEntries] = useState([])

  const handleInjectDemo = () => {
    const demoTools = generateDemoTools(50)
    onInjectDemo?.(demoTools)
  }

  const handleInjectInvalid = () => {
    const invalidList = generateInvalidEntries()
    setIgnoredEntries(invalidList.map((entry, index) => ({
      entry,
      index,
      errors: [{
        errorCode: ERROR_CODES.SCHEMA_VALIDATION_FAILED,
        errorMessage: '条目格式无效',
      }],
    })))
    setShowIgnored(true)
    onShowError?.(ERROR_CODES.SCHEMA_VALIDATION_FAILED, `有 ${invalidList.length} 个条目被忽略`)
  }

  const handleInjectDuplicates = () => {
    const baseList = generateDemoTools(10)
    const extraList = [
      ...baseList.slice(0, 3).map(t => ({ ...t, title: `重复: ${t.title}`, source: 'extra' })),
      { id: 'extra-001', title: '额外工具', summary: '来自额外清单' },
    ]
    const merged = mergeToolLists(baseList, extraList, 'merge')
    onInjectDemo?.(merged.entries)
    setIgnoredEntries(merged.invalidEntries)
  }

  return (
    <div className="demo-panel">
      <h3 className="demo-panel-title">演示控制</h3>
      <div className="demo-panel-actions">
        <button className="secondary-btn" onClick={handleInjectDemo}>
          注入演示工具列表 (50 个)
        </button>
        <button className="secondary-btn" onClick={handleInjectDuplicates}>
          注入重复 ID 测试
        </button>
        <button className="secondary-btn" onClick={handleInjectInvalid}>
          注入无效条目 (演示剔除)
        </button>
        <button className="secondary-btn" onClick={() => onShowError?.(ERROR_CODES.LIST_LOAD_FAILED, '模拟加载失败')}>
          模拟加载失败
        </button>
        <button className="secondary-btn" onClick={onReset}>
          重置
        </button>
      </div>

      {showIgnored && ignoredEntries.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button
            className="secondary-btn"
            onClick={() => setShowIgnored(!showIgnored)}
            aria-expanded={showIgnored}
          >
            {showIgnored ? '收起' : '展开'} 被忽略条目 ({ignoredEntries.length})
          </button>
          {showIgnored && (
            <div style={{ marginTop: 12, overflowX: 'auto' }}>
              <table className="ignored-table" aria-label="被忽略的条目">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>原始条目</th>
                    <th>错误信息</th>
                  </tr>
                </thead>
                <tbody>
                  {ignoredEntries.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.index ?? idx}</td>
                      <td>
                        <code>
                          {item.entry ? JSON.stringify(item.entry).slice(0, 60) : 'null'}
                          {item.entry && JSON.stringify(item.entry).length > 60 ? '...' : ''}
                        </code>
                      </td>
                      <td>
                        {item.errors?.map((e, i) => (
                          <span key={i} style={{ display: 'block' }}>
                            <code>{e.errorCode}</code>: {e.errorMessage}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
