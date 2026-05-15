import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  buildFuzzyIndex,
  searchFuzzy,
  WORKER_THRESHOLD,
  DEBOUNCE_DEFAULT,
  MAX_HISTORY_SIZE,
  ERROR_CODES,
  WORKER_MESSAGE_TYPES,
  createError,
  wrapError,
} from './logic/index.js'

/**
 * 防抖 Hook，延迟执行回调函数
 * @param {Function} callback - 要防抖的回调函数
 * @param {number} [delay=DEBOUNCE_DEFAULT] - 延迟毫秒数
 * @returns {[Function, Function]} [防抖后的函数, 取消函数]
 */
function useDebounce(callback, delay = DEBOUNCE_DEFAULT) {
  const timeoutRef = useRef(null)

  const debouncedCallback = useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  )

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => cancel, [cancel])

  return [debouncedCallback, cancel]
}

/**
 * 模糊搜索 Hook，支持 Worker 模式处理大规模数据
 * @param {Array<string|Object>} corpus - 搜索语料库
 * @param {Object} [options={}] - 配置选项
 * @param {number} [options.workerThreshold=WORKER_THRESHOLD] - 启用 Worker 的阈值
 * @param {number} [options.debounceMs=DEBOUNCE_DEFAULT] - 搜索防抖延迟毫秒数
 * @returns {Object} 搜索状态和方法
 * @property {Object|null} index - 构建好的搜索索引
 * @property {Array} results - 搜索结果数组
 * @property {string} query - 当前查询词
 * @property {boolean} loading - 是否正在加载/搜索中
 * @property {Error|null} error - 错误信息
 * @property {boolean} useWorker - 是否使用 Worker 模式
 * @property {string} workerStatus - Worker 状态
 * @property {Array<number>} performanceHistory - 性能历史记录（毫秒
 * @property {Function} search - 防抖搜索方法
 * @property {Function} searchImmediate - 立即搜索方法
 * @property {Function} clearSearch - 清空搜索
 * @property {Function} rebuildIndex - 重建索引
 */
