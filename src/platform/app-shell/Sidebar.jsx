import { useEffect, useRef } from 'react'
import ToolList from './ToolList.jsx'
import { SORT_STRATEGIES } from './logic/index.js'

export default function Sidebar({
  tools,
  searchQuery = '',
  sortStrategy = SORT_STRATEGIES.ID,
  onSortChange,
  isOpen = true,
  isCollapsed = false,
  onClose,
  totalCount,
  loadedCount,
}) {
  const sidebarRef = useRef(null)
  const firstFocusableRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        firstFocusableRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose?.()
      }

      if (e.key === 'Tab') {
        const focusableElements = sidebarRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )

        if (!focusableElements || focusableElements.length === 0) return

        const first = focusableElements[0]
        const last = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const sidebarClasses = [
    'app-sidebar',
    isCollapsed ? 'collapsed' : '',
    isOpen ? 'mobile-visible' : 'mobile-hidden',
  ].filter(Boolean).join(' ')

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop open"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        ref={sidebarRef}
        className={sidebarClasses}
        role="complementary"
        aria-label="工具导航侧边栏"
        aria-hidden={!isOpen}
      >
        <div className="sidebar-header">
          <span className="sidebar-title">工具索引</span>
          <select
            ref={firstFocusableRef}
            className="sort-select"
            value={sortStrategy}
            onChange={(e) => onSortChange?.(e.target.value)}
            aria-label="排序方式"
          >
            <option value={SORT_STRATEGIES.ID}>按 ID</option>
            <option value={SORT_STRATEGIES.TITLE}>按标题</option>
            <option value={SORT_STRATEGIES.CATEGORY}>按分类</option>
            <option value={SORT_STRATEGIES.RECENT}>最近使用</option>
          </select>
        </div>
        <ToolList
          tools={tools}
          searchQuery={searchQuery}
          totalCount={totalCount}
          loadedCount={loadedCount}
        />
        <div className="sidebar-footer">
          <span aria-live="polite">
            支持拼音搜索，按 <kbd>⌘K</kbd> 快速聚焦搜索
          </span>
        </div>
      </aside>
    </>
  )
}
