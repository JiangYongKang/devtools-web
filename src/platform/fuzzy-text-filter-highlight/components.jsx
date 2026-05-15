import { useMemo } from 'react'
import { useReducedMotion } from './hooks.js'

/**
 * 高亮文本组件（防 XSS，纯文本节点处理）
 * @param {Object} props - 组件属性
 * @param {string} props.text - 原始文本
 * @param {Array<{start: number, end: number}>} props.ranges - 要高亮的范围数组
 * @param {string} [props.className=''] - 额外的 CSS 类名
 * @returns {JSX.Element} 高亮文本组件
 */
function HighlightedText({ text, ranges, className = '' }) {
  const prefersReducedMotion = useReducedMotion()

  const parts = useMemo(() => {
    if (!ranges || ranges.length === 0) {
      return [{ text, matched: false }]
    }

    const result = []
    let lastEnd = 0

    const sortedRanges = [...ranges].sort((a, b) => a.start - b.start)

    for (const range of sortedRanges) {
      if (range.start > lastEnd) {
        result.push({
          text: text.slice(lastEnd, range.start),
          matched: false,
        })
      }
      if (range.start < range.end) {
        result.push({
          text: text.slice(range.start, range.end),
          matched: true,
        })
      }
      lastEnd = range.end
    }

    if (lastEnd < text.length) {
      result.push({
        text: text.slice(lastEnd),
        matched: false,
      })
    }

    return result
  }, [text, ranges])

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.matched ? (
          <mark
            key={index}
            style={{
              backgroundColor: '#fef08a',
              borderRadius: '2px',
              padding: '0 2px',
              animation: prefersReducedMotion ? 'none' : 'pulse 2s infinite',
            }}
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </span>
  )
}

/**
 * 搜索输入框组件，支持防抖和加载状态
 * @param {Object} props - 组件属性
 * @param {string} props.value - 输入值
 * @param {Function} props.onChange - 值变化回调函数
 * @param {Function} [props.onKeyDown] - 键盘按下回调函数
 * @param {string} [props.placeholder='搜索...'] - 占位符文本
 * @param {boolean} [props.disabled=false] - 是否禁用
 * @param {boolean} [props.loading=false] - 是否显示加载指示器
 * @param {string} [props.className=''] - 额外的 CSS 类名
 * @returns {JSX.Element} 搜索输入框组件
 */
function SearchInput({
  value,
  onChange,
  onKeyDown,
  placeholder = '搜索...',
  disabled = false,
  loading = false,
  className = '',
}) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        style={{
          width: '100%',
          padding: '12px 16px',
          paddingRight: loading ? '40px' : '16px',
          fontSize: '16px',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          outline: 'none',
          transition: 'border-color 0.2s',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#3b82f6'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e5e7eb'
        }}
      />
      {loading && (
        <div
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '20px',
            height: '20px',
            border: '2px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      )}
    </div>
  )
}

/**
 * 搜索结果项组件
 * @param {Object} props - 组件属性
 * @param {Object} props.result - 结果对象
 * @param {boolean} [props.selected=false] - 是否选中
 * @param {Function} [props.onClick] - 点击回调函数
 * @param {Function} [props.onMouseEnter] - 鼠标进入回调函数
 * @param {boolean} [props.showScore=true] - 是否显示匹配分数
 * @param {boolean} [props.showTags=true] - 是否显示标签
 * @returns {JSX.Element} 结果项组件
 */
function ResultItem({
  result,
  selected = false,
  onClick,
  onMouseEnter,
  showScore = true,
  showTags = true,
}) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        padding: '12px 16px',
        backgroundColor: selected ? '#eff6ff' : 'transparent',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
        border: selected ? '1px solid #bfdbfe' : '1px solid transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>
            <HighlightedText text={result.text} ranges={result.highlightRanges} />
          </div>
          {showTags && result.tags && result.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {result.tags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '12px',
                    color: '#6b7280',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {showScore && (
          <div style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
            {(result.score * 100).toFixed(0)}%
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 搜索结果列表组件
 * @param {Object} props - 组件属性
 * @param {Array} props.results - 结果数组
 * @param {number} props.selectedIndex - 当前选中索引
 * @param {Function} [props.onSelect] - 选择回调函数
 * @param {Function} [props.onHover] - 悬停回调函数
 * @param {boolean} [props.showScore=true] - 是否显示匹配分数
 * @param {boolean} [props.showTags=true] - 是否显示标签
 * @param {string} [props.maxHeight='400px'] - 最大高度
 * @param {string} [props.emptyMessage='没有找到匹配的结果'] - 空结果时的提示消息
 * @returns {JSX.Element} 结果列表组件
 */
function ResultList({
  results,
  selectedIndex,
  onSelect,
  onHover,
  showScore = true,
  showTags = true,
  maxHeight = '400px',
  emptyMessage = '没有找到匹配的结果',
}) {
  if (results.length === 0) {
    return (
      <div
        style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: '#9ca3af',
        }}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      style={{
        overflowY: 'auto',
        maxHeight,
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '4px',
      }}
    >
      {results.map((result, index) => (
        <ResultItem
          key={result.id || index}
          result={result}
          selected={index === selectedIndex}
          onClick={() => onSelect?.(result, index)}
          onMouseEnter={() => onHover?.(index)}
          showScore={showScore}
          showTags={showTags}
        />
      ))}
    </div>
  )
}

/**
 * 性能直方图组件，展示查询耗时历史
 * @param {Object} props - 组件属性
 * @param {Array<number>} props.data - 性能数据（毫秒
 * @param {number} [props.maxBars=20] - 最大显示条数
 * @param {string} [props.barColor='#3b82f6'] - 柱状图颜色
 * @param {number} [props.height=60] - 高度像素
 * @returns {JSX.Element|null} 性能直方图组件
 */
function PerformanceHistogram({
  data,
  maxBars = 20,
  barColor = '#3b82f6',
  height = 60,
}) {
  if (!data || data.length === 0) {
    return null
  }

  const displayData = data.slice(-maxBars)
  const maxValue = Math.max(...displayData, 1)
  const avgValue = displayData.reduce((a, b) => a + b, 0) / displayData.length

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height }}>
        {displayData.map((value, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              minWidth: '4px',
              height: `${Math.max((value / maxValue) * 100, 5)}%`,
              backgroundColor: barColor,
              borderRadius: '2px 2px 0 0',
              opacity: 0.7,
            }}
            title={`${value.toFixed(2)}ms`}
          />
        ))}
      </div>
      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', textAlign: 'center' }}>
        平均: {avgValue.toFixed(2)}ms
      </div>
    </div>
  )
}

/**
 * 状态徽章组件，显示 Worker/索引状态
 * @param {Object} props - 组件属性
 * @param {string} props.status - 状态值（idle/ready/indexed/fallback）
 * @param {boolean} props.useWorker - 是否使用 Worker
 * @returns {JSX.Element} 状态徽章组件
 */
function StatusBadge({ status, useWorker }) {
  const colors = {
    idle: '#9ca3af',
    ready: '#22c55e',
    indexed: '#3b82f6',
    fallback: '#f59e0b',
  }

  const labels = {
    idle: '未启动',
    ready: 'Worker 就绪',
    indexed: '索引构建完成',
    fallback: '主线程模式',
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        backgroundColor: `${colors[status]}15`,
        color: colors[status],
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 500,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: colors[status],
        }}
      />
      {labels[status] || status}
    </span>
  )
}

export {
  HighlightedText,
  SearchInput,
  ResultItem,
  ResultList,
  PerformanceHistogram,
  StatusBadge,
}
