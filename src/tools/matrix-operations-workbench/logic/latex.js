/**
 * 矩阵 LaTeX 格式转换
 * 支持 pmatrix 环境，可选择是否包含分数 a/b 形式
 */

/**
 * 格式化单个数值为 LaTeX 字符串
 * 优先尝试分数表示，否则使用小数
 * @param {number} x - 数值
 * @param {boolean} [preferFraction=true] - 是否优先使用分数
 * @returns {string} LaTeX 字符串
 */
function formatNumber(x, preferFraction = true) {
  if (Math.abs(x) < 1e-10) return '0'

  if (preferFraction) {
    const frac = toFraction(x)
    if (frac) {
      if (frac.denominator === 1) {
        return frac.numerator >= 0 ? String(frac.numerator) : String(frac.numerator)
      }
      if (frac.numerator < 0) {
        return `-\\frac{${Math.abs(frac.numerator)}}{${frac.denominator}}`
      }
      return `\\frac{${frac.numerator}}{${frac.denominator}}`
    }
  }

  if (Math.abs(x) >= 10000 || (Math.abs(x) < 0.001 && x !== 0)) {
    return x.toExponential(4).replace('e', ' \\times 10^{').replace('+', '') + '}'
  }

  return Number(x.toPrecision(6)).toString()
}

/**
 * 尝试将浮点数转换为分数
 * 使用连分数方法，精度 1e-6
 * @param {number} x - 浮点数
 * @returns {{numerator: number, denominator: number}|null} 分数表示或 null
 */
function toFraction(x) {
  if (Math.abs(x - Math.round(x)) < 1e-10) {
    return { numerator: Math.round(x), denominator: 1 }
  }

  const sign = x < 0 ? -1 : 1
  let n = Math.abs(x)

  let a0 = Math.floor(n)
  let p0 = a0, q0 = 1
  let p1 = 1, q1 = 0
  let p = p0, q = q0

  n = n - a0
  if (n < 1e-12) {
    return { numerator: sign * a0, denominator: 1 }
  }

  for (let i = 0; i < 20; i++) {
    n = 1 / n
    const a = Math.floor(n)
    const pNext = a * p0 + p1
    const qNext = a * q0 + q1
    p1 = p0
    q1 = q0
    p0 = pNext
    q0 = qNext
    n = n - a

    const approx = pNext / qNext
    if (Math.abs(approx - Math.abs(x)) < 1e-6) {
      p = pNext
      q = qNext
      break
    }
    p = pNext
    q = qNext
  }

  if (q > 1000) return null
  return { numerator: sign * p, denominator: q }
}

/**
 * 将矩阵转换为 LaTeX pmatrix 环境
 * @param {number[][]} mat - 矩阵
 * @param {boolean} [preferFraction=true] - 是否优先使用分数
 * @returns {string} LaTeX 字符串
 */
function matrixToLatex(mat, preferFraction = true) {
  if (!mat || mat.length === 0) return ''
  const rows = mat.map(row =>
    row.map(elem => formatNumber(elem, preferFraction)).join(' & ')
  )
  return `\\begin{pmatrix}\n${rows.join(' \\\\\n')}\n\\end{pmatrix}`
}

/**
 * 将向量转换为 LaTeX pmatrix 环境（列向量）
 * @param {number[]} vec - 向量
 * @param {boolean} [preferFraction=true] - 是否优先使用分数
 * @returns {string} LaTeX 字符串
 */
function vectorToLatex(vec, preferFraction = true) {
  if (!vec || vec.length === 0) return ''
  const rows = vec.map(elem => formatNumber(elem, preferFraction))
  return `\\begin{pmatrix}\n${rows.join(' \\\\\n')}\n\\end{pmatrix}`
}

/**
 * 生成运算的完整 LaTeX 草稿
 * 例如：A + B = C 的 LaTeX 表示
 * @param {number[][]} A - 左矩阵
 * @param {string} op - 运算符：+, -, *, ^T, etc.
 * @param {number[][]} [B] - 右矩阵（可选，用于二元运算）
 * @param {number[][]} result - 结果矩阵
 * @returns {string} 完整 LaTeX 表达式
 */
function operationToLatex(A, op, B, result) {
  const latexA = matrixToLatex(A)
  const latexResult = matrixToLatex(result)

  if (op === '^T') {
    return `${latexA}^T = ${latexResult}`
  }

  if (op === 'det') {
    const formatted = formatNumber(result[0][0])
    return `\\det(${latexA}) = ${formatted}`
  }

  if (op === 'inv') {
    return `${latexA}^{-1} = ${latexResult}`
  }

  if (B) {
    const latexB = matrixToLatex(B)
    return `${latexA} ${op} ${latexB} = ${latexResult}`
  }

  if (typeof B === 'number') {
    const formatted = formatNumber(B)
    return `${formatted} \\cdot ${latexA} = ${latexResult}`
  }

  return `${latexA} ${op} = ${latexResult}`
}

export { formatNumber, toFraction, matrixToLatex, vectorToLatex, operationToLatex }
