import { useCallback, useRef, useState, useEffect } from 'react'
import {
  generateLoremIpsum,
  getSuggestionForError,
  EXAMPLES,
  GENERATION_MODES,
  PARAGRAPH_SEPARATION,
  COUNT_MODES,
  SEED_MODES,
  MIN_PARAGRAPHS,
  MAX_PARAGRAPHS,
  MIN_WORDS_PER_PARAGRAPH,
  MAX_WORDS_PER_PARAGRAPH,
  MIN_TOTAL_WORDS,
  MAX_TOTAL_WORDS,
  MAX_PRODUCT,
} from './logic/index.js'
import './LoremIpsumGeneratorTool.css'

const LARGE_TEXT_THRESHOLD = 20000
const CHUNK_SIZE = 5000
const CHUNK_DELAY_MS = 30

function formatNumber(n) {
  if (n == null) return '-'
  return n.toLocaleString()
}

export default function LoremIpsumGeneratorTool() {
  const [generationMode, setGenerationMode] = useState(GENERATION_MODES.BY_PARAGRAPHS)
  const [paragraphCount, setParagraphCount] = useState(3)
  const [wordsPerParagraph, setWordsPerParagraph] = useState(50)
  const [totalWords, setTotalWords] = useState(200)
  const [includeTitle, setIncludeTitle] = useState(false)
  const [paragraphSeparation, setParagraphSeparation] = useState(PARAGRAPH_SEPARATION.DOUBLE_NEWLINE)
  const [seedMode, setSeedMode] = useState(SEED_MODES.RANDOM)
  const [seedValue, setSeedValue] = useState(42)

  const [generatedText, setGeneratedText] = useState('')
  const [generationResult, setGenerationResult] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [errorSuggestion, setErrorSuggestion] = useState(null)

  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [copyStatus, setCopyStatus] = useState(null)

  const textareaRef = useRef(null)
  const generationAbortRef = useRef(false)

  const handleGenerateAsync = useCallback(async () => {
    generationAbortRef.current = false
    setIsGenerating(true)
    setErrorCode(null)
    setErrorMessage('')
    setErrorSuggestion(null)
    setGenerationProgress(0)

    const params = {
      mode: generationMode,
      paragraphCount: Number(paragraphCount),
      wordsPerParagraph: Number(wordsPerParagraph),
      totalWords: Number(totalWords),
      includeTitle,
      paragraphSeparation,
      countMode: COUNT_MODES.EXCLUDE_SPACES,
      seedMode,
      seed: Number(seedValue),
    }

    const validation = generateLoremIpsum(params)
    if (validation.errorCode) {
      setErrorCode(validation.errorCode)
      setErrorMessage(validation.error?.message || '生成失败')
      setErrorSuggestion(getSuggestionForError(validation.errorCode, params))
      setIsGenerating(false)
      return
    }

    const targetWordCount = generationMode === GENERATION_MODES.BY_PARAGRAPHS
      ? paragraphCount * wordsPerParagraph
      : totalWords

    if (targetWordCount >= LARGE_TEXT_THRESHOLD) {
      setGeneratedText('')
      const totalChunks = Math.ceil(targetWordCount / CHUNK_SIZE)

      let accumulated = ''
      for (let i = 0; i < totalChunks; i++) {
        if (generationAbortRef.current) {
          setIsGenerating(false)
          return
        }

        const chunkWords = Math.min(CHUNK_SIZE, targetWordCount - (i * CHUNK_SIZE))
        const chunkParams = {
          ...params,
          mode: GENERATION_MODES.BY_WORD_COUNT,
          totalWords: chunkWords,
          includeTitle: i === 0 && includeTitle,
          seed: seedMode === SEED_MODES.FIXED ? Number(seedValue) + i * 1000 : Number(seedValue) + i,
          paragraphSeparation: i === 0 ? paragraphSeparation : PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
        }

        const chunkResult = generateLoremIpsum(chunkParams)
        if (chunkResult.errorCode) {
          setErrorCode(chunkResult.errorCode)
          setErrorMessage(chunkResult.error?.message || '生成失败')
          setIsGenerating(false)
          return
        }

        if (i === 0) {
          accumulated = chunkResult.result.text
        } else {
          accumulated += '\n\n' + chunkResult.result.text
        }
        setGeneratedText(accumulated)
        setGenerationProgress(((i + 1) / totalChunks) * 100)

        await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY_MS))
      }

      setGenerationProgress(100)
      setGenerationResult({
        text: accumulated,
        wordStats: {
          totalWords: targetWordCount,
          wordsPerParagraph: [],
        },
        charStats: {
          totalCharacters: accumulated.length,
          charactersPerLine: [],
          countMode: COUNT_MODES.EXCLUDE_SPACES,
        },
      })
    } else {
      const result = generateLoremIpsum(params)
      if (result.errorCode) {
        setErrorCode(result.errorCode)
        setErrorMessage(result.error?.message || '生成失败')
        setErrorSuggestion(getSuggestionForError(result.errorCode, params))
      } else {
        setGeneratedText(result.result.text)
        setGenerationResult(result.result)
        setGenerationProgress(100)
      }
    }

    setIsGenerating(false)
  }, [
    generationMode,
    paragraphCount,
    wordsPerParagraph,
    totalWords,
    includeTitle,
    paragraphSeparation,
    seedMode,
    seedValue,
  ])

  const handleCopy = useCallback(async () => {
    const content = generatedText
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopyStatus({ type: 'success', message: '已复制到剪贴板' })
    } catch (err) {
      const textarea = document.createElement('textarea')
      textarea.value = content
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      try {
        textarea.select()
        document.execCommand('copy')
        setCopyStatus({ type: 'success', message: '已复制到剪贴板' })
      } catch {
        setCopyStatus({ type: 'error', message: `复制失败：${err?.message || '未知错误'}` })
      }
      document.body.removeChild(textarea)
    }
    setTimeout(() => setCopyStatus(null), 2500)
  }, [generatedText])

  const handleDownload = useCallback(() => {
    const content = generatedText
    if (!content) return

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lorem-ipsum-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [generatedText])

  const handleLoadExample = useCallback((exampleKey) => {
    const example = EXAMPLES[exampleKey]
    if (!example) return

    setGenerationMode(example.mode)
    if (example.mode === GENERATION_MODES.BY_PARAGRAPHS) {
      setParagraphCount(example.params.paragraphCount)
      setWordsPerParagraph(example.params.wordsPerParagraph)
    } else {
      setTotalWords(example.params.totalWords)
    }
    setIncludeTitle(example.params.includeTitle)
    setParagraphSeparation(example.params.paragraphSeparation)
    setGeneratedText('')
    setGenerationResult(null)
    setErrorCode(null)
  }, [])

  const handleClear = useCallback(() => {
    generationAbortRef.current = true
    setGeneratedText('')
    setGenerationResult(null)
    setErrorCode(null)
    setErrorMessage('')
    setErrorSuggestion(null)
    setIsGenerating(false)
    setGenerationProgress(0)
  }, [])

  const estimatedTotalWords = generationMode === GENERATION_MODES.BY_PARAGRAPHS
    ? paragraphCount * wordsPerParagraph
    : totalWords

  const isLargeGeneration = estimatedTotalWords >= LARGE_TEXT_THRESHOLD

  const renderErrorBox = () => {
    if (!errorCode) return null

    let suggestionText = ''
    if (errorSuggestion) {
      if (errorSuggestion.reduceParagraphs !== null || errorSuggestion.reduceWordsPerParagraph !== null) {
        const parts = []
        if (errorSuggestion.reduceParagraphs !== null) {
          parts.push(`将段落数减少到 ${errorSuggestion.reduceParagraphs} 以内`)
        }
        if (errorSuggestion.reduceWordsPerParagraph !== null) {
          parts.push(`将单段词数减少到 ${errorSuggestion.reduceWordsPerParagraph} 以内`)
        }
        suggestionText = `建议：${parts.join(' 或 ')}（上限：${errorSuggestion.maxProduct}）`
      } else if (errorSuggestion.min !== undefined) {
        suggestionText = `有效范围：${errorSuggestion.min} - ${errorSuggestion.max}`
      }
    }

    return (
      <div className="error-box">
        <div className="error-code">
          <span className="error-label">错误码</span>
          <code>{errorCode}</code>
        </div>
        <p>{errorMessage}</p>
        {suggestionText && <p className="suggestion">{suggestionText}</p>}
      </div>
    )
  }

  return (
    <div className="lorem-ipsum-generator">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>Lorem Ipsum 占位假文生成器</h2>

        <div className="form-group">
          <label>生成模式</label>
          <div className="mode-tabs">
            <button
              type="button"
              className={`mode-tab ${generationMode === GENERATION_MODES.BY_PARAGRAPHS ? 'active' : ''}`}
              onClick={() => setGenerationMode(GENERATION_MODES.BY_PARAGRAPHS)}
            >
              按段落数
            </button>
            <button
              type="button"
              className={`mode-tab ${generationMode === GENERATION_MODES.BY_WORD_COUNT ? 'active' : ''}`}
              onClick={() => setGenerationMode(GENERATION_MODES.BY_WORD_COUNT)}
            >
              按总字数
            </button>
          </div>
        </div>

        {generationMode === GENERATION_MODES.BY_PARAGRAPHS && (
          <div className="inputs-row">
            <div className="form-group">
              <label htmlFor="paragraph-count">段落数 ({MIN_PARAGRAPHS}-{MAX_PARAGRAPHS})</label>
              <input
                id="paragraph-count"
                type="number"
                min={MIN_PARAGRAPHS}
                max={MAX_PARAGRAPHS}
                value={paragraphCount}
                onChange={(e) => setParagraphCount(Math.max(MIN_PARAGRAPHS, Math.min(MAX_PARAGRAPHS, Number(e.target.value) || 1)))}
                className="number-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="words-per-paragraph">单段词数 ({MIN_WORDS_PER_PARAGRAPH}-{MAX_WORDS_PER_PARAGRAPH})</label>
              <input
                id="words-per-paragraph"
                type="number"
                min={MIN_WORDS_PER_PARAGRAPH}
                max={MAX_WORDS_PER_PARAGRAPH}
                value={wordsPerParagraph}
                onChange={(e) => setWordsPerParagraph(Math.max(MIN_WORDS_PER_PARAGRAPH, Math.min(MAX_WORDS_PER_PARAGRAPH, Number(e.target.value) || 1)))}
                className="number-input"
              />
            </div>
          </div>
        )}

        {generationMode === GENERATION_MODES.BY_WORD_COUNT && (
          <div className="form-group">
            <label htmlFor="total-words">总词数 ({MIN_TOTAL_WORDS}-{MAX_TOTAL_WORDS})</label>
            <input
              id="total-words"
              type="number"
              min={MIN_TOTAL_WORDS}
              max={MAX_TOTAL_WORDS}
              value={totalWords}
              onChange={(e) => setTotalWords(Math.max(MIN_TOTAL_WORDS, Math.min(MAX_TOTAL_WORDS, Number(e.target.value) || 1)))}
              className="number-input"
            />
          </div>
        )}

        <div className="product-warning">
          <span>预计总词数：</span>
          <strong>{formatNumber(estimatedTotalWords)}</strong>
          <span className="product-limit">（上限 {formatNumber(MAX_PRODUCT)}）</span>
          {estimatedTotalWords > MAX_PRODUCT && (
            <span className="product-exceed"> ⚠️ 超限</span>
          )}
        </div>

        <div className="options-row">
          <div className="option-group">
            <label htmlFor="paragraph-separation">段落分隔</label>
            <select
              id="paragraph-separation"
              value={paragraphSeparation}
              onChange={(e) => setParagraphSeparation(e.target.value)}
            >
              <option value={PARAGRAPH_SEPARATION.SINGLE_NEWLINE}>单换行符</option>
              <option value={PARAGRAPH_SEPARATION.DOUBLE_NEWLINE}>双换行符（推荐）</option>
              <option value={PARAGRAPH_SEPARATION.HTML_PARAGRAPH}>HTML &lt;p&gt; 标签</option>
            </select>
          </div>

          <div className="option-group">
            <label>随机模式</label>
            <div className="seed-mode-group">
              <label className="radio-label">
                <input
                  type="radio"
                  checked={seedMode === SEED_MODES.RANDOM}
                  onChange={() => setSeedMode(SEED_MODES.RANDOM)}
                />
                <span>真随机</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  checked={seedMode === SEED_MODES.FIXED}
                  onChange={() => setSeedMode(SEED_MODES.FIXED)}
                />
                <span>固定种子（可复现）</span>
              </label>
            </div>
          </div>

          {seedMode === SEED_MODES.FIXED && (
            <div className="option-group">
              <label htmlFor="seed-value">种子值</label>
              <input
                id="seed-value"
                type="number"
                value={seedValue}
                onChange={(e) => setSeedValue(Number(e.target.value) || 0)}
                className="number-input"
              />
            </div>
          )}

          <div className="option-group checkbox-option">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeTitle}
                onChange={(e) => setIncludeTitle(e.target.checked)}
              />
              <span>包含标题行</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>示例</label>
          <div className="example-buttons">
            {Object.entries(EXAMPLES).map(([key, example]) => (
              <button
                key={key}
                type="button"
                className="example-btn"
                onClick={() => handleLoadExample(key)}
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleGenerateAsync}
            disabled={isGenerating || estimatedTotalWords > MAX_PRODUCT}
          >
            {isGenerating ? '生成中...' : '生成'}
          </button>
          {generatedText && (
            <>
              <button className="secondary-btn" onClick={handleCopy}>
                复制全文
              </button>
              <button className="secondary-btn" onClick={handleDownload}>
                下载 .txt
              </button>
            </>
          )}
          <button className="secondary-btn" onClick={handleClear}>
            清空
          </button>
        </div>

        {isLargeGeneration && (
          <div className="info-banner">
            ℹ️ 大体量内容将采用分帧生成策略，避免页面卡顿。生成中可随时点击「清空」停止。
          </div>
        )}

        {isGenerating && (
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <span className="progress-text">{Math.round(generationProgress)}%</span>
          </div>
        )}
      </section>

      {renderErrorBox()}

      {generatedText && !errorCode && (
        <section className="tool-section">
          <div className="result-header">
            <h3>生成结果</h3>
            {generationResult?.wordStats && (
              <div className="result-stats">
                <span>总词数：<strong>{formatNumber(generationResult.wordStats.totalWords)}</strong></span>
                {generationResult.seed !== null && (
                  <span>种子：<code>{generationResult.seed}</code></span>
                )}
                {generationResult?.charStats && (
                  <span>字符数：<strong>{formatNumber(generationResult.charStats.totalCharacters)}</strong></span>
                )}
              </div>
            )}
          </div>
          <div className="textarea-container">
            <textarea
              ref={textareaRef}
              className="output-textarea"
              value={generatedText}
              readOnly
              spellCheck={false}
            />
          </div>
        </section>
      )}

      {!generatedText && !isGenerating && !errorCode && (
        <section className="tool-section">
          <div className="empty-state">
            配置参数后点击「生成」创建占位假文
          </div>
        </section>
      )}

      <section className="notes-section">
        <h3>📖 说明与限制</h3>
        <ul>
          <li>
            <strong>生成模式：</strong>
            <ul>
              <li><code>按段落数</code>：指定段落数和每段词数</li>
              <li><code>按总字数</code>：指定总词数，自动分段（约5段）</li>
            </ul>
          </li>
          <li>
            <strong>段落分隔策略：</strong>
            <ul>
              <li><code>单换行符</code>：段落之间用一个 <code>\n</code> 分隔</li>
              <li><code>双换行符</code>：段落之间用 <code>\n\n</code> 分隔（排版更清晰）</li>
              <li><code>HTML &lt;p&gt;</code>：每个段落用 <code>&lt;p&gt;</code> 标签包裹</li>
            </ul>
          </li>
          <li>
            <strong>种子模式语义差异：</strong>
            <ul>
              <li><code>真随机</code>：每次生成使用浏览器内置 <code>Math.random()</code>，结果不可复现</li>
              <li><code>固定种子</code>：使用线性同余生成器（LCG），相同种子值每次生成相同文本，便于 UI 调试和测试</li>
            </ul>
          </li>
          <li>
            <strong>字数统计口径（页内固定）：</strong>
            <ul>
              <li>词数：按空白字符分割统计，不含连续空白</li>
              <li>字符数：不计空格、换行等空白字符</li>
            </ul>
          </li>
          <li>
            <strong>上限与超限处理：</strong>
            <ul>
              <li>段落数上限：{MAX_PARAGRAPHS}</li>
              <li>单段词数上限：{MAX_WORDS_PER_PARAGRAPH}</li>
              <li>总词数上限：{MAX_PRODUCT}（段落数 × 单段词数 不允许超限）</li>
              <li>超限会显示 <code>errorCode</code> 并提供调整建议，<strong>不会静默截断</strong></li>
            </ul>
          </li>
          <li>
            <strong>大体量内容：</strong>超过 {LARGE_TEXT_THRESHOLD} 词采用分帧生成策略，每 {CHUNK_SIZE} 词一帧，
            每帧之间留出 {CHUNK_DELAY_MS}ms 给浏览器渲染，避免页面长时间卡顿。
          </li>
          <li>
            <strong>安全性：</strong>生成内容不包含任何外链、脚本或可执行代码，仅作版面占位说明使用。
          </li>
        </ul>
      </section>
    </div>
  )
}