function useFuzzySearch(corpus, options = {}) {
  const [index, setIndex] = useState(null)
  const [results, setResults] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [useWorker, setUseWorker] = useState(false)
  const [workerStatus, setWorkerStatus] = useState('idle')
  const [performanceHistory, setPerformanceHistory] = useState([])

  const workerRef = useRef(null)
  const pendingRequestRef = useRef(null)

  const shouldUseWorker = useMemo(() => {
    return corpus.length >= (options.workerThreshold || WORKER_THRESHOLD)
  }, [corpus.length, options.workerThreshold])

  const initWorker = useCallback(async () => {
    try {
      const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
      workerRef.current = worker

      worker.onmessage = (event) => {
        const { type, payload, id } = event.data

        if (type === WORKER_MESSAGE_TYPES.RESULT) {
          if (payload.status === 'ready') {
            setWorkerStatus('ready')
            setUseWorker(true)
          } else if (payload.status === 'indexBuilt') {
            setLoading(false)
            setWorkerStatus('indexed')
          } else if (payload.status === 'searchComplete') {
            setResults(payload.results)
            setLoading(false)
            setPerformanceHistory((prev) => {
              const newHistory = [...prev, payload.duration]
              return newHistory.slice(-MAX_HISTORY_SIZE)
            })
          }
        } else if (type === WORKER_MESSAGE_TYPES.ERROR) {
          setError(payload.error)
          setLoading(false)
          fallbackToMainThread()
        }
      }

      worker.onerror = (err) => {
        setError(wrapError(err, ERROR_CODES.WORKER_INIT_FAILED))
        fallbackToMainThread()
      }

      worker.postMessage({
        type: WORKER_MESSAGE_TYPES.INIT,
        id: Date.now().toString(),
      })
    } catch (err) {
      setError(wrapError(err, ERROR_CODES.WORKER_INIT_FAILED))
      fallbackToMainThread()
    }
  }, [])

  const fallbackToMainThread = useCallback(() => {
    setUseWorker(false)
    setWorkerStatus('fallback')
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
  }, [])

  const buildIndex = useCallback(async () => {
    if (!corpus || corpus.length === 0) return

    setLoading(true)
    setError(null)

    try {
      if (shouldUseWorker && useWorker) {
        workerRef.current?.postMessage({
          type: WORKER_MESSAGE_TYPES.BUILD_INDEX,
          payload: { corpus, options },
          id: Date.now().toString(),
        })
      } else {
        const newIndex = buildFuzzyIndex(corpus, options)
        setIndex(newIndex)
        setResults(newIndex.items.map((item) => ({
          id: item.id,
          original: item.original,
          text: item.text,
          tags: item.tags,
          score: 1,
          highlightRanges: [],
        })))
        setLoading(false)
      }
    } catch (err) {
      setError(err)
      setLoading(false)
    }
  }, [corpus, options, shouldUseWorker, useWorker])

  const search = useCallback(
    (searchQuery, searchOptions = {}) => {
      if (!index && !useWorker) {
        setResults([])
        return
      }

      setQuery(searchQuery)
      setLoading(true)

      const startTime = performance.now()

      if (useWorker && workerRef.current) {
        workerRef.current.postMessage({
          type: WORKER_MESSAGE_TYPES.SEARCH,
          payload: { query: searchQuery, options: searchOptions },
          id: Date.now().toString(),
        })
      } else if (index) {
        try {
          const searchResults = searchFuzzy(index, searchQuery, searchOptions)
          setResults(searchResults)
          const duration = performance.now() - startTime
          setPerformanceHistory((prev) => {
            const newHistory = [...prev, duration]
            return newHistory.slice(-MAX_HISTORY_SIZE)
          })
        } catch (err) {
          setError(err)
        }
        setLoading(false)
      }
    },
    [index, useWorker]
  )

  const [debouncedSearch] = useDebounce(search, options.debounceMs || DEBOUNCE_DEFAULT)

  const clearSearch = useCallback(() => {
    setQuery('')
    if (index) {
      setResults(index.items.map((item) => ({
        id: item.id,
        original: item.original,
        text: item.text,
        tags: item.tags,
        score: 1,
        highlightRanges: [],
      })))
    }
  }, [index])

  useEffect(() => {
    if (shouldUseWorker && !useWorker && workerStatus === 'idle') {
      initWorker()
    }
  }, [shouldUseWorker, useWorker, workerStatus, initWorker])

  useEffect(() => {
    if (!useWorker || workerStatus === 'ready') {
      buildIndex()
    }
  }, [corpus, useWorker, workerStatus, buildIndex])

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [])

  return {
    index,
    results,
    query,
    loading,
    error,
    useWorker,
    workerStatus,
    performanceHistory,
    search: debouncedSearch,
    searchImmediate: search,
    clearSearch,
    rebuildIndex: buildIndex,
  }
}

/**
 * 键盘导航 Hook，支持上下箭头选择，Enter 确认，Esc 取消
 * @param {Array} results - 结果数组
 * @param {Function} [onSelect] - 选择回调函数
 * @returns {Object} 导航状态和方法
 * @property {number} selectedIndex - 当前选中索引
 * @property {Function} setSelectedIndex - 设置选中索引
 * @property {Function} handleKeyDown - 键盘事件处理函数
 */
function useKeyboardNavigation(results, onSelect) {
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const handleKeyDown = useCallback(
    (event) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          )
          break
        case 'Enter':
          event.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            onSelect?.(results[selectedIndex], selectedIndex)
          }
          break
        case 'Escape':
          event.preventDefault()
          setSelectedIndex(-1)
          break
      }
    },
    [results, selectedIndex, onSelect]
  )

  useEffect(() => {
    setSelectedIndex((prev) => {
      if (results.length === 0) return -1
      if (prev >= results.length) return results.length - 1
      return prev
    })
  }, [results])

  return {
    selectedIndex,
    setSelectedIndex,
    handleKeyDown,
  }
}

/**
 * 检测用户是否开启了减少动画偏好设置（无障碍支持）
 * @returns {boolean} 是否偏好减少动画
 */
function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (event) => setPrefersReducedMotion(event.matches)
    mediaQuery.addEventListener('change', handler)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

export {
  useDebounce,
  useFuzzySearch,
  useKeyboardNavigation,
  useReducedMotion,
}
