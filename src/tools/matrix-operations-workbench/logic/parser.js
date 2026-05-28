/**
 * 解析用户输入为数值矩阵
 * 支持格式：JSON 嵌套数组、直接嵌套数组字面量、分数 a/b 形式
 */

/**
 * 解析单个元素为浮点数
 * 支持：整数、小数、分数 "a/b"
 * @param {string|number} elem - 输入元素
 * @returns {number} 解析后的数值
 * @throws {Error} 解析失败时抛出
 */
function parseElement(elem) {
  if (typeof elem === 'number') {
    if (Number.isFinite(elem)) return elem
    throw new Error(`无效数值：${elem}`)
  }
  if (typeof elem === 'string') {
    const trimmed = elem.trim()
    if (trimmed === '') throw new Error('空元素')
    const fracMatch = trimmed.match(/^(-?\d+)\s*\/\s*(-?\d+)$/)
    if (fracMatch) {
      const numerator = parseInt(fracMatch[1], 10)
      const denominator = parseInt(fracMatch[2], 10)
      if (denominator === 0) throw new Error('分母不能为零')
      return numerator / denominator
    }
    const num = parseFloat(trimmed)
    if (Number.isFinite(num)) return num
    throw new Error(`无法解析元素："${elem}"`)
  }
  throw new Error(`不支持的元素类型：${typeof elem}`)
}

/**
 * 解析字符串为矩阵（二维数值数组）
 * 支持 JSON 数组或 JS 风格数组字面量
 * @param {string} input - 输入字符串
 * @returns {number[][]} 解析后的矩阵
 * @throws {Error} 解析失败时抛出，包含行列信息
 */
function parseMatrix(input) {
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
      throw new Error('无法解析输入，请检查 JSON 或数组格式')
    }
  }

  if (!Array.isArray(parsed)) throw new Error('输入必须为二维数组')
  if (parsed.length === 0) throw new Error('矩阵不能为空')
  if (!Array.isArray(parsed[0])) throw new Error('输入必须为二维数组')

  const rows = parsed.length
  const cols = parsed[0].length
  if (cols === 0) throw new Error('矩阵列数不能为零')

  const result = []
  for (let i = 0; i < rows; i++) {
    if (!Array.isArray(parsed[i])) throw new Error(`第 ${i + 1} 行不是数组`)
    if (parsed[i].length !== cols) throw new Error(`第 ${i + 1} 行列数不匹配：期望 ${cols} 列，实际 ${parsed[i].length} 列`)
    const row = []
    for (let j = 0; j < cols; j++) {
      try {
        row.push(parseElement(parsed[i][j]))
      } catch (err) {
        throw new Error(`第 ${i + 1} 行第 ${j + 1} 列：${err.message}`)
      }
    }
    result.push(row)
  }
  return result
}

/**
 * 解析两个矩阵，用于二元运算
 * @param {string} inputA - 矩阵 A 输入
 * @param {string} inputB - 矩阵 B 输入
 * @returns {{A: number[][], B: number[][]}} 两个解析后的矩阵
 */
function parseTwoMatrices(inputA, inputB) {
  const A = parseMatrix(inputA)
  const B = parseMatrix(inputB)
  return { A, B }
}

/**
 * 解析单个数值（用于数乘）
 * @param {string} input - 输入字符串
 * @returns {number} 解析后的数值
 */
function parseScalar(input) {
  if (typeof input === 'number') {
    if (Number.isFinite(input)) return input
    throw new Error('无效标量值')
  }
  const trimmed = String(input).trim()
  if (trimmed === '') throw new Error('标量不能为空')
  const fracMatch = trimmed.match(/^(-?\d+)\s*\/\s*(-?\d+)$/)
  if (fracMatch) {
    const numerator = parseInt(fracMatch[1], 10)
    const denominator = parseInt(fracMatch[2], 10)
    if (denominator === 0) throw new Error('分母不能为零')
    return numerator / denominator
  }
  const num = parseFloat(trimmed)
  if (!Number.isFinite(num)) throw new Error(`无法解析标量："${input}"`)
  return num
}

/**
 * 获取矩阵维度
 * @param {number[][]} mat - 矩阵
 * @returns {{rows: number, cols: number}} 行列数
 */
function dimensions(mat) {
  return { rows: mat.length, cols: mat[0].length }
}

/**
 * 深拷贝矩阵
 * @param {number[][]} mat - 矩阵
 * @returns {number[][]} 拷贝后的矩阵
 */
function cloneMatrix(mat) {
  return mat.map(row => [...row])
}

export { parseElement, parseMatrix, parseTwoMatrices, parseScalar, dimensions, cloneMatrix }
