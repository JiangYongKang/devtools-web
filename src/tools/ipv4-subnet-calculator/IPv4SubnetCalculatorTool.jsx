import { useCallback, useMemo, useState, useEffect } from 'react'
import {
  buildDerivedInput,
  calculateSubnetSplits,
  parseIPv4,
  EXAMPLES,
  prefixToMaskDotted,
} from './logic/index.js'
import './IPv4SubnetCalculatorTool.css'

export default function IPv4SubnetCalculatorTool() {
  const [addressDotted, setAddressDotted] = useState('192.168.1.100')
  const [prefixLengthOrNull, setPrefixLengthOrNull] = useState(24)
  const [maskDottedOrNull, setMaskDottedOrNull] = useState('')
  const [inputMode, setInputMode] = useState('prefix')
  const [result, setResult] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [targetSplitPrefix, setTargetSplitPrefix] = useState(null)

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

  const handleCalculate = useCallback(() => {
    const calculated = buildDerivedInput({
      addressDotted,
      maskDottedOrNull: inputMode === 'mask' ? maskDottedOrNull : null,
      prefixLengthOrNull: inputMode === 'prefix' ? prefixLengthOrNull : null,
      deriveMode: inputMode,
    })
    setResult(calculated)
    setTargetSplitPrefix(null)
  }, [addressDotted, maskDottedOrNull, prefixLengthOrNull, inputMode])

  const handleClear = useCallback(() => {
    setAddressDotted('')
    setPrefixLengthOrNull('')
    setMaskDottedOrNull('')
    setResult(null)
    setTargetSplitPrefix(null)
  }, [])

  const handleLoadExample = useCallback((example) => {
    setAddressDotted(example.address)
    setPrefixLengthOrNull(example.prefix)
    setMaskDottedOrNull('')
    setInputMode('prefix')
    setResult(null)
    setTargetSplitPrefix(null)
  }, [])

  const handleAddressChange = useCallback((e) => {
    setAddressDotted(e.target.value)
    setResult(null)
  }, [])

  const handlePrefixChange = useCallback((e) => {
    const val = e.target.value
    if (val === '' || val == null) {
      setPrefixLengthOrNull(null)
    } else {
      const num = Number(val)
      if (!Number.isNaN(num)) {
        setPrefixLengthOrNull(num)
      }
    }
    setResult(null)
  }, [])

  const handleMaskChange = useCallback((e) => {
    setMaskDottedOrNull(e.target.value)
    setResult(null)
  }, [])

  const handleInputModeChange = useCallback((mode) => {
    setInputMode(mode)
    setResult(null)
  }, [])

  const addressValid = useMemo(() => {
    if (!addressDotted || addressDotted.trim() === '') return null
    const parsed = parseIPv4(addressDotted)
    return parsed.error == null
  }, [addressDotted])

  const splitPrefixOptions = useMemo(() => {
    if (!result || result.errorCode) return []
    const current = result.prefix
    const options = []
    for (let p = current + 1; p <= 32; p++) {
      options.push(p)
    }
    return options
  }, [result])

  const subnetSplitResult = useMemo(() => {
    if (!result || result.errorCode || !targetSplitPrefix) return null
    return calculateSubnetSplits({
      networkInt: result.networkInt,
      currentPrefix: result.prefix,
      targetPrefix: targetSplitPrefix,
    })
  }, [result, targetSplitPrefix])

  useEffect(() => {
    handleCalculate()
  }, [])

  const renderResultCards = () => {
    if (!result || result.errorCode) return null

    const items = [
      { label: '网络地址', value: result.networkAddress },
      { label: '广播地址', value: result.broadcastAddress },
      { label: '子网掩码', value: result.maskDotted },
      { label: '前缀长度', value: `/${result.prefix}` },
      { label: 'Wildcard Mask', value: result.wildcardMask },
      { label: '可用主机数', value: result.hostCount.toString() },
    ]

    return (
      <div className="results-grid">
        {items.map((item) => (
          <div key={item.label} className="result-card">
            <div className="result-card-header">
              <div className="result-label">{item.label}</div>
              <button
                className="copy-btn"
                onClick={() => handleCopy(item.value, item.label)}
              >
                复制
              </button>
            </div>
            <div className="result-value small">{item.value}</div>
          </div>
        ))}
        <div className="result-card highlight">
          <div className="result-label">可用主机范围</div>
          <div className="host-range">
            <span>{result.firstHost}</span>
            <span>~</span>
            <span>{result.lastHost}</span>
          </div>
        </div>
      </div>
    )
  }

  const renderBinaryView = () => {
    if (!result || result.errorCode) return null

    return (
      <div className="binary-section">
        <h3>二进制展开视图</h3>
        <table className="binary-table">
          <thead>
            <tr>
              <th>项目</th>
              <th>八位组 1</th>
              <th>八位组 2</th>
              <th>八位组 3</th>
              <th>八位组 4</th>
            </tr>
          </thead>
          <tbody>
            {result.binaryRows.map((row) => (
              <tr key={row.label}>
                <td className="binary-label">{row.label}</td>
                {row.octetDetails.map((octet, idx) => (
                  <td key={idx}>
                    <div className="binary-octet">
                      <div className="decimal">{octet.octet}</div>
                      <div className="binary">
                        <span className="network-part">{octet.networkPart}</span>
                        <span className="host-part">{octet.hostPart}</span>
                      </div>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderWarnings = () => {
    if (!result || result.errorCode || !result.warnings || result.warnings.length === 0) {
      return null
    }

    return (
      <div className="warnings-section">
        {result.warnings.map((warning, idx) => (
          <div key={idx} className={`warning-item ${warning.level}`}>
            {warning.code && <div className="warning-code">{warning.code}</div>}
            <div className="warning-message">{warning.message}</div>
          </div>
        ))}
      </div>
    )
  }

  const renderSubnetSplit = () => {
    if (!result || result.errorCode) return null

    return (
      <div className="subnet-split-section">
        <h3>子网拆分建议</h3>
        <div className="subnet-split-controls">
          <div className="form-group">
            <label htmlFor="target-prefix">目标子网前缀</label>
            <select
              id="target-prefix"
              className="prefix-select"
              value={targetSplitPrefix || ''}
              onChange={(e) => setTargetSplitPrefix(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">请选择目标前缀</option>
              {splitPrefixOptions.map((p) => (
                <option key={p} value={p}>
                  /{p}（{prefixToMaskDotted(p)}）
                </option>
              ))}
            </select>
          </div>
        </div>

        {subnetSplitResult && (
          <>
            <div className="subnet-split-summary">
              从 <code>/{result.prefix}</code> 拆分为 <code>/{subnetSplitResult.newPrefix}</code>，
              共产生 <code>{subnetSplitResult.subnetCount}</code> 个子网
            </div>
            <table className="subnet-split-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>网络地址</th>
                  <th>可用主机范围</th>
                  <th>广播地址</th>
                  <th>主机数</th>
                </tr>
              </thead>
              <tbody>
                {subnetSplitResult.subnets.map((subnet) => (
                  <tr key={subnet.index}>
                    <td data-label="#">{subnet.index}</td>
                    <td data-label="网络地址"><code>{subnet.network}</code></td>
                    <td data-label="可用主机范围">
                      <code>{subnet.firstHost}</code> ~ <code>{subnet.lastHost}</code>
                    </td>
                    <td data-label="广播地址"><code>{subnet.broadcast}</code></td>
                    <td data-label="主机数"><code>{subnet.hostCount}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {subnetSplitResult.truncated && (
              <div className="subnet-split-truncated">
                共 {subnetSplitResult.subnetCount} 个子网，此处仅显示前 64 个
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="ipv4-subnet-calculator">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="input-section">
        <h3>输入参数</h3>

        <div className="input-mode-toggle active" style={{ display: 'none' }}></div>

        <div className="input-grid">
          <div className="form-group">
            <label htmlFor="ip-address">IPv4 地址</label>
            <span className="hint">例如：192.168.1.100</span>
            <input
              id="ip-address"
              type="text"
              className={`ip-input ${addressValid === false ? 'invalid' : ''}`}
              value={addressDotted}
              onChange={handleAddressChange}
              placeholder="192.168.1.100"
            />
          </div>

          <div className="form-group">
            <label>输入模式</label>
            <span className="hint">选择输入子网信息的方式</span>
            <div className="input-mode-buttons">
              <button
                className={`input-mode-toggle ${inputMode === 'prefix' ? 'active' : ''}`}
                onClick={() => handleInputModeChange('prefix')}
                type="button"
              >
                前缀长度 (/)
              </button>
              <button
                className={`input-mode-toggle ${inputMode === 'mask' ? 'active' : ''}`}
                onClick={() => handleInputModeChange('mask')}
                type="button"
              >
                子网掩码
              </button>
            </div>
          </div>

          {inputMode === 'prefix' && (
            <div className="form-group">
              <label htmlFor="prefix-length">前缀长度</label>
              <span className="hint">1-32 之间，例如 24</span>
              <select
                id="prefix-length"
                className="prefix-select"
                value={prefixLengthOrNull ?? ''}
                onChange={handlePrefixChange}
              >
                <option value="">请选择</option>
                {Array.from({ length: 32 }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>
                    /{p}（{prefixToMaskDotted(p)}）
                  </option>
                ))}
              </select>
            </div>
          )}

          {inputMode === 'mask' && (
            <div className="form-group">
              <label htmlFor="subnet-mask">子网掩码</label>
              <span className="hint">例如：255.255.255.0</span>
              <input
                id="subnet-mask"
                type="text"
                className="ip-input"
                value={maskDottedOrNull}
                onChange={handleMaskChange}
                placeholder="255.255.255.0"
              />
            </div>
          )}
        </div>

        <div className="examples-section">
          <span className="examples-label">示例：</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.id}
              type="button"
              className="example-btn"
              onClick={() => handleLoadExample(example)}
              title={example.description}
            >
              {example.name}
            </button>
          ))}
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleCalculate}
          >
            计算
          </button>
          <button
            className="secondary-btn"
            onClick={handleClear}
          >
            清除
          </button>
        </div>
      </section>

      {result && result.errorCode && (
        <div className="error-box">
          <strong>计算失败</strong>
          <p>{result.errorMessage}</p>
          <div className="error-code">错误码：{result.errorCode}</div>
        </div>
      )}

      {result && !result.errorCode && (
        <section className="results-section">
          {renderWarnings()}
          {renderResultCards()}
          {renderBinaryView()}
          {renderSubnetSplit()}
        </section>
      )}

      <section className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有计算均在浏览器本地执行，使用 JavaScript 原生算术，不依赖 BigInt 以保持兼容性。
          </li>
          <li>
            <strong>输入方式：</strong>支持「前缀长度（/24）」和「子网掩码（255.255.255.0）」两种输入方式，可随时切换。
          </li>
          <li>
            <strong>特殊前缀说明：</strong>
            <ul>
              <li><code>/32</code>：单主机路由，网络地址、广播地址与主机地址相同</li>
              <li><code>/31</code>：常用于点到点链路（如 WAN），仅包含两个可用主机</li>
              <li><code>/30</code>：常用于广域网链路，包含两个可用主机地址</li>
              <li><code>/0</code>：在现代网络中已废弃，默认路由通常使用 0.0.0.0/0 表示</li>
            </ul>
          </li>
          <li>
            <strong>子网拆分：</strong>输入当前网段后，可选择更大的前缀（更细粒度）进行子网拆分规划。
          </li>
          <li>
            <strong>二进制视图：</strong>网络位使用<span style={{ color: 'var(--accent)', fontWeight: 600 }}>蓝色</span>标记，
            主机位使用<span style={{ color: 'var(--danger-text)', fontWeight: 500 }}>红色</span>标记，便于理解子网划分原理。
          </li>
        </ul>
      </section>
    </div>
  )
}
