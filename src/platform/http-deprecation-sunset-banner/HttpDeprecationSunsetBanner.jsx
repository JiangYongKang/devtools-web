import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { SEVERITY, SNOOZE_TYPE, DEFAULT_SNOOZE_MINUTES } from './logic/constants'
import {
  extractNoticesFromInput,
  getHumanReadableMessage,
  getMachineReadableSummary,
  mergeNotices,
} from './logic/deprecation-notice'
import {
  SnoozeManager,
  getDefaultSnoozeManager,
  generateCurlTemplate,
} from './logic/snooze-manager'
import { EXAMPLE_SCENARIOS } from './logic/examples'
import './HttpDeprecationSunsetBanner.css'

const SEVERITY_ICONS = {
  [SEVERITY.INFO]: 'ℹ️',
  [SEVERITY.WARNING]: '⚠️',
  [SEVERITY.BLOCKING]: '🚨',
}

function SingleNoticeBanner({ notice, snoozeManager, onSnooze, onDismiss }) {
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowSnoozeMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSnooze = (type, minutes) => {
    snoozeManager.snoozeNotice(notice.id, type, minutes)
    setShowSnoozeMenu(false)
    onSnooze?.()
  }

  return (
    <div className={`http-deprecation-banner http-deprecation-banner--${notice.severity}`}>
      <span className="http-deprecation-banner__icon">
        {SEVERITY_ICONS[notice.severity]}
      </span>
      
      <div className="http-deprecation-banner__content">
        <div className="http-deprecation-banner__main">
          <div className="http-deprecation-banner__message">
            {getHumanReadableMessage(notice)}
          </div>
          
          {notice.detail && (
            <div className="http-deprecation-banner__detail">
              {notice.detail}
            </div>
          )}
          
          {notice.link && (
            <a
              href={notice.link}
              target="_blank"
              rel="noopener noreferrer"
              className="http-deprecation-banner__link"
            >
              查看文档 →
            </a>
          )}
        </div>
        
        <div className="http-deprecation-banner__actions">
          <div style={{ position: 'relative' }}>
            <button
              className="http-deprecation-banner__btn"
              onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
            >
              稍后提醒
            </button>
            
            {showSnoozeMenu && (
              <div className="http-deprecation-snooze-menu" ref={menuRef}>
                <button
                  className="http-deprecation-snooze-menu__item"
                  onClick={() => handleSnooze(SNOOZE_TYPE.SESSION)}
                >
                  本次会话不提醒
                </button>
                <button
                  className="http-deprecation-snooze-menu__item"
                  onClick={() => handleSnooze(SNOOZE_TYPE.MINUTES, 15)}
                >
                  15 分钟后提醒
                </button>
                <button
                  className="http-deprecation-snooze-menu__item"
                  onClick={() => handleSnooze(SNOOZE_TYPE.MINUTES, 60)}
                >
                  1 小时后提醒
                </button>
                <button
                  className="http-deprecation-snooze-menu__item"
                  onClick={() => handleSnooze(SNOOZE_TYPE.MINUTES, 24 * 60)}
                >
                  明天再提醒
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <button
        className="http-deprecation-banner__close"
        onClick={onDismiss}
        title="关闭"
      >
        ×
      </button>
    </div>
  )
}

export function DeprecationBannerContainer({ notices, snoozeManager = null, onSnooze }) {
  const manager = snoozeManager || getDefaultSnoozeManager()
  const [visibleNotices, setVisibleNotices] = useState([])
  const [dismissed, setDismissed] = useState(new Set())

  useEffect(() => {
    const filtered = manager.filterVisibleNotices(notices)
    setVisibleNotices(filtered.filter(n => !dismissed.has(n.id)))
  }, [notices, manager, dismissed])

  const handleDismiss = (noticeId) => {
    setDismissed(prev => new Set([...prev, noticeId]))
  }

  if (visibleNotices.length === 0) {
    return null
  }

  return createPortal(
    <div className="http-deprecation-banner-container">
      {visibleNotices.map(notice => (
        <SingleNoticeBanner
          key={notice.id}
          notice={notice}
          snoozeManager={manager}
          onSnooze={onSnooze}
          onDismiss={() => handleDismiss(notice.id)}
        />
      ))}
    </div>,
    document.body
  )
}

export function HttpDeprecationSunsetDemo() {
  const [rawHeaders, setRawHeaders] = useState('')
  const [parsedNotices, setParsedNotices] = useState([])
  const [allNotices, setAllNotices] = useState([])
  const [copied, setCopied] = useState(false)

  const handleScenarioClick = (scenario) => {
    const headers = scenario.createHeaders()
    const text = Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')
    setRawHeaders(text)
    parseAndAdd(text)
  }

  const parseAndAdd = useCallback((text) => {
    const notices = extractNoticesFromInput(text)
    if (notices.length > 0) {
      setParsedNotices(notices)
      setAllNotices(prev => mergeNotices([...prev, ...notices]))
    } else {
      setParsedNotices([])
    }
  }, [])

  const handleParse = () => {
    parseAndAdd(rawHeaders)
  }

  const handleCopyCurl = () => {
    const headers = {}
    rawHeaders.split('\n').forEach(line => {
      const colon = line.indexOf(':')
      if (colon > 0) {
        const key = line.substring(0, colon).trim()
        const value = line.substring(colon + 1).trim()
        if (key && value) {
          headers[key] = value
        }
      }
    })
    const curl = generateCurlTemplate('https://api.example.com/endpoint', 'GET', headers)
    navigator.clipboard.writeText(curl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getCurlText = () => {
    const headers = {}
    rawHeaders.split('\n').forEach(line => {
      const colon = line.indexOf(':')
      if (colon > 0) {
        const key = line.substring(0, colon).trim()
        const value = line.substring(colon + 1).trim()
        if (key && value) {
          headers[key] = value
        }
      }
    })
    return generateCurlTemplate('https://api.example.com/endpoint', 'GET', headers)
  }

  return (
    <div className="http-deprecation-demo">
      <h1 className="http-deprecation-demo__title">
        HTTP 废弃与过期横幅演示
      </h1>

      <section className="http-deprecation-demo__section">
        <h2 className="http-deprecation-demo__section-title">
          示例场景
        </h2>
        <div className="http-deprecation-demo__scenarios">
          {EXAMPLE_SCENARIOS.map(scenario => (
            <button
              key={scenario.id}
              className="http-deprecation-demo__scenario-btn"
              onClick={() => handleScenarioClick(scenario)}
            >
              <div className="http-deprecation-demo__scenario-name">
                {scenario.name}
              </div>
              <div className="http-deprecation-demo__scenario-desc">
                {scenario.description}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="http-deprecation-demo__section">
        <h2 className="http-deprecation-demo__section-title">
          自定义输入（状态行 + 头）
        </h2>
        <textarea
          className="http-deprecation-demo__textarea"
          value={rawHeaders}
          onChange={(e) => setRawHeaders(e.target.value)}
          placeholder={`HTTP/1.1 200 OK
Deprecation: Sun, 01 Jan 2026 00:00:00 GMT
Sunset: Mon, 01 Feb 2026 00:00:00 GMT
Link: <https://api.example.com/docs/deprecation>; rel="deprecation"
Warning: 299 - "此 API 即将废弃，请尽快迁移"`}
        />
        <button
          className="http-deprecation-demo__parse-btn"
          onClick={handleParse}
        >
          解析头信息
        </button>
      </section>

      {parsedNotices.length > 0 && (
        <section className="http-deprecation-demo__results">
          <h2 className="http-deprecation-demo__section-title">
            解析结果
          </h2>

          {parsedNotices.map((notice, idx) => (
            <div key={idx} style={{ marginBottom: '24px' }}>
              <div className="http-deprecation-demo__two-col">
                <div>
                  <h3 className="http-deprecation-demo__col-title">
                    人类可读
                  </h3>
                  <div className="http-deprecation-demo__human">
                    <div className="http-deprecation-demo__human-message">
                      {getHumanReadableMessage(notice)}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="http-deprecation-demo__col-title">
                    机器可读
                  </h3>
                  <div className="http-deprecation-demo__machine">
                    <pre className="http-deprecation-demo__machine-code">
                      {JSON.stringify(getMachineReadableSummary(notice), null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="http-deprecation-demo__curl-section">
            <h3 className="http-deprecation-demo__section-title">
              cURL 复现模板
            </h3>
            <div className="http-deprecation-demo__curl-box">
              <code className="http-deprecation-demo__curl-code">
                {getCurlText()}
              </code>
              <button
                className="http-deprecation-demo__curl-copy"
                onClick={handleCopyCurl}
              >
                {copied ? '已复制!' : '复制'}
              </button>
            </div>
          </div>
        </section>
      )}

      {allNotices.length > 0 && (
        <DeprecationBannerContainer
          notices={allNotices}
          onSnooze={() => setAllNotices([...allNotices])}
        />
      )}
    </div>
  )
}

export default HttpDeprecationSunsetDemo
