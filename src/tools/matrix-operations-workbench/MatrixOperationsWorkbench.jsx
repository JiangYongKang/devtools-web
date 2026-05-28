import { useCallback, useMemo, useState } from 'react'
import './MatrixOperationsWorkbench.css'
import {
  parseMatrix, parseScalar, dimensions,
  add, subtract, multiply, scalarMultiply, transpose,
  determinant, isSquare,
  inverse, conditionNumber, verifyInverse,
  luDecomposition,
  eigenvalues2x2, checkEigenvalueSupport,
  gaussianEliminationSteps,
  EXAMPLES, matrixToJson, vectorToJson,
  matrixToLatex, operationToLatex, formatNumber
} from './logic/index.js'

/**
 * 格式化数值显示
 */
function fmt(x, precision = 6) {
  if (Math.abs(x) < 1e-10) return '0'
  if (Math.abs(x) >= 10000 || (Math.abs(x) < 0.001 && x !== 0)) {
    return x.toExponential(4)
  }
  return Number(x.toPrecision(precision)).toString()
}

/**
 * 矩阵表格显示组件
 */
function MatrixDisplay({ matrix, augmented = false, augmentedCols = 1 }) {
  if (!matrix || matrix.length === 0) return null
  const rows = matrix.length
  const cols = matrix[0].length

  return (
    <div className={`matrix-display ${augmented ? 'augmented' : ''}`}>
      <table>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              {row.map((val, j) => (
                <td
                  key={j}
                  className={augmented && j >= cols - augmentedCols ? 'aug-sep' : ''}
                >
                  {fmt(val)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * 解析向量输入
 */
function parseVector(input) {
  if (typeof input !== 'string') throw new Error('输入必须为字符串')
  const trimmed = input.trim()
  if (trimmed === '') throw new Error('输入不能为空')

  let parsed
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    try {
      parsed = eval(`(${trimmed})`)
    } catch {
      throw new Error('无法解析向量，请检查 JSON 或数组格式')
    }
  }

  if (!Array.isArray(parsed)) throw new Error('向量必须为一维数组')
  return parsed.map(elem => {
    if (typeof elem === 'string') {
      const fracMatch = elem.trim().match(/^(-?\d+)\s*\/\s*(-?\d+)$/)
      if (fracMatch) {
        return parseInt(fracMatch[1], 10) / parseInt(fracMatch[2], 10)
      }
      const num = parseFloat(elem)
      if (Number.isFinite(num)) return num
      throw new Error(`无法解析元素："${elem}"`)
    }
    if (typeof elem === 'number' && Number.isFinite(elem)) return elem
    throw new Error(`不支持的元素类型：${typeof elem}`)
  })
}

const OP_TABS = [
  { id: 'basic', name: '基本运算', requiresB: true },
  { id: 'advanced', name: '高级运算', requiresB: false },
  { id: 'steps', name: '消元步骤', requiresB: true },
  { id: 'eigen', name: '特征值', requiresB: false },
]

const BASIC_OPS = [
  { id: 'add', name: 'A + B', desc: '矩阵加法' },
  { id: 'subtract', name: 'A - B', desc: '矩阵减法' },
  { id: 'multiply', name: 'A × B', desc: '矩阵乘法' },
  { id: 'scalar', name: 'k × A', desc: '数乘' },
  { id: 'transpose', name: 'A^T', desc: '转置' },
]

const ADVANCED_OPS = [
  { id: 'det', name: 'det(A)', desc: '行列式（LU 分解）' },
  { id: 'inv', name: 'A⁻¹', desc: '逆矩阵 + 条件数' },
  { id: 'lu', name: 'LU 分解', desc: 'PA = LU，显示 L/U/P' },
  { id: 'cond', name: 'cond(A)', desc: '条件数 ‖A‖·‖A⁻¹‖' },
]

export default function MatrixOperationsWorkbench() {
  const [inputA, setInputA] = useState('')
  const [inputB, setInputB] = useState('')
  const [inputScalar, setInputScalar] = useState('')
  const [inputVectorB, setInputVectorB] = useState('')
  const [activeTab, setActiveTab] = useState('basic')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [copyStatus, setCopyStatus] = useState(null)

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

  const handleLoadExample = useCallback((example) => {
    setInputA(matrixToJson(example.matrix))
    setInputB('')
    setInputScalar('')
    if (example.bVector) {
      setInputVectorB(vectorToJson(example.bVector))
    } else {
      setInputVectorB('')
    }
    setResult(null)
    setError(null)
    setWarnings([])
  }, [])

  const handleClear = useCallback(() => {
    setInputA('')
    setInputB('')
    setInputScalar('')
    setInputVectorB('')
    setResult(null)
    setError(null)
    setWarnings([])
  }, [])

  const runBasicOp = useCallback((opId) => {
    try {
      setError(null)
      setWarnings([])

      const A = parseMatrix(inputA)
      let B = null
      let scalar = null

      if (opId === 'add' || opId === 'subtract' || opId === 'multiply') {
        if (!inputB.trim()) throw new Error('请输入矩阵 B')
        B = parseMatrix(inputB)
      }
      if (opId === 'scalar') {
        if (!inputScalar.trim()) throw new Error('请输入标量 k')
        scalar = parseScalar(inputScalar)
      }

      let resultMatrix = null
      let opSymbol = ''
      let latexResult = null

      switch (opId) {
        case 'add':
          resultMatrix = add(A, B)
          opSymbol = '+'
          latexResult = operationToLatex(A, '+', B, resultMatrix)
          break
        case 'subtract':
          resultMatrix = subtract(A, B)
          opSymbol = '-'
          latexResult = operationToLatex(A, '-', B, resultMatrix)
          break
        case 'multiply':
          resultMatrix = multiply(A, B)
          opSymbol = '\\times'
          latexResult = operationToLatex(A, '\\times', B, resultMatrix)
          break
        case 'scalar':
          resultMatrix = scalarMultiply(scalar, A)
          opSymbol = '\\cdot'
          latexResult = operationToLatex(A, '\\cdot', scalar, resultMatrix)
          break
        case 'transpose':
          resultMatrix = transpose(A)
          opSymbol = '^T'
          latexResult = operationToLatex(A, '^T', null, resultMatrix)
          break
      }

      setResult({
        type: 'matrix',
        matrix: resultMatrix,
        opName: BASIC_OPS.find(o => o.id === opId)?.name,
        latex: latexResult
      })
    } catch (err) {
      setError(err.message)
      setResult(null)
    }
  }, [inputA, inputB, inputScalar])

  const runAdvancedOp = useCallback((opId) => {
    try {
      setError(null)
      setWarnings([])

      const A = parseMatrix(inputA)
      if (!isSquare(A)) throw new Error('高级运算仅支持方阵')

      const n = A.length
      if (n > 8) {
        setResult({
          type: 'info',
          opName: ADVANCED_OPS.find(o => o.id === opId)?.name,
          message: `${ADVANCED_OPS.find(o => o.id === opId)?.desc} 仅支持 n ≤ 8 阶方阵，当前为 ${n}×${n}。更大的矩阵需使用专业数值计算工具。`
        })
        return
      }

      let newResult = null
      const newWarnings = []

      switch (opId) {
        case 'det': {
          const detResult = determinant(A)
          if (detResult.warning) newWarnings.push(detResult.warning)
          const latex = `\\det(${matrixToLatex(A)}) = ${formatNumber(detResult.value)}`
          newResult = {
            type: 'scalar',
            value: detResult.value,
            opName: 'det(A)',
            singular: detResult.singular,
            latex
          }
          break
        }
        case 'inv': {
          const invResult = inverse(A)
          invResult.warnings.forEach(w => newWarnings.push(w))
          const verification = verifyInverse(A, invResult.inverse)
          if (verification.maxError > 1e-8) {
            newWarnings.push(`逆矩阵验证最大误差：${verification.maxError.toExponential(2)}`)
          }
          const latex = `${matrixToLatex(A)}^{-1} = ${matrixToLatex(invResult.inverse)}`
          newResult = {
            type: 'inverse',
            matrix: invResult.inverse,
            conditionNumber: invResult.conditionNumber,
            singular: invResult.singular,
            illConditioned: invResult.illConditioned,
            opName: 'A⁻¹',
            verification,
            latex
          }
          break
        }
        case 'lu': {
          const luResult = luDecomposition(A)
          if (luResult.singularWarning) newWarnings.push(luResult.singularWarning)
          newResult = {
            type: 'lu',
            L: luResult.L,
            U: luResult.U,
            P: luResult.P,
            singular: luResult.singular,
            opName: 'PA = LU 分解',
            latex: `P = ${matrixToLatex(luResult.P)}\n\nL = ${matrixToLatex(luResult.L)}\n\nU = ${matrixToLatex(luResult.U)}`
          }
          break
        }
        case 'cond': {
          const condResult = conditionNumber(A)
          if (condResult.illConditioned) {
            newWarnings.push(`条件数 ${condResult.conditionNumber.toExponential(2)} 较大，矩阵病态`)
          }
          newResult = {
            type: 'condition',
            conditionNumber: condResult.conditionNumber,
            normA: condResult.normA,
            normInv: condResult.normInv,
            illConditioned: condResult.illConditioned,
            opName: 'cond(A)',
            latex: `\\text{cond}(A) = \\|A\\|_\\infty \\cdot \\|A^{-1}\\|_\\infty = ${formatNumber(condResult.conditionNumber)}`
          }
          break
        }
      }

      setWarnings(newWarnings)
      setResult(newResult)
    } catch (err) {
      setError(err.message)
      setResult(null)
      setWarnings([])
    }
  }, [inputA])

  const runElimination = useCallback(() => {
    try {
      setError(null)
      setWarnings([])

      const A = parseMatrix(inputA)
      if (!inputVectorB.trim()) throw new Error('请输入右端向量 b')
      const b = parseVector(inputVectorB)

      const dim = dimensions(A)
      if (dim.rows !== b.length) {
        throw new Error(`维度不匹配：矩阵为 ${dim.rows} 行，向量长度为 ${b.length}`)
      }

      if (!isSquare(A)) throw new Error('高斯消元需要方阵系数矩阵')
      if (dim.rows > 3 || dim.rows < 2) {
        setResult({
          type: 'info',
          opName: '高斯消元步骤',
          message: `高斯消元步骤展示仅支持 2×2 和 3×3 矩阵，当前为 ${dim.rows}×${dim.cols}。更大的矩阵消元步骤过长，建议直接使用行列式或逆矩阵功能。`
        })
        return
      }

      const elimResult = gaussianEliminationSteps(A, b)
      const newWarnings = []
      if (elimResult.warning) newWarnings.push(elimResult.warning)

      setWarnings(newWarnings)
      setResult({
        type: 'elimination',
        steps: elimResult.steps,
        solution: elimResult.solution,
        singular: elimResult.singular,
        opName: '高斯消元步骤'
      })
    } catch (err) {
      setError(err.message)
      setResult(null)
    }
  }, [inputA, inputVectorB])

  const runEigenvalues = useCallback(() => {
    try {
      setError(null)
      setWarnings([])

      const A = parseMatrix(inputA)
      const support = checkEigenvalueSupport(A)
      if (!support.supported) {
        setResult({
          type: 'info',
          opName: '特征值',
          message: support.message
        })
        return
      }

      const eigResult = eigenvalues2x2(A)
      let latex = ''
      if (eigResult.complex) {
        latex = `\\lambda_1 = ${formatNumber(eigResult.realParts[0])} + ${formatNumber(eigResult.imagParts[0])}i, \\quad \\lambda_2 = ${formatNumber(eigResult.realParts[1])} + ${formatNumber(eigResult.imagParts[1])}i`
      } else {
        latex = `\\lambda_1 = ${formatNumber(eigResult.eigenvalues[0])}, \\quad \\lambda_2 = ${formatNumber(eigResult.eigenvalues[1])}`
      }

      setResult({
        type: 'eigenvalues',
        eigenvalues: eigResult.eigenvalues,
        complex: eigResult.complex,
        realParts: eigResult.realParts,
        imagParts: eigResult.imagParts,
        trace: eigResult.trace,
        det: eigResult.det,
        discriminant: eigResult.discriminant,
        opName: '特征值（2×2 解析解）',
        latex
      })
    } catch (err) {
      setError(err.message)
      setResult(null)
    }
  }, [inputA])

  const matrixAParsed = useMemo(() => {
    try {
      if (!inputA.trim()) return null
      return parseMatrix(inputA)
    } catch {
      return null
    }
  }, [inputA])

  const matrixBParsed = useMemo(() => {
    try {
      if (!inputB.trim()) return null
      return parseMatrix(inputB)
    } catch {
      return null
    }
  }, [inputB])

  const vectorBParsed = useMemo(() => {
    try {
      if (!inputVectorB.trim()) return null
      return parseVector(inputVectorB)
    } catch {
      return null
    }
  }, [inputVectorB])

  const renderResult = () => {
    if (!result) return null

    return (
      <section className="tool-section">
        <h3>
          运算结果：{result.opName}
          {result.singular && <span className="singular-badge">奇异</span>}
          {result.illConditioned && <span className="ill-conditioned-badge">病态</span>}
        </h3>

        {warnings.length > 0 && warnings.map((w, i) => (
          <div key={i} className="warning-box">
            <strong>⚠️ 警告</strong>
            <p>{w}</p>
          </div>
        ))}

        {result.type === 'matrix' && (
          <div>
            <div className="result-card">
              <h4>结果矩阵</h4>
              <MatrixDisplay matrix={result.matrix} />
            </div>
            <div className="action-row">
              <button
                className="secondary-btn"
                onClick={() => handleCopy(result.latex, 'LaTeX')}
              >
                复制 LaTeX
              </button>
            </div>
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', color: '#4a5568', fontSize: 13 }}>
                查看 LaTeX 代码
              </summary>
              <pre className="latex-code" style={{ marginTop: 8 }}>
                {result.latex}
              </pre>
            </details>
          </div>
        )}

        {result.type === 'scalar' && (
          <div>
            <div className="scalar-result">{fmt(result.value)}</div>
            <div className="action-row">
              <button
                className="secondary-btn"
                onClick={() => handleCopy(result.latex, 'LaTeX')}
              >
                复制 LaTeX
              </button>
            </div>
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', color: '#4a5568', fontSize: 13 }}>
                查看 LaTeX 代码
              </summary>
              <pre className="latex-code" style={{ marginTop: 8 }}>
                {result.latex}
              </pre>
            </details>
          </div>
        )}

        {result.type === 'inverse' && (
          <div>
            <div className="result-grid">
              <div className="result-card">
                <h4>逆矩阵 A⁻¹</h4>
                <MatrixDisplay matrix={result.matrix} />
              </div>
              <div className="result-card">
                <h4>条件数 cond(A)</h4>
                <div className="condition-number">
                  {fmt(result.conditionNumber)}
                </div>
                <p style={{ fontSize: 12, color: '#718096', marginTop: 8 }}>
                  ‖A‖<sub>∞</sub> = {fmt(result.verification?.maxError || 0)} (验证误差)
                </p>
              </div>
            </div>
            <div className="action-row" style={{ marginTop: 16 }}>
              <button
                className="secondary-btn"
                onClick={() => handleCopy(result.latex, 'LaTeX')}
              >
                复制 LaTeX
              </button>
            </div>
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', color: '#4a5568', fontSize: 13 }}>
                查看 LaTeX 代码
              </summary>
              <pre className="latex-code" style={{ marginTop: 8 }}>
                {result.latex}
              </pre>
            </details>
          </div>
        )}

        {result.type === 'lu' && (
          <div>
            <div className="info-box">
              PA = LU，其中 P 为置换矩阵，L 为单位下三角，U 为上三角
            </div>
            <div className="lu-grid">
              <div className="lu-item">
                <div className="lu-label">P（置换）</div>
                <MatrixDisplay matrix={result.P} />
              </div>
              <div className="lu-item">
                <div className="lu-label">L（单位下三角）</div>
                <MatrixDisplay matrix={result.L} />
              </div>
              <div className="lu-item">
                <div className="lu-label">U（上三角）</div>
                <MatrixDisplay matrix={result.U} />
              </div>
            </div>
            <div className="action-row" style={{ marginTop: 16 }}>
              <button
                className="secondary-btn"
                onClick={() => handleCopy(result.latex, 'LaTeX')}
              >
                复制 LaTeX
              </button>
            </div>
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', color: '#4a5568', fontSize: 13 }}>
                查看 LaTeX 代码
              </summary>
              <pre className="latex-code" style={{ marginTop: 8 }}>
                {result.latex}
              </pre>
            </details>
          </div>
        )}

        {result.type === 'condition' && (
          <div>
            <div className="result-card">
              <h4>条件数（无穷范数）</h4>
              <div className="condition-number">
                {fmt(result.conditionNumber)}
              </div>
              <p style={{ fontSize: 12, color: '#718096', marginTop: 8 }}>
                ‖A‖<sub>∞</sub> = {fmt(result.normA)}, &nbsp;
                ‖A⁻¹‖<sub>∞</sub> = {fmt(result.normInv)}
              </p>
            </div>
          </div>
        )}

        {result.type === 'elimination' && (
          <div>
            {result.solution && (
              <div className="result-card" style={{ marginBottom: 16 }}>
                <h4>解 x</h4>
                <div style={{ fontFamily: 'SFMono-Regular, Consolas, monospace', fontSize: 16 }}>
                  {result.solution.map((x, i) => (
                    <span key={i} style={{ marginRight: 16 }}>
                      x<sub>{i + 1}</sub> = {fmt(x)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="section-divider">行变换步骤</div>
            <div className="steps-container">
              {result.steps.map((step, i) => (
                <div key={i} className="step-card">
                  {step.notation && (
                    <div className="step-notation">{step.notation}</div>
                  )}
                  <div className="step-description">{step.description}</div>
                  <MatrixDisplay matrix={step.augmented} augmented augmentedCols={1} />
                </div>
              ))}
            </div>
          </div>
        )}

        {result.type === 'eigenvalues' && (
          <div>
            <div className="eigenvalue-result">
              <h4>特征值</h4>
              {result.complex ? (
                <div>
                  <span className="lambda">
                    λ₁ = {fmt(result.realParts[0])} + {fmt(result.imagParts[0])}i
                  </span>
                  <span className="lambda">
                    λ₂ = {fmt(result.realParts[1])} + {fmt(result.imagParts[1])}i
                  </span>
                </div>
              ) : (
                <div>
                  {result.eigenvalues.map((λ, i) => (
                    <span key={i} className="lambda">
                      λ<sub>{i + 1}</sub> = {fmt(λ)}
                    </span>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 12, color: '#718096', marginTop: 12 }}>
                迹 tr(A) = {fmt(result.trace)}, &nbsp;
                det(A) = {fmt(result.det)}, &nbsp;
                判别式 Δ = {fmt(result.discriminant)}
              </p>
            </div>
            <div className="action-row" style={{ marginTop: 16 }}>
              <button
                className="secondary-btn"
                onClick={() => handleCopy(result.latex, 'LaTeX')}
              >
                复制 LaTeX
              </button>
            </div>
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', color: '#4a5568', fontSize: 13 }}>
                查看 LaTeX 代码
              </summary>
              <pre className="latex-code" style={{ marginTop: 8 }}>
                {result.latex}
              </pre>
            </details>
          </div>
        )}

        {result.type === 'info' && (
          <div className="info-box">
            <strong>ℹ️ 提示</strong>
            <p>{result.message}</p>
          </div>
        )}
      </section>
    )
  }

  const currentTab = OP_TABS.find(t => t.id === activeTab)
  const needsB = currentTab?.requiresB

  return (
    <div className="matrix-operations-workbench">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>矩阵运算工作台</h2>
        <p className="tool-description">
          支持有理数/浮点输入（分数 a/b）；加减、乘法、数乘、转置；行列式（LU 分解）、
          逆矩阵（条件数估算）、2×2 特征值解析解；2×2/3×3 高斯消元逐步展示；
          奇异性与病态矩阵警告。
        </p>
      </section>

      <section className="tool-section">
        <h3>示例矩阵</h3>
        <div className="examples-row">
          {EXAMPLES.map((example) => (
            <button
              key={example.id}
              className="example-btn"
              onClick={() => handleLoadExample(example)}
              title={example.description}
            >
              <span className="example-name">{example.name}</span>
              <span className="example-desc">{example.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="tool-section">
        <h3>输入矩阵</h3>

        <div className="input-grid">
          <div className="input-group">
            <label>矩阵 A</label>
            <textarea
              className="matrix-textarea"
              value={inputA}
              onChange={(e) => {
                setInputA(e.target.value)
                setResult(null)
                setError(null)
              }}
              placeholder={
                '粘贴 JSON 或嵌套数组，例如：\n' +
                '[[1, 2, 3],\n' +
                ' [4, 5, 6],\n' +
                ' [7, 8, 9]]\n\n' +
                '支持分数：["1/2", "1/3"]'
              }
              spellCheck={false}
            />
            {matrixAParsed && (
              <div style={{ fontSize: 12, color: '#48bb78' }}>
                ✓ 解析成功：{matrixAParsed.length}×{matrixAParsed[0].length} 矩阵
                {isSquare(matrixAParsed) ? '（方阵）' : '（非方阵）'}
              </div>
            )}
            <p className="input-hint">
              格式：<code>[[a,b],[c,d]]</code>，支持分数 <code>"1/2"</code>
            </p>
          </div>

          {needsB && (
            <div className="input-group">
              <label>矩阵 B <span style={{ fontWeight: 'normal', color: '#a0aec0' }}>（二元运算需要）</span></label>
              <textarea
                className="matrix-textarea"
                value={inputB}
                onChange={(e) => {
                  setInputB(e.target.value)
                  setResult(null)
                  setError(null)
                }}
                placeholder={
                  '二元运算（加减乘）需要输入矩阵 B\n\n' +
                  '例如：\n[[1, 0], [0, 1]]'
                }
                spellCheck={false}
              />
              {matrixBParsed && (
                <div style={{ fontSize: 12, color: '#48bb78' }}>
                  ✓ 解析成功：{matrixBParsed.length}×{matrixBParsed[0].length} 矩阵
                </div>
              )}
              <p className="input-hint">
                消元步骤请在下方输入向量 b，而非此处
              </p>
            </div>
          )}
        </div>

        {activeTab === 'basic' && (
          <div className="input-grid" style={{ marginTop: 16 }}>
            <div className="input-group" style={{ maxWidth: 300 }}>
              <label>标量 k <span style={{ fontWeight: 'normal', color: '#a0aec0' }}>（数乘需要）</span></label>
              <input
                className="scalar-input"
                type="text"
                value={inputScalar}
                onChange={(e) => {
                  setInputScalar(e.target.value)
                  setResult(null)
                }}
                placeholder="例如：2 或 3/4"
              />
            </div>
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="input-grid" style={{ marginTop: 16 }}>
            <div className="input-group" style={{ maxWidth: 300 }}>
              <label>右端向量 b</label>
              <input
                className="vector-input"
                type="text"
                value={inputVectorB}
                onChange={(e) => {
                  setInputVectorB(e.target.value)
                  setResult(null)
                  setError(null)
                }}
                placeholder="例如：[1, 0, 0] 或 [1/2, 1/3, 1/4]"
              />
              {vectorBParsed && (
                <div style={{ fontSize: 12, color: '#48bb78' }}>
                  ✓ 解析成功：{vectorBParsed.length} 维向量
                </div>
              )}
              <p className="input-hint">
                用于 Ax = b 消元求解
              </p>
            </div>
          </div>
        )}

        <div className="op-tabs" style={{ marginTop: 24 }}>
          {OP_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`op-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id)
                setResult(null)
                setError(null)
                setWarnings([])
              }}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {activeTab === 'basic' && (
          <div className="operations-row">
            {BASIC_OPS.map((op) => {
              const needsBForOp = ['add', 'subtract', 'multiply'].includes(op.id)
              const needsScalar = op.id === 'scalar'
              const disabled = !inputA.trim() ||
                (needsBForOp && !inputB.trim()) ||
                (needsScalar && !inputScalar.trim())
              return (
                <button
                  key={op.id}
                  className={`op-btn ${disabled ? '' : 'primary'}`}
                  onClick={() => runBasicOp(op.id)}
                  disabled={disabled}
                  title={op.desc}
                >
                  {op.name}
                </button>
              )
            })}
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="operations-row">
            {ADVANCED_OPS.map((op) => (
              <button
                key={op.id}
                className="op-btn primary"
                onClick={() => runAdvancedOp(op.id)}
                disabled={!inputA.trim()}
                title={op.desc}
              >
                {op.name}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="operations-row">
            <button
              className="op-btn primary"
              onClick={runElimination}
              disabled={!inputA.trim() || !inputVectorB.trim()}
            >
              执行高斯消元（2×2/3×3 分步展示）
            </button>
          </div>
        )}

        {activeTab === 'eigen' && (
          <div className="operations-row">
            <button
              className="op-btn primary"
              onClick={runEigenvalues}
              disabled={!inputA.trim()}
            >
              计算 2×2 特征值（解析解）
            </button>
          </div>
        )}

        <div className="action-row">
          <button
            className="secondary-btn"
            onClick={handleClear}
            disabled={!inputA && !inputB && !inputScalar && !inputVectorB && !result && !error}
          >
            清除所有
          </button>
        </div>
      </section>

      {error && (
        <section className="tool-section">
          <div className="error-box">
            <strong>❌ 运算失败</strong>
            <p>{error}</p>
          </div>
        </section>
      )}

      {renderResult()}

      {!result && !error && inputA.trim() && (
        <section className="tool-section">
          <div className="empty-state">
            <div className="empty-icon">🧮</div>
            <h3>准备就绪</h3>
            <p>点击上方运算按钮执行计算</p>
          </div>
        </section>
      )}

      {!result && !error && !inputA.trim() && (
        <section className="tool-section">
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>等待输入</h3>
            <p>粘贴矩阵 JSON 或点击上方示例按钮开始使用</p>
          </div>
        </section>
      )}

      <section className="tool-section">
        <h3>说明</h3>
        <ul style={{ fontSize: 13, lineHeight: 1.7, color: '#4a5568' }}>
          <li>
            <strong>输入格式：</strong>支持 JSON 数组 <code>[[1,2],[3,4]]</code> 或 JS 字面量；
            分数用引号包裹 <code>"1/2"</code>。
          </li>
          <li>
            <strong>基本运算：</strong>加减要求同维度；乘法要求 A 的列数等于 B 的行数；
            维度不匹配会给出精确报错。
          </li>
          <li>
            <strong>行列式/逆矩阵：</strong>使用 LU 分解带部分主元，仅支持 n ≤ 8 阶方阵；
            奇异矩阵会给出警告，不可逆会报错。
          </li>
          <li>
            <strong>条件数：</strong>使用无穷范数估计 cond(A) = ‖A‖·‖A⁻¹‖；
            超过 10¹⁰ 标记为病态矩阵。
          </li>
          <li>
            <strong>高斯消元：</strong>仅支持 2×2 和 3×3 矩阵，逐步展示行变换操作和增广矩阵。
          </li>
          <li>
            <strong>特征值：</strong>仅支持 2×2 矩阵解析解；更大矩阵需数值方法（如 QR 迭代）。
          </li>
          <li>
            <strong>LaTeX 输出：</strong>结果可复制为 LaTeX pmatrix 格式草稿。
          </li>
        </ul>
      </section>
    </div>
  )
}
