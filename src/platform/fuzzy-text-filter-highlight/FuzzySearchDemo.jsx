import { useState, useCallback } from 'react'
import {
  useFuzzySearch,
  useKeyboardNavigation,
} from './hooks.js'
import {
  SearchInput,
  ResultList,
  PerformanceHistogram,
  StatusBadge,
} from './components.jsx'
import {
  technicalTitles,
  codeSymbols,
  typosKeywords,
  generateLargeData,
  exportResultsToJSON,
} from './sampleData.js'

const DATASETS = {
  technicalTitles: {
    name: '技术文档标题',
    data: technicalTitles,
    description: '20条技术文章标题示例',
  },
  codeSymbols: {
    name: '代码符号表',
    data: codeSymbols,
    description: '20个常用JS/React API',
  },
  typosKeywords: {
    name: '错别字关键词',
    data: typosKeywords,
    description: '20个含错别字的关键词',
  },
  large: {
    name: '大规模数据',
    data: [],
    description: '100000条随机数据（Worker模式）',
  },
}

function FuzzySearchDemo() {
  const [activeDataset, setActiveDataset] = useState('technicalTitles')
  const [onlyFilter, setOnlyFilter] = useState(false)
  const [searchOptions, setSearchOptions] = useState({
    maxEditDistance: 2,
    caseFold: true,
    prefixBonus: true,
    asciiFolding: false,
  })

  const currentDataset = activeDataset === 'large'
    ? generateLargeData(100000)
    : DATASETS[activeDataset].data

  const {
    results,
    query,
    loading,
    error,
    workerStatus,
    useWorker,
    performanceHistory,
    search,
    clearSearch,
  } = useFuzzySearch(currentDataset, {
    workerThreshold: 100000,
    debounceMs: 150,
    removeStopwords: true,
  })

  const handleSelect = useCallback((result, index) => {
    console.log('Selected:', result)
  }, [])

  const { selectedIndex, setSelectedIndex, handleKeyDown } = useKeyboardNavigation(
    results,
    handleSelect
  )

  const handleInputChange = useCallback(
    (value) => {
      search(value, {
        onlyFilter,
        ...searchOptions,
      })
    },
    [search, onlyFilter, searchOptions]
  )

  const handleKeyDownCombined = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        clearSearch()
      }
      handleKeyDown(e)
    },
    [handleKeyDown, clearSearch]
  )

  const handleExport = useCallback(() => {
    exportResultsToJSON(results, `fuzzy-search-${Date.now()}.json`)
  }, [results])

  const handleDatasetChange = useCallback((datasetKey) => {
    setActiveDataset(datasetKey)
    clearSearch()
  }, [clearSearch])

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
        模糊搜索与高亮组件
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '24px' }}>
        支持编辑距离匹配、前缀加权、连续子串奖励、ASCII近似匹配
      </p>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
          选择示例数据集
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(DATASETS).map(([key, { name, description }]) => (
            <button
              key={key}
              onClick={() => handleDatasetChange(key)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: activeDataset === key ? '#3b82f6' : '#e5e7eb',
                backgroundColor: activeDataset === key ? '#eff6ff' : 'white',
                color: activeDataset === key ? '#1d4ed8' : '#374151',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              {name}
              <div style={{ fontSize: '11px', opacity: 0.7 }}>{description}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
          搜索选项
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={onlyFilter}
              onChange={(e) => setOnlyFilter(e.target.checked)}
            />
            <span style={{ fontSize: '14px' }}>仅过滤不高亮</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={searchOptions.caseFold}
              onChange={(e) => setSearchOptions((p) => ({ ...p, caseFold: e.target.checked }))}
            />
            <span style={{ fontSize: '14px' }}>大小写折叠</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={searchOptions.prefixBonus}
              onChange={(e) => setSearchOptions((p) => ({ ...p, prefixBonus: e.target.checked }))}
            />
            <span style={{ fontSize: '14px' }}>前缀加权</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={searchOptions.asciiFolding}
              onChange={(e) => setSearchOptions((p) => ({ ...p, asciiFolding: e.target.checked }))}
            />
            <span style={{ fontSize: '14px' }}>ASCII近似 (o/0等)</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px' }}>最大编辑距离:</span>
            <select
              value={searchOptions.maxEditDistance}
              onChange={(e) => setSearchOptions((p) => ({ ...p, maxEditDistance: Number(e.target.value) }))}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <SearchInput
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDownCombined}
          placeholder="输入搜索关键词（支持模糊匹配）..."
          loading={loading}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <StatusBadge status={workerStatus} useWorker={useWorker} />
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            找到 {results.length} 条结果
          </span>
        </div>
        <button
          onClick={handleExport}
          disabled={results.length === 0}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            backgroundColor: results.length > 0 ? 'white' : '#f3f4f6',
            color: results.length > 0 ? '#374151' : '#9ca3af',
            cursor: results.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: '13px',
          }}
        >
          导出 JSON
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#dc2626',
            marginBottom: '16px',
            fontSize: '14px',
          }}
        >
          {error.message || JSON.stringify(error)}
        </div>
      )}

      <ResultList
        results={results}
        selectedIndex={selectedIndex}
        onSelect={handleSelect}
        onHover={setSelectedIndex}
        showScore={!onlyFilter}
        showTags={true}
        emptyMessage={query ? '没有找到匹配的结果' : '输入关键词开始搜索'}
      />

      {performanceHistory.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            查询耗时直方图（最近 {performanceHistory.length} 次）
          </div>
          <PerformanceHistogram data={performanceHistory} />
        </div>
      )}

      <div
        style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#6b7280',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
          键盘快捷键
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li><kbd style={{ padding: '2px 6px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>↑</kbd> <kbd style={{ padding: '2px 6px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>↓</kbd> 上下选择</li>
          <li><kbd style={{ padding: '2px 6px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>Enter</kbd> 确认选择</li>
          <li><kbd style={{ padding: '2px 6px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>Esc</kbd> 清空搜索</li>
        </ul>
      </div>
    </div>
  )
}

export default FuzzySearchDemo
