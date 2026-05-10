
import { useCallback, useRef, useState } from 'react'
import {
  ApiError,
  compressXml,
  formatXml,
  INDENT_TYPE_OPTIONS,
  INDENT_WIDTH_OPTIONS,
  DECLARATION_POLICY_OPTIONS,
  COMMENT_POLICY_OPTIONS,
} from '../services/xmlApi'

/**
 * XSS 安全转义
 * 仅转义 HTML 特殊字符，保留换行符等空白字符不变
 * 所有不可信用户输入、错误信息、路径列表均需通过此函数展示
 */
function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 错误码到用户友好文案的映射
 * 错误码来源为后端 XML API（DOC_003），需与后端保持一致
 */
const ERROR_CODE_MESSAGES = {
  NULL_INPUT: '输入不能为空（XML 字符串缺失或为 null）',
  EMPTY_INPUT: '输入不能为空字符串（仅空白字符）',
  INVALID_INDENT: '缩进参数无效（类型需为 SPACE/TAB，宽度需为 1-8）',
  PARSE_FAILED: 'XML 解析失败',
  TRANSFORM_FAILED: 'XML 转换失败',
  HTTP_ERROR: '网络请求失败',
  UNKNOWN_ERROR: '未知错误',
}

function getErrorMessage(err) {
  if (err instanceof ApiError) {
    const base = err.errorMessage || ERROR_CODE_MESSAGES[err.errorCode] || err.errorCode
    return base
  }
  return err?.message || '请求失败，请稍后重试'
}

