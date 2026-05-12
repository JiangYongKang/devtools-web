import { useCallback, useState } from 'react'
import {
  EXAMPLES,
  RFC3021_NOTE,
  SINGLE_HOST_NOTE,
  processCidr,
  processRange,
  processIpList,
  processProbe,
} from './logic/index.js'
import './CIDRRangeParserTool.css'

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

function formatBigInt(value) {
  if (value == null) return ''
  return String(value)
}

export default function CIDRRangeParserTool() {
  const [activeTab, setActiveTab] = useState('cidr')

  const [cidr, setCidr] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [ipList, setIpList] = useState('')
  const [enumeratePolicy, setEnumeratePolicy] = useState('sample')
  const [singleProbeIp, setSingleProbeIp] = useState('')

  const [result, setResult] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [selectedExample, setSelectedExample] = useState(null)

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

  const handleProcessCidr = useCallback(() => {
    if (!cidr.trim()) {
      return
    }
    const processResult = processCidr(cidr, { enumeratePolicy })
    setResult(processResult)
  }, [cidr, enumeratePolicy])

  const handleProcessRange = useCallback(() => {
    if (!rangeStart.trim() || !rangeEnd.trim()) {
      return
    }
    const processResult = processRange(rangeStart, rangeEnd, { enumeratePolicy })
    setResult(processResult)
  }, [rangeStart, rangeEnd, enumeratePolicy])

  const handleProcessIpList = useCallback(() => {
    if (!ipList.trim()) {
      return
    }
    const processResult = processIpList(ipList, { enumeratePolicy })
    setResult(processResult)
  }, [ipList, enumeratePolicy])

  const handleProbe = useCallback(() => {
    if (!singleProbeIp.trim() || !result) {
      return
    }
    const probeResult = processProbe(singleProbeIp, result)
    setResult(probeResult)
  }, [singleProbeIp, result])

  const handleLoadExample = useCallback((exampleType) => {
    setResult(null)
    setSelectedExample(exampleType)
    switch (exampleType) {
      case 'cidr-basic':
        setCidr(EXAMPLES.cidrBasic)
        setActiveTab('cidr')
        break
      case 'cidr-small':
        setCidr(EXAMPLES.cidrSmall)
        setActiveTab('cidr')
        break
      case 'cidr-32':
        setCidr(EXAMPLES.cidr32)
        setActiveTab('cidr')
        break
      case 'cidr-31':
        setCidr(EXAMPLES.cidr31)
        setActiveTab('cidr')
        break
      case 'range-exact':
        setRangeStart('192.168.1.0')
        setRangeEnd('192.168.1.255')
        setActiveTab('range')
        break
      case 'range-partial':
        setRangeStart('192.168.1.100')
        setRangeEnd('192.168.1.150')
        setActiveTab('range')
        break
      case 'ip-list':
        setIpList(EXAMPLES.ipList)
        setActiveTab('iplist')
        break
    }
  }, [])

  const handleClear = useCallback(() => {
    setCidr('')
    setRangeStart('')
    setRangeEnd('')
    setIpList('')
    setSingleProbeIp('')
    setResult(null)
    setSelectedExample(null)
  }, [])

  const renderErrorBox = (errorCode, errorMessage) => {
    if (!errorCode) return null
    return (
      <div className="error-box">
        <strong>错误</strong>
        <p>{errorMessage}</p>
        <div className="error-code">错误码：{errorCode}</div>
      </div>
    )
  }

  const renderWarnings = (warnings) => {
    if (!warnings || warnings.length === 0) return null
    return (
      <div className="warnings-section">
        {warnings.map((warning, index) => (
          <div
            key={index}
            className={`warning-box ${warning.type === 'info' ? 'info' : 'warning'}`}
          >
            <strong>{warning.type === 'info' ? '提示' : '警告'}</strong>
            <p>{warning.message}</p>
            {warning.code && <div className="warning-code">类型：{warning.code}</div>}
          </div>
        ))}
      </div>
    )
  }

  const renderCidrInfo = (data) => {
    if (!data || !data.success) return null

    const infoItems = []

    if (data.derivedNetwork) {
      infoItems.push({ label: '网络地址', value: data.derivedNetwork, copyable: true })
    }
    if (data.prefix !== null && data.prefix !== undefined) {
      infoItems.push({ label: '前缀长度', value: `/${data.prefix}` })
    }
    if (data.network) {
      infoItems.push({ label: '网络地址（二进制）', value: data.networkBinary })
    }
    if (data.broadcast) {
      infoItems.push({ label: '广播地址', value: data.broadcast, copyable: true })
    }
    if (data.broadcastBinary) {
      infoItems.push({ label: '广播地址（二进制）', value: data.broadcastBinary })
    }
    if (data.firstHost) {
      infoItems.push({ label: '首可用主机', value: data.firstHost, copyable: true })
    }
    if (data.lastHost) {
      infoItems.push({ label: '末可用主机', value: data.lastHost, copyable: true })
    }
    if (data.mask) {
      infoItems.push({ label: '子网掩码', value: data.mask, copyable: true })
    }
    if (data.maskBinary) {
      infoItems.push({ label: '子网掩码（二进制）', value: data.maskBinary })
    }
    if (data.addressTotal !== undefined) {
      infoItems.push({ label: '地址总数', value: formatBigInt(data.addressTotal) })
    }
    if (data.usableHosts !== undefined) {
      infoItems.push({ label: '可用主机数', value: formatBigInt(data.usableHosts) })
    }
    if (data.rangeStart) {
      infoItems.push({ label: '范围起始', value: data.rangeStart, copyable: true })
    }
    if (data.rangeEnd) {
      infoItems.push({ label: '范围结束', value: data.rangeEnd, copyable: true })
    }
    if (data.inputCount !== undefined) {
      infoItems.push({ label: '输入IP数量', value: String(data.inputCount) })
    }

    return (
      <div className="result-box">
        <div className="result-header">
          <span className="result-label">解析结果</span>
        </div>
        <div className="result-info">
          {infoItems.map((item, index) => (
            <div key={index} className="info-item">
              <span className="info-label">{item.label}</span>
              <div className="info-value-container">
                <code>{escapeHtml(item.value)}</code>
                {item.copyable && (
                  <button
                    className="copy-btn small"
                    onClick={() => handleCopy(item.value, item.label)}
                  >
                    复制
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderAggregatedProposals = (proposals) => {
    if (!proposals || proposals.length === 0) return null

    return (
      <div className="result-box">
        <div className="result-header">
          <span className="result-label">CIDR 聚合建议</span>
          <button
            className="copy-btn"
            onClick={() => handleCopy(
              proposals.map(p => p.cidr).join('\n'),
              'CIDR 聚合建议'
            )}
          >
            全部复制
          </button>
        </div>
        <div className="proposal-list">
          {proposals.map((proposal, index) => (
            <div key={index} className={`proposal-item ${proposal.type}`}>
              <div className="proposal-header">
                <span className="proposal-cidr">{proposal.cidr}</span>
                <button
                  className="copy-btn small"
                  onClick={() => handleCopy(proposal.cidr, 'CIDR')}
                >
                  复制
                </button>
              </div>
              <div className="proposal-info">
                <div className="info-item small">
                  <span className="info-label">网络</span>
                  <code>{proposal.network}</code>
                </div>
                <div className="info-item small">
                  <span className="info-label">广播</span>
                  <code>{proposal.broadcast}</code>
                </div>
                <div className="info-item small">
                  <span className="info-label">地址数</span>
                  <code>{formatBigInt(proposal.totalAddresses)}</code>
                </div>
                {proposal.isExact !== undefined && (
                  <div className="info-item small">
                    <span className="info-label">精确覆盖</span>
                    <code>{proposal.isExact ? '是' : '否'}</code>
                  </div>
                )}
              </div>
              <p className="proposal-description">{proposal.description}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderEnumerationPreview = (preview) => {
    if (!preview) return null

    if (preview.type === 'full') {
      return (
        <div className="result-box">
          <div className="result-header">
            <span className="result-label">
              地址列表（共 {formatBigInt(preview.totalCount)} 个）
            </span>
            <button
              className="copy-btn"
              onClick={() => handleCopy(
                preview.addresses.join('\n'),
                '完整地址列表'
              )}
            >
              全部复制
            </button>
          </div>
          <div className="address-grid">
            {preview.addresses.map((address, index) => (
              <div key={index} className="address-item">
                <code>{address}</code>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (preview.type === 'sample') {
      return (
        <div className="result-box">
          <div className="result-header">
            <span className="result-label">
              地址列表（共 {formatBigInt(preview.totalCount)} 个，展示首尾各 {preview.firstCount} 个）
            </span>
          </div>
          <div className="enumeration-note">
            <strong>超限策略：</strong>地址数量过大，已启用「首尾 + 样本」展示策略。
          </div>
          <div className="sample-section">
            <h4>开头 {preview.firstCount} 个地址</h4>
            <div className="address-grid">
              {preview.firstAddresses.map((address, index) => (
                <div key={index} className="address-item">
                  <code>{address}</code>
                </div>
              ))}
            </div>
          </div>
          <div className="sample-gap">
            <span>... 省略 {formatBigInt(preview.skippedCount)} 个地址 ...</span>
          </div>
          <div className="sample-section">
            <h4>末尾 {preview.lastCount} 个地址</h4>
            <div className="address-grid">
              {preview.lastAddresses.map((address, index) => (
                <div key={index} className="address-item">
                  <code>{address}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="result-box">
        <div className="result-header">
          <span className="result-label">地址范围</span>
        </div>
        <div className="range-display">
          <div className="info-item">
            <span className="info-label">起始</span>
            <code>{preview.start}</code>
          </div>
          <div className="range-arrow">→</div>
          <div className="info-item">
            <span className="info-label">结束</span>
            <code>{preview.end}</code>
          </div>
          <div className="info-item">
            <span className="info-label">总数</span>
            <code>{formatBigInt(preview.totalCount)}</code>
          </div>
        </div>
      </div>
    )
  }

  const renderProbeResult = (probeResult) => {
    if (!probeResult) return null

    if (!probeResult.success) {
      return (
        <div className="probe-result error">
          <strong>探测失败</strong>
          <p>{probeResult.errorMessage}</p>
          {probeResult.errorCode && (
            <div className="error-code">错误码：{probeResult.errorCode}</div>
          )}
        </div>
      )
    }

    const isIn = probeResult.inCidr !== undefined ? probeResult.inCidr : probeResult.inRange
    const positionText = {
      network: '网络地址',
      broadcast: '广播地址',
      host: '主机地址',
      start: '范围起始',
      end: '范围结束',
      middle: '范围中间',
      before: '范围之前',
      after: '范围之后',
    }

    return (
      <div className={`probe-result ${isIn ? 'success' : 'failure'}`}>
        <strong>{isIn ? '✓ IP 在范围内' : '✗ IP 不在范围内'}</strong>
        <div className="probe-details">
          <div className="info-item small">
            <span className="info-label">探测 IP</span>
            <code>{probeResult.probeIp}</code>
          </div>
          <div className="info-item small">
            <span className="info-label">位置</span>
            <code>{positionText[probeResult.position] || probeResult.position}</code>
          </div>
          {probeResult.cidrNetwork && (
            <div className="info-item small">
              <span className="info-label">CIDR 范围</span>
              <code>{probeResult.cidrNetwork}/{probeResult.cidrPrefix}</code>
            </div>
          )}
          {probeResult.rangeStart && (
            <div className="info-item small">
              <span className="info-label">IP 范围</span>
              <code>{probeResult.rangeStart} - {probeResult.rangeEnd}</code>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="cidr-range-parser">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <div className="tab-container">
        <button
          className={`tab-btn ${activeTab === 'cidr' ? 'active' : ''}`}
          onClick={() => setActiveTab('cidr')}
        >
          CIDR 解析
        </button>
        <button
          className={`tab-btn ${activeTab === 'range' ? 'active' : ''}`}
          onClick={() => setActiveTab('range')}
        >
          范围反查
        </button>
        <button
          className={`tab-btn ${activeTab === 'iplist' ? 'active' : ''}`}
          onClick={() => setActiveTab('iplist')}
        >
          IP 列表
        </button>
      </div>

      {activeTab === 'cidr' && (
        <section className="tool-section">
          <h2>CIDR 解析</h2>
          <div className="input-section">
            <div className="form-group">
              <label htmlFor="cidr-input">CIDR 记法 (a.b.c.d/n)</label>
              <input
                id="cidr-input"
                type="text"
                value={cidr}
                onChange={(e) => setCidr(e.target.value)}
                placeholder="例如：192.168.1.0/24"
                className="value-input"
                spellCheck={false}
              />
            </div>

            <div className="form-group">
              <label htmlFor="enumerate-policy">枚举策略</label>
              <select
                id="enumerate-policy"
                value={enumeratePolicy}
                onChange={(e) => setEnumeratePolicy(e.target.value)}
                className="policy-select"
              >
                <option value="sample">首尾 + 样本（推荐）</option>
                <option value="range">仅显示范围</option>
              </select>
              <div className="policy-hint">
                大前缀（如 /8）不会无脑枚举全部地址
              </div>
            </div>
          </div>

          <div className="examples-section">
            <h3>示例</h3>
            <div className="examples-grid">
              <button
                className={`example-btn ${selectedExample === 'cidr-basic' ? 'active' : ''}`}
                onClick={() => handleLoadExample('cidr-basic')}
              >
                基础子网 (192.168.1.0/24)
              </button>
              <button
                className={`example-btn ${selectedExample === 'cidr-small' ? 'active' : ''}`}
                onClick={() => handleLoadExample('cidr-small')}
              >
                大前缀 (10.0.0.0/8)
              </button>
              <button
                className={`example-btn ${selectedExample === 'cidr-32' ? 'active' : ''}`}
                onClick={() => handleLoadExample('cidr-32')}
              >
                单主机 (/32)
              </button>
              <button
                className={`example-btn ${selectedExample === 'cidr-31' ? 'active' : ''}`}
                onClick={() => handleLoadExample('cidr-31')}
              >
                RFC3021 链路 (/31)
              </button>
            </div>
          </div>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleProcessCidr}
              disabled={!cidr.trim()}
            >
              解析
            </button>
            {result && (
              <button
                className="secondary-btn"
                onClick={handleClear}
              >
                清除
              </button>
            )}
          </div>
        </section>
      )}

      {activeTab === 'range' && (
        <section className="tool-section">
          <h2>IP 范围反查 CIDR</h2>
          <div className="input-section">
            <div className="range-inputs">
              <div className="form-group">
                <label htmlFor="range-start">起始 IP</label>
                <input
                  id="range-start"
                  type="text"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  placeholder="例如：192.168.1.0"
                  className="value-input"
                  spellCheck={false}
                />
              </div>
              <div className="range-separator">至</div>
              <div className="form-group">
                <label htmlFor="range-end">结束 IP</label>
                <input
                  id="range-end"
                  type="text"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  placeholder="例如：192.168.1.255"
                  className="value-input"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="range-enumerate-policy">枚举策略</label>
              <select
                id="range-enumerate-policy"
                value={enumeratePolicy}
                onChange={(e) => setEnumeratePolicy(e.target.value)}
                className="policy-select"
              >
                <option value="sample">首尾 + 样本（推荐）</option>
                <option value="range">仅显示范围</option>
              </select>
            </div>
          </div>

          <div className="examples-section">
            <h3>示例</h3>
            <div className="examples-grid">
              <button
                className={`example-btn ${selectedExample === 'range-exact' ? 'active' : ''}`}
                onClick={() => handleLoadExample('range-exact')}
              >
                精确 CIDR 范围
              </button>
              <button
                className={`example-btn ${selectedExample === 'range-partial' ? 'active' : ''}`}
                onClick={() => handleLoadExample('range-partial')}
              >
                部分范围（需拆分）
              </button>
            </div>
          </div>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleProcessRange}
              disabled={!rangeStart.trim() || !rangeEnd.trim()}
            >
              分析
            </button>
            {result && (
              <button
                className="secondary-btn"
                onClick={handleClear}
              >
                清除
              </button>
            )}
          </div>
        </section>
      )}

      {activeTab === 'iplist' && (
        <section className="tool-section">
          <h2>IP 列表聚合</h2>
          <div className="input-section">
            <div className="form-group full-width">
              <label htmlFor="ip-list-input">IP 地址列表（每行一个）</label>
              <textarea
                id="ip-list-input"
                className="batch-textarea"
                value={ipList}
                onChange={(e) => setIpList(e.target.value)}
                placeholder="每行输入一个 IP 地址，例如：\n192.168.1.1\n192.168.1.5\n192.168.1.10"
                spellCheck={false}
              />
            </div>

            <div className="form-group">
              <label htmlFor="list-enumerate-policy">枚举策略</label>
              <select
                id="list-enumerate-policy"
                value={enumeratePolicy}
                onChange={(e) => setEnumeratePolicy(e.target.value)}
                className="policy-select"
              >
                <option value="sample">首尾 + 样本（推荐）</option>
                <option value="range">仅显示范围</option>
              </select>
            </div>
          </div>

          <div className="examples-section">
            <h3>示例</h3>
            <div className="examples-grid">
              <button
                className={`example-btn ${selectedExample === 'ip-list' ? 'active' : ''}`}
                onClick={() => handleLoadExample('ip-list')}
              >
                离散 IP 列表
              </button>
            </div>
          </div>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleProcessIpList}
              disabled={!ipList.trim()}
            >
              聚合
            </button>
            {result && (
              <button
                className="secondary-btn"
                onClick={handleClear}
              >
                清除
              </button>
            )}
          </div>
        </section>
      )}

      {result && (
        <section className="results-section">
          {result.errorCode && result.errorCode !== 'ENUMERATION_LIMIT_EXCEEDED' && result.errorCode !== 'NO_SINGLE_CIDR_AGGREGATE' &&
            renderErrorBox(result.errorCode, result.errorMessage)}

          {result.warnings && renderWarnings(result.warnings)}

          {result.success && (
            <>
              {renderCidrInfo(result)}
              {result.aggregatedCidrProposal && result.aggregatedCidrProposal.length > 0 &&
                renderAggregatedProposals(result.aggregatedCidrProposal)}
              {result.enumerationPreview && renderEnumerationPreview(result.enumerationPreview)}

              <div className="probe-section">
                <h3>单点探测 (inRange)</h3>
                <div className="probe-input-row">
                  <input
                    type="text"
                    value={singleProbeIp}
                    onChange={(e) => setSingleProbeIp(e.target.value)}
                    placeholder="输入 IP 地址进行探测"
                    className="value-input"
                    spellCheck={false}
                  />
                  <button
                    className="primary-btn"
                    onClick={handleProbe}
                    disabled={!singleProbeIp.trim()}
                  >
                    探测
                  </button>
                </div>
                {result.probeResult && renderProbeResult(result.probeResult)}
              </div>
            </>
          )}

          {result.errorCode === 'NO_SINGLE_CIDR_AGGREGATE' && (
            <>
              {result.aggregatedCidrProposal && result.aggregatedCidrProposal.length > 0 &&
                renderAggregatedProposals(result.aggregatedCidrProposal)}
              {result.enumerationPreview && renderEnumerationPreview(result.enumerationPreview)}
            </>
          )}
        </section>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有计算均在浏览器本地执行，不向任何后端服务器发送数据。
          </li>
          <li>
            <strong>CIDR 解析：</strong>输入 <code>a.b.c.d/n</code> 格式的 CIDR 记法，自动计算网络地址、广播地址、掩码等。
          </li>
          <li>
            <strong>范围反查：</strong>输入 IP 起止地址，自动查找可覆盖该范围的最小 CIDR，或提供拆分方案。
          </li>
          <li>
            <strong>IP 列表聚合：</strong>粘贴多个 IP 地址，自动计算覆盖范围和最小 CIDR。
          </li>
          <li>
            <strong>单点探测：</strong>输入单个 IP，检测其是否在当前解析的范围内。
          </li>
          <li>
            <strong>RFC 3021：</strong>/31 前缀用于点到点链路，包含 2 个可用地址，无网络/广播地址区分。
          </li>
          <li>
            <strong>/32 前缀：</strong>表示单个主机地址。
          </li>
          <li>
            <strong>超限策略：</strong>大前缀（如 /8）不会枚举全部地址，采用「首尾 + 样本」或「仅范围」策略。
          </li>
        </ul>
      </div>
    </div>
  )
}
