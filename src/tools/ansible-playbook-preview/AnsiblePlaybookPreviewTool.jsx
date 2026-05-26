import { useCallback, useMemo, useState } from 'react'
import './AnsiblePlaybookPreviewTool.css'
import { buildDryRunCommand, getCheckModeNotice } from './logic/command.js'
import { EXAMPLES } from './logic/examples.js'
import { parsePlaybook } from './logic/parser.js'
import { analyzeAllVariables } from './logic/variables.js'

/**
 * 将任意值压缩为适合 UI 摘要展示的字符串
 * @param {unknown} v
 * @returns {string}
 */
function summarizeValue(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    const s = JSON.stringify(v)
    return s.length > 120 ? s.slice(0, 120) + '…' : s
  } catch {
    return String(v)
  }
}

/**
 * 展示单个 task / handler 卡片
 */
function TaskCard({ task, indexPrefix, isHandler }) {
  const summary = summarizeValue(task.when)
  const loopSummary = summarizeValue(task.loop)
  return (
    <div className={`task-card ${isHandler ? 'handler-card' : ''}`}>
      <div className="task-order">{indexPrefix}</div>
      <div className="task-body">
        <div className="task-name">
          {task.name || (isHandler ? '(未命名 handler)' : '(未命名任务)')}
        </div>
        <div>
          {task.module && <span className="task-module">{task.module}</span>}
          {task.tags.length > 0 && (
            <span className="task-tags">
              {task.tags.map((t, i) => (
                <span key={i} className="task-tag">
                  #{t}
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="task-meta">
          {summary && (
            <div>
              <span className="label">when:</span>{' '}
              <span className="value">{summary}</span>
            </div>
          )}
          {loopSummary && (
            <div>
              <span className="label">loop:</span>{' '}
              <span className="value">{loopSummary}</span>
            </div>
          )}
          {task.notify.length > 0 && (
            <div>
              <span className="label">notify:</span>{' '}
              {task.notify.map((n, i) => (
                <span key={i} className="value" style={{ marginRight: 4 }}>
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 展示一个 play 的概览信息
 */
function PlayHeader({ play }) {
  return (
    <div className="play-header">
      <div className="play-title">
        Play #{play.index}
        {play.name ? `：${play.name}` : ''}
      </div>
      <div className="play-meta">
        <span className="chip">hosts: {play.hosts.join(', ') || '(未指定)'}</span>
        {play.become != null && (
          <span className={`chip ${play.become ? 'become-yes' : ''}`}>
            become: {play.become ? 'yes' : 'no'}
          </span>
        )}
        {play.gatherFacts != null && (
          <span className="chip">gather_facts: {play.gatherFacts ? 'yes' : 'no'}</span>
        )}
        {play.varsFiles.length > 0 && (
          <span className="chip">vars_files: {play.varsFiles.length}</span>
        )}
      </div>
    </div>
  )
}

export default function AnsiblePlaybookPreviewTool() {
  const [yamlInput, setYamlInput] = useState('')
  const [parsed, setParsed] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [playbookName, setPlaybookName] = useState('playbook.yml')
  const [inventoryOverride, setInventoryOverride] = useState('')
  const [becomeOverride, setBecomeOverride] = useState('auto')
  const [copyStatus, setCopyStatus] = useState(null)

  const variableAnalysis = useMemo(() => {
    if (!parsed) return []
    return analyzeAllVariables(parsed)
  }, [parsed])

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

  const handleLoadExample = useCallback((exampleYaml, suggestedName) => {
    setYamlInput(exampleYaml)
    if (suggestedName) setPlaybookName(suggestedName)
    const result = parsePlaybook(exampleYaml)
    if (!result.ok) {
      setParsed(null)
      setParseError(result.error)
    } else {
      setParseError(null)
      setParsed(result.result)
    }
  }, [])

  const handleAnalyze = useCallback(() => {
    setParseError(null)
    const result = parsePlaybook(yamlInput)
    if (!result.ok) {
      setParsed(null)
      setParseError(result.error)
      return
    }
    setParsed(result.result)
  }, [yamlInput])

  const handleClear = useCallback(() => {
    setYamlInput('')
    setParsed(null)
    setParseError(null)
  }, [])

  const dryRunInfo = useMemo(() => {
    if (!parsed) return null
    const firstPlay = parsed.plays[0]
    if (!firstPlay) return null
    const become =
      becomeOverride === 'yes'
        ? true
        : becomeOverride === 'no'
          ? false
          : firstPlay.become == null
            ? null
            : Boolean(firstPlay.become)
    return buildDryRunCommand(firstPlay.hosts, playbookName, {
      inventoryOverride: inventoryOverride || undefined,
      become,
    })
  }, [parsed, playbookName, inventoryOverride, becomeOverride])

  return (
    <div className="ansible-playbook-preview">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>Ansible Playbook 预览工具</h2>
        <p className="tool-description">
          粘贴 Ansible Playbook YAML，预览任务执行链、handler 通知关系、变量引用与 dry-run
          命令草稿；不连接任何控制节点。
        </p>
      </section>

      <section className="tool-section">
        <h3>示例 Playbook</h3>
        <div className="examples-row">
          {EXAMPLES.map((example) => (
            <button
              key={example.id}
              className="example-btn"
              onClick={() => handleLoadExample(example.yaml, `${example.id}.yml`)}
              title={example.description}
            >
              <span className="example-name">{example.name}</span>
              <span className="example-desc">{example.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="tool-section">
        <h3>Playbook YAML</h3>
        <textarea
          className="yaml-textarea"
          value={yamlInput}
          onChange={(e) => {
            setYamlInput(e.target.value)
            setParsed(null)
            setParseError(null)
          }}
          placeholder={
            '粘贴 Ansible Playbook YAML，例如：\n\n' +
            '- hosts: webservers\n' +
            '  become: true\n' +
            '  tasks:\n' +
            '    - name: 安装 nginx\n' +
            '      yum:\n' +
            '        name: nginx\n' +
            '        state: present\n'
          }
          spellCheck={false}
        />
        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleAnalyze}
            disabled={!yamlInput.trim()}
          >
            解析并预览
          </button>
          <button
            className="secondary-btn"
            onClick={handleClear}
            disabled={!yamlInput && !parsed && !parseError}
          >
            清除
          </button>
        </div>
      </section>

      {parseError && (
        <section className="tool-section">
          <div className="error-box">
            <strong>YAML 解析失败</strong>
            <p>
              第 {parseError.line} 行，第 {parseError.col} 列：{parseError.message}
              {parseError.code && (
                <span style={{ marginLeft: 8, color: '#9b2c2c' }}>[{parseError.code}]</span>
              )}
            </p>
          </div>
        </section>
      )}

      {!parsed && !parseError && yamlInput.trim() && (
        <section className="tool-section">
          <div className="empty-state">
            <div className="empty-icon">🧪</div>
            <h3>准备就绪</h3>
            <p>点击「解析并预览」按钮查看任务链与 handler 关系</p>
          </div>
        </section>
      )}

      {!parsed && !parseError && !yamlInput.trim() && (
        <section className="tool-section">
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>等待输入</h3>
            <p>粘贴 Playbook YAML 或点击上方示例按钮开始使用</p>
          </div>
        </section>
      )}

      {parsed &&
        parsed.plays.map((play) => {
          const playVarAnalysis = variableAnalysis.find((v) => v.playIndex === play.index)
          const playEdges = parsed.notifyEdges.filter((e) => e.playIndex === play.index)
          return (
            <section key={play.index} className="tool-section">
              <PlayHeader play={play} />

              <div className="section-divider">任务链（按执行顺序）</div>
              <div className="task-list">
                {play.preTasks.map((t, i) => (
                  <TaskCard key={`pre-${i}`} task={t} indexPrefix={`P${i + 1}`} />
                ))}
                {play.tasks.map((t, i) => (
                  <TaskCard key={`t-${i}`} task={t} indexPrefix={i + 1} />
                ))}
                {play.postTasks.map((t, i) => (
                  <TaskCard key={`post-${i}`} task={t} indexPrefix={`Q${i + 1}`} />
                ))}
                {play.preTasks.length + play.tasks.length + play.postTasks.length === 0 && (
                  <div style={{ color: '#718096', fontSize: 13 }}>未定义任务</div>
                )}
              </div>

              <div className="section-divider" style={{ marginTop: 20 }}>
                Handlers
              </div>
              <div className="handler-list">
                {play.handlers.map((h, i) => (
                  <TaskCard key={`h-${i}`} task={h} indexPrefix={`H${i + 1}`} isHandler />
                ))}
                {play.handlers.length === 0 && (
                  <div style={{ color: '#718096', fontSize: 13 }}>未定义 handler</div>
                )}
              </div>

              <div className="section-divider" style={{ marginTop: 20 }}>
                Notify 通知关系（task → handler）
              </div>
              <div className="notify-edge-list">
                {playEdges.length === 0 ? (
                  <div style={{ color: '#718096', fontSize: 13 }}>无 notify 边</div>
                ) : (
                  playEdges.map((e, i) => (
                    <div key={i} className="notify-edge">
                      <span className="edge-source">{e.from}</span>
                      <span className="arrow">→</span>
                      <span className="edge-target">{e.to}</span>
                      <span style={{ marginLeft: 10, color: '#a0aec0' }}>
                        [{e.sourceKind}]
                      </span>
                    </div>
                  ))
                )}
              </div>

              {playVarAnalysis && (
                <div className="var-section">
                  <div className="section-divider" style={{ marginTop: 20 }}>
                    变量引用
                  </div>
                  <div>
                    <strong style={{ fontSize: 13, color: '#2d3748' }}>
                      已声明（{Object.keys(play.vars).length}）：
                    </strong>
                    <div className="declared-vars">
                      {Object.keys(play.vars).map((k) => (
                        <span key={k} className="var-tag declared">
                          {k}
                        </span>
                      ))}
                      {Object.keys(play.vars).length === 0 && (
                        <span style={{ color: '#a0aec0', fontSize: 13 }}>无</span>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <strong style={{ fontSize: 13, color: '#2d3748' }}>
                      未定义引用（{playVarAnalysis.undeclared.length}）：
                    </strong>
                    <div className="undeclared-vars">
                      {playVarAnalysis.undeclared.map((k) => (
                        <span key={k} className="var-tag undeclared">
                          {k}
                        </span>
                      ))}
                      {playVarAnalysis.undeclared.length === 0 && (
                        <span style={{ color: '#a0aec0', fontSize: 13 }}>
                          无（静态分析范围内）
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )
        })}

      {dryRunInfo && (
        <section className="tool-section">
          <h3>Dry-run 命令草稿</h3>
          <div className="dry-run-input">
            <label>Playbook 文件名：</label>
            <input
              type="text"
              value={playbookName}
              onChange={(e) => setPlaybookName(e.target.value)}
            />
            <label>Inventory 占位符：</label>
            <input
              type="text"
              value={inventoryOverride}
              placeholder="默认根据 hosts 自动推断"
              onChange={(e) => setInventoryOverride(e.target.value)}
            />
            <label>Become：</label>
            <select
              value={becomeOverride}
              onChange={(e) => setBecomeOverride(e.target.value)}
            >
              <option value="auto">自动（跟随 play 声明）</option>
              <option value="yes">强制 --become</option>
              <option value="no">强制关闭</option>
            </select>
          </div>
          <pre className="dry-run-command">{dryRunInfo.command}</pre>
          <div className="action-row">
            <button
              className="primary-btn"
              onClick={() => handleCopy(dryRunInfo.command, 'Dry-run 命令')}
            >
              复制命令
            </button>
          </div>
          <pre className="check-notice">{getCheckModeNotice()}</pre>
        </section>
      )}

      <section className="tool-section">
        <h3>说明</h3>
        <ul style={{ fontSize: 13, lineHeight: 1.7, color: '#4a5568' }}>
          <li>
            <strong>YAML 解析：</strong>使用 <code>yaml</code> 库解析，报错会定位到行列号，可直接跳转到出错位置。
          </li>
          <li>
            <strong>任务链：</strong>按 <code>pre_tasks → tasks → post_tasks</code> 的执行顺序展示；
            任务卡片摘要包含 <code>when</code> / <code>loop</code> / <code>tags</code> / <code>notify</code>。
          </li>
          <li>
            <strong>Notify 边：</strong>基于 task 的 <code>notify</code> 字段匹配 handler 名称，绘制有向边；
            未命中的 handler 名称不会显示边（请检查拼写）。
          </li>
          <li>
            <strong>变量插值：</strong>仅做静态扫描，<code>{'{{ lookup(...) }}'}</code> 不执行；
            未在 play 的 <code>vars</code> 中声明的变量名会提示（忽略常见 magic vars）。
          </li>
          <li>
            <strong>Dry-run：</strong>根据首 play 的 <code>hosts</code> 自动推断 inventory 占位符，可在 UI 中覆盖。
          </li>
        </ul>
      </section>
    </div>
  )
}