export default function XmlTool() {
  const [xmlInput, setXmlInput] = useState('')

  // 格式化选项
  const [indentType, setIndentType] = useState('SPACE')
  const [indentWidth, setIndentWidth] = useState(2)
  const [formatDeclarationPolicy, setFormatDeclarationPolicy] = useState('KEEP')
  const [formatCommentPolicy, setFormatCommentPolicy] = useState('KEEP')
  const [formatIncludeStructure, setFormatIncludeStructure] = useState(false)

  // 压缩选项
  const [compressDeclarationPolicy, setCompressDeclarationPolicy] = useState('KEEP')
  const [compressCommentPolicy, setCompressCommentPolicy] = useState('KEEP')
  const [compressIncludeStructure, setCompressIncludeStructure] = useState(false)

  // 结果状态
  const [formatResult, setFormatResult] = useState(null)
  const [formatStructure, setFormatStructure] = useState(null)
  const [compressResult, setCompressResult] = useState(null)
  const [compressStructure, setCompressStructure] = useState(null)

  // 加载和错误状态
  const [loading, setLoading] = useState({
    format: false,
    compress: false,
  })
  const [error, setError] = useState({
    format: null,
    compress: null,
  })
  const [copyStatus, setCopyStatus] = useState(null)

  const formatResultRef = useRef(null)
  const compressResultRef = useRef(null)

  const handleCopy = useCallback(async (text, label) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus({ type: 'success', message: `${label} 已复制到剪贴板` })
    } catch (err) {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      textarea.style.width = '1px'
      textarea.style.height = '1px'
      document.body.appendChild(textarea)
      try {
        textarea.select()
        document.execCommand('copy')
        setCopyStatus({ type: 'success', message: `${label} 已复制到剪贴板` })
      } catch {
        setCopyStatus({ type: 'error', message: `复制失败：${err?.message || '未知错误'}` })
      }
      document.body.removeChild(textarea)
    }
    setTimeout(() => setCopyStatus(null), 2500)
  }, [])

  const handleFormat = useCallback(async () => {
    setLoading((prev) => ({ ...prev, format: true }))
    setError((prev) => ({ ...prev, format: null }))
    setFormatResult(null)
    setFormatStructure(null)

    try {
      const result = await formatXml(
        {
          xmlString: xmlInput,
          indentType,
          indentWidth,
          declarationPolicy: formatDeclarationPolicy,
          commentPolicy: formatCommentPolicy,
          includeStructure: formatIncludeStructure,
        },
        'format'
      )
      setFormatResult(result.output)
      if (result.structure) {
        setFormatStructure(result.structure)
      }
    } catch (err) {
      const message = getErrorMessage(err)
      const nodePath = err instanceof ApiError ? err.nodePath : ''
      const lineNumber = err instanceof ApiError ? err.lineNumber : undefined
      const columnNumber = err instanceof ApiError ? err.columnNumber : undefined
      setError((prev) => ({
        ...prev,
        format: {
          message,
          nodePath,
          lineNumber,
          columnNumber,
          code: err?.errorCode,
        },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, format: false }))
    }
  }, [xmlInput, indentType, indentWidth, formatDeclarationPolicy, formatCommentPolicy, formatIncludeStructure])

  const handleCompress = useCallback(async () => {
    setLoading((prev) => ({ ...prev, compress: true }))
    setError((prev) => ({ ...prev, compress: null }))
    setCompressResult(null)
    setCompressStructure(null)

    try {
      const result = await compressXml(
        {
          xmlString: xmlInput,
          declarationPolicy: compressDeclarationPolicy,
          commentPolicy: compressCommentPolicy,
          includeStructure: compressIncludeStructure,
        },
        'compress'
      )
      setCompressResult(result.output)
      if (result.structure) {
        setCompressStructure(result.structure)
      }
    } catch (err) {
      const message = getErrorMessage(err)
      const nodePath = err instanceof ApiError ? err.nodePath : ''
      const lineNumber = err instanceof ApiError ? err.lineNumber : undefined
      const columnNumber = err instanceof ApiError ? err.columnNumber : undefined
      setError((prev) => ({
        ...prev,
        compress: {
          message,
          nodePath,
          lineNumber,
          columnNumber,
          code: err?.errorCode,
        },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, compress: false }))
    }
  }, [xmlInput, compressDeclarationPolicy, compressCommentPolicy, compressIncludeStructure])

  /**
   * 渲染错误提示框
   * 展示错误码、错误消息，以及后端返回的节点路径和行列号（用于定位解析错误）
   */
  const renderErrorBox = (err) => {
    if (!err) return null
    return (
      <div className="error-box">
        <strong>{err.code ? `[${err.code}] ` : ''}操作失败</strong>
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(err.message) }} />
        {err.nodePath && (
          <p className="error-path" dangerouslySetInnerHTML={{
            __html: `节点路径：<code>${escapeHtml(err.nodePath)}</code>`,
          }} />
        )}
        {(err.lineNumber != null || err.columnNumber != null) && (
          <p className="error-location">
            <span dangerouslySetInnerHTML={{
              __html: `位置：${
                err.lineNumber != null ? `行 ${err.lineNumber}` : ''
              }${
                err.lineNumber != null && err.columnNumber != null ? '，' : ''
              }${
                err.columnNumber != null ? `列 ${err.columnNumber}` : ''
              }`,
            }} />
          </p>
        )}
      </div>
    )
  }

  /**
   * 渲染文档结构摘要
   * 包含根元素名、元素总数、最大深度和元素路径列表
   */
  const renderStructure = (structure, label) => {
    if (!structure) return null
    return (
      <div className="structure-box">
        <div className="result-header">
          <span className="result-label">{label}</span>
          {structure.elementPaths && structure.elementPaths.length > 0 && (
            <button
              className="copy-btn"
              onClick={() => handleCopy(
                structure.elementPaths.join('\n'),
                '结构路径列表'
              )}
            >
              复制路径
            </button>
          )}
        </div>
        <div className="structure-meta">
          <div className="meta-item">
            <span className="meta-label">根元素：</span>
            <code dangerouslySetInnerHTML={{ __html: escapeHtml(structure.rootElementName || '-') }} />
          </div>
          <div className="meta-item">
            <span className="meta-label">元素总数：</span>
            <strong>{structure.totalElements ?? '-'}</strong>
          </div>
          <div className="meta-item">
            <span className="meta-label">最大深度：</span>
            <strong>{structure.maxDepth ?? '-'}</strong>
          </div>
        </div>
        {structure.elementPaths && structure.elementPaths.length > 0 && (
          <>
            <h4>元素路径列表</h4>
            <ul className="path-list">
              {structure.elementPaths.map((path, idx) => (
                <li
                  key={idx}
                  dangerouslySetInnerHTML={{
                    __html: `<code>${escapeHtml(path)}</code>`,
                  }}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="xml-tool">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(copyStatus.message) }} />
        </div>
      )}

      <section className="tool-section input-section">
        <h2>XML 输入</h2>
        <div className="form-group full-width">
          <label htmlFor="xml-input">XML 文本</label>
          <textarea
            id="xml-input"
            className="xml-textarea"
            value={xmlInput}
            onChange={(e) => setXmlInput(e.target.value)}
            placeholder="粘贴或输入 XML 文本..."
            spellCheck={false}
          />
          <div className="input-hint">支持多行输入，包括声明、命名空间、CDATA、注释等</div>
        </div>
      </section>

      <section className="tool-section format-section">
        <h2>XML 格式化</h2>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="format-indent-type">缩进类型</label>
            <select
              id="format-indent-type"
              value={indentType}
              onChange={(e) => setIndentType(e.target.value)}
            >
              {INDENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="format-indent-width">缩进宽度</label>
            <select
              id="format-indent-width"
              value={indentWidth}
              onChange={(e) => setIndentWidth(Number(e.target.value))}
            >
              {INDENT_WIDTH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="input-hint">
              TAB 时每层仍为一个制表符，宽度仅用于合法校验（1-8）
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="format-declaration">声明策略</label>
            <select
              id="format-declaration"
              value={formatDeclarationPolicy}
              onChange={(e) => setFormatDeclarationPolicy(e.target.value)}
            >
              {DECLARATION_POLICY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="format-comment">注释策略</label>
            <select
              id="format-comment"
              value={formatCommentPolicy}
              onChange={(e) => setFormatCommentPolicy(e.target.value)}
            >
              {COMMENT_POLICY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formatIncludeStructure}
                onChange={(e) => setFormatIncludeStructure(e.target.checked)}
              />
              <span>请求文档结构摘要</span>
            </label>
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleFormat}
            disabled={loading.format || !xmlInput.trim()}
          >
            {loading.format ? '格式化中...' : '格式化'}
          </button>
        </div>

        {renderErrorBox(error.format)}

        {formatResult != null && (
          <div className="result-box">
            <div className="result-header">
              <span className="result-label">格式化结果</span>
              <button
                className="copy-btn"
                onClick={() => handleCopy(formatResult, '格式化结果')}
              >
                复制
              </button>
            </div>
            <pre
              ref={formatResultRef}
              className="result-text"
              dangerouslySetInnerHTML={{ __html: escapeHtml(formatResult) }}
            />
          </div>
        )}

        {renderStructure(formatStructure, '文档结构（格式化）')}
      </section>

      <div className="section-divider" />

      <section className="tool-section compress-section">
        <h2>XML 压缩</h2>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="compress-declaration">声明策略</label>
            <select
              id="compress-declaration"
              value={compressDeclarationPolicy}
              onChange={(e) => setCompressDeclarationPolicy(e.target.value)}
            >
              {DECLARATION_POLICY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="compress-comment">注释策略</label>
            <select
              id="compress-comment"
              value={compressCommentPolicy}
              onChange={(e) => setCompressCommentPolicy(e.target.value)}
            >
              {COMMENT_POLICY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={compressIncludeStructure}
                onChange={(e) => setCompressIncludeStructure(e.target.checked)}
              />
              <span>请求文档结构摘要</span>
            </label>
          </div>
        </div>

        <div className="action-row">
          <button
            className="secondary-btn"
            onClick={handleCompress}
            disabled={loading.compress || !xmlInput.trim()}
          >
            {loading.compress ? '压缩中...' : '压缩（紧凑单行）'}
          </button>
        </div>

        {renderErrorBox(error.compress)}

        {compressResult != null && (
          <div className="result-box">
            <div className="result-header">
              <span className="result-label">压缩结果</span>
              <button
                className="copy-btn"
                onClick={() => handleCopy(compressResult, '压缩结果')}
              >
                复制
              </button>
            </div>
            <pre
              ref={compressResultRef}
              className="result-text compressed"
              dangerouslySetInnerHTML={{ __html: escapeHtml(compressResult) }}
            />
          </div>
        )}

        {renderStructure(compressStructure, '文档结构（压缩）')}
      </section>

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>核心解析、格式化与压缩语义由后端统一执行，确保与 devtools 约定一致</li>
          <li>声明策略：KEEP 保留原声明，REMOVE 移除，REWRITE 重写为标准 UTF-8 声明</li>
          <li>注释策略：KEEP 保留所有注释，REMOVE 移除所有注释</li>
          <li>大文本处理：请求可取消；若后端返回请求体超限或超时，请适当分段或重试</li>
          <li>CDATA、命名空间、实体引用等处理以语义保持为准，不宣称与原文完全一致</li>
          <li>所有用户输入、错误信息与路径均经转义展示，避免 XSS</li>
        </ul>
      </div>
    </div>
  )
}
