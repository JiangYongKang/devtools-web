import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './AppShell.css'
import SkipLink from './SkipLink.jsx'
import AppHeader from './AppHeader.jsx'
import Sidebar from './Sidebar.jsx'
import LoadingBar from './LoadingBar.jsx'
import DemoPanel from './DemoPanel.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import {
  tools as baseTools,
} from '../../data/tools.js'
import {
  searchTools,
  sortTools,
  parseUrlState,
  buildSearchParamsFromState,
  normalizeToolEntry,
  validateToolList,
  ERROR_CODES,
  SORT_STRATEGIES,
  BREAKPOINTS,
} from './logic/index.js'

function normalizeBaseTools(tools) {
  const normalized = tools.map((tool) =>
    normalizeToolEntry({
      id: tool.id,
      title: tool.name,
      summary: tool.summary,
      tags: [],
      status: 'stable',
      path: `/tools/${tool.id}`,
    })
  )
  const validation = validateToolList(normalized)
  return validation.validEntries
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia(query).matches
    }
    return false
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

export default function AppShell({ children, loading = false, showDemo = false }) {
  const location = useLocation()
  const navigate = useNavigate()

  const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.MEDIUM - 1}px)`)

  const normalizedBaseTools = normalizeBaseTools(baseTools)

  const [tools, setTools] = useState(normalizedBaseTools)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortStrategy, setSortStrategy] = useState(SORT_STRATEGIES.ID)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [errorState, setErrorState] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const state = parseUrlState(params)

    if (state.searchQuery) {
      setSearchQuery(state.searchQuery)
    }
    if (state.sortStrategy) {
      setSortStrategy(state.sortStrategy)
    }
    if (state.sidebarCollapsed !== null) {
      setSidebarCollapsed(state.sidebarCollapsed)
    }
  }, [])

  const updateUrl = useCallback(
    (newState) => {
      const params = buildSearchParamsFromState(newState)
      const searchStr = params.toString()
      const newPath = `${location.pathname}${searchStr ? `?${searchStr}` : ''}`
      if (newPath !== location.pathname + location.search) {
        navigate(newPath, { replace: true })
      }
    },
    [location, navigate]
  )

  const handleSearchChange = useCallback(
    (query) => {
      setSearchQuery(query)
      updateUrl({
        searchQuery: query,
        sortStrategy,
        sidebarCollapsed,
      })
    },
    [sortStrategy, sidebarCollapsed, updateUrl]
  )

  const handleSortChange = useCallback(
    (strategy) => {
      setSortStrategy(strategy)
      updateUrl({
        searchQuery,
        sortStrategy: strategy,
        sidebarCollapsed,
      })
    },
    [searchQuery, sidebarCollapsed, updateUrl]
  )

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileSidebarOpen((prev) => !prev)
    } else {
      const newCollapsed = !sidebarCollapsed
      setSidebarCollapsed(newCollapsed)
      updateUrl({
        searchQuery,
        sortStrategy,
        sidebarCollapsed: newCollapsed,
      })
    }
  }, [isMobile, sidebarCollapsed, searchQuery, sortStrategy, updateUrl])

  const handleInjectDemo = useCallback((demoTools) => {
    setTools(demoTools)
    setErrorState(null)
  }, [])

  const handleShowError = useCallback((errorCode, message) => {
    setErrorState({ errorCode, message })
  }, [])

  const handleReset = useCallback(() => {
    setTools(normalizedBaseTools)
    setErrorState(null)
    setSearchQuery('')
    setSortStrategy(SORT_STRATEGIES.ID)
  }, [normalizedBaseTools])

  const searchResult = searchTools(tools, searchQuery)
  const sortedTools = sortTools(searchResult.results, sortStrategy)

  const availableIds = tools.map((t) => t.id)

  const isNotFoundPage = location.pathname.startsWith('/not-found') || 
    (location.pathname.startsWith('/tools/') && !normalizedBaseTools.some(t => location.pathname.includes(t.id)))

  return (
    <div className="app-shell">
      <SkipLink />
      <LoadingBar isLoading={loading} />

      <AppHeader
        onMenuClick={toggleSidebar}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        showMenuButton={true}
      />

      <div className="app-main">
        <Sidebar
          tools={sortedTools}
          searchQuery={searchQuery}
          sortStrategy={sortStrategy}
          onSortChange={handleSortChange}
          isOpen={isMobile ? mobileSidebarOpen : !sidebarCollapsed}
          isCollapsed={!isMobile && sidebarCollapsed}
          onClose={() => setMobileSidebarOpen(false)}
          totalCount={searchResult.total}
          loadedCount={sortedTools.length}
        />

        <main
          id="main-content"
          className="app-content"
          role="main"
          aria-label="主要内容区域"
          tabIndex={-1}
        >
          {errorState && (
            <div className="error-state" role="alert" aria-live="polite">
              <div className="error-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>加载错误</span>
              </div>
              <div className="error-details">
                <code>{errorState.errorCode}</code>: {errorState.message}
              </div>
            </div>
          )}

          {showDemo && (
            <DemoPanel
              onInjectDemo={handleInjectDemo}
              onShowError={handleShowError}
              onReset={handleReset}
            />
          )}

          {isNotFoundPage ? (
            <NotFoundPage
              path={location.pathname}
              toolId={location.pathname.split('/tools/')[1]}
              availableIds={availableIds}
            />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
