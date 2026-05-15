import {
    ASCII_FOLDING_MAP,
    CONTINUITY_BONUS,
    DEFAULT_LIMIT,
    ERROR_CODES,
    MAX_EDIT_DISTANCE,
    MAX_INDEX_ENTRIES,
    NGRAM_SIZE,
    PREFIX_BONUS,
    STOPWORDS_DEFAULT,
} from './constants.js'
import {
    createError,
} from './errors.js'

/**
 * 计算两个字符串之间的 Levenshtein 编辑距离
 * @param {string} a - 第一个字符串
 * @param {string} b - 第二个字符串
 * @param {number} maxDistance - 最大允许距离（超过则提前终止优化）
 * @returns {number} 编辑距离值
 */
function levenshteinDistance(a, b, maxDistance = MAX_EDIT_DISTANCE) {
  if (!a || !b) return a?.length || 0 + b?.length || 0
  if (a === b) return 0

  const m = a.length
  const n = b.length

  if (m === 0) return n
  if (n === 0) return m
  if (Math.abs(m - n) > maxDistance) return maxDistance + 1

  let prevRow = Array(n + 1).fill(0)
  let currRow = Array(n + 1).fill(0)

  for (let j = 0; j <= n; j++) prevRow[j] = j

  for (let i = 1; i <= m; i++) {
    currRow[0] = i
    let minInRow = i

    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      currRow[j] = Math.min(
        prevRow[j] + 1,
        currRow[j - 1] + 1,
        prevRow[j - 1] + cost
      )
      minInRow = Math.min(minInRow, currRow[j])
    }

    if (minInRow > maxDistance) return maxDistance + 1
    ;[prevRow, currRow] = [currRow, prevRow]
  }

  return prevRow[n]
}

/**
 * 使用 Bitap 算法进行模糊匹配评分
 * @param {string} text - 待搜索文本
 * @param {string} pattern - 搜索模式（关键词）
 * @param {number} maxDistance - 最大允许编辑距离
 * @returns {number} 匹配分数 (0-1，越高匹配度越好)
 */
function bitapScore(text, pattern, maxDistance = MAX_EDIT_DISTANCE) {
  if (!pattern) return 1
  if (!text) return 0

  const m = pattern.length
  const n = text.length

  if (m > n) {
    const distance = levenshteinDistance(pattern, text, maxDistance)
    return distance <= maxDistance ? 1 - distance / m : 0
  }

  let mask = new Array(256).fill(0)
  for (let i = 0; i < m; i++) {
    const charCode = pattern.charCodeAt(i) & 0xff
    mask[charCode] |= 1 << (m - 1 - i)
  }

  let dp = new Array(maxDistance + 1).fill(0)
  for (let k = 0; k <= maxDistance; k++) {
    dp[k] = ~(1 << k)
  }

  let bestMatchPos = -1
  let minErrors = maxDistance + 1

  for (let i = 0; i < n; i++) {
    const charCode = text.charCodeAt(i) & 0xff
    let old = 0
    let old2 = 0

    for (let k = 0; k <= maxDistance; k++) {
      const temp = dp[k]
      dp[k] = (dp[k] & mask[charCode]) << 1
      const temp2 = dp[k]
      dp[k] = dp[k] | old | ~((old & mask[charCode]) << 1)
      dp[k] = dp[k] | (old2 & ((old2 & mask[charCode]) << 1))
      old = temp
      old2 = temp2
    }

    for (let k = 0; k <= maxDistance; k++) {
      if ((dp[k] & (1 << (m - 1))) === 0) {
        if (k < minErrors) {
          minErrors = k
          bestMatchPos = i - m + 1
        }
      }
    }
  }

  if (bestMatchPos >= 0) {
    return 1 - minErrors / m
  }

  return 0
}

/**
 * 字符 ASCII 近似折叠（如 o/0 互相转换）
 * @param {string} char - 输入字符
 * @param {boolean} enableAsciiFolding - 是否启用近似折叠
 * @returns {string[]} 所有可能的字符变体
 */
function foldAscii(char, enableAsciiFolding = false) {
  if (!enableAsciiFolding) return [char]
  const variants = ASCII_FOLDING_MAP[char]
  return variants ? [char, ...variants] : [char]
}

/**
 * 标准化文本（大小写转换、去前后空格
 * @param {string} text - 待标准化文本
 * @param {Object} options - 配置选项
 * @param {boolean} options.caseFold - 是否折叠大小写
 * @returns {string} 标准化后的文本
 */
function normalizeText(text, options = {}) {
  let result = text || ''
  if (options.caseFold !== false) {
    result = result.toLowerCase()
  }
  return result.trim()
}

/**
 * 生成 n-gram 分词数组
 * @param {string} text - 输入文本
 * @param {number} n - n-gram 的 n 值（默认为 2
 * @returns {string[]} n-gram 数组
 */
function generateNgrams(text, n = NGRAM_SIZE) {
  const ngrams = []
  const len = text.length

  if (len < n) {
    if (len > 0) ngrams.push(text)
    return ngrams
  }

  for (let i = 0; i <= len - n; i++) {
    ngrams.push(text.slice(i, i + n))
  }

  return ngrams
}

/**
 * 对文本进行分词处理
 * @param {string} text - 输入文本
 * @param {Object} options - 配置选项
 * @param {boolean} options.removeStopwords - 是否移除停用词
 * @param {string[]} options.stopwords - 自定义停用词表
 * @param {number} options.minTokenLength - 最小词长
 * @returns {string[]} 分词结果数组
 */
function tokenize(text, options = {}) {
  const normalized = normalizeText(text, options)
  const tokens = normalized.split(/[\s,.:;!?(){}[\]<>"'\\/]+/)
  const stopwords = options.stopwords || STOPWORDS_DEFAULT
  const stopwordSet = new Set(stopwords.map(w => w.toLowerCase()))

  return tokens.filter((token) => {
    if (!token) return false
    if (options.removeStopwords && stopwordSet.has(token.toLowerCase())) return false
    return token.length >= (options.minTokenLength || 1)
  })
}

/**
 * 合并重叠或相邻的高亮范围
 * @param {Array<{start: number, end: number}>} ranges - 范围数组
 * @returns {Array<{start: number, end: number}>} 合并后的范围数组
 */
function mergeRanges(ranges) {
  if (!ranges || ranges.length === 0) return []

  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const merged = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    const current = sorted[i]

    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end)
    } else {
      merged.push(current)
    }
  }

  return merged
}

/**
 * 查找查询词在文本中的所有精确匹配位置
 * @param {string} text - 待搜索文本
 * @param {string} query - 查询词
 * @param {Object} options - 配置选项
 * @returns {Array<{start: number, end: number}>} 匹配位置数组
 */
function findMatchRanges(text, query, options = {}) {
  const ranges = []
  const normalizedText = normalizeText(text, options)
  const normalizedQuery = normalizeText(query, options)

  if (!normalizedQuery || !normalizedText) return ranges

  const queryLen = normalizedQuery.length
  let pos = normalizedText.indexOf(normalizedQuery)

  while (pos !== -1) {
    ranges.push({ start: pos, end: pos + queryLen })
    pos = normalizedText.indexOf(normalizedQuery, pos + 1)
  }

  return ranges
}

/**
 * 计算模糊匹配分数和高亮范围
 * @param {string|Object} item - 待匹配项（字符串或包含 text 格式对象）
 * @param {string} query - 查询词
 * @param {Object} options - 配置选项
 * @param {number} options.maxEditDistance - 最大编辑距离
 * @param {boolean} options.prefixBonus - 是否启用前缀加权
 * @param {boolean} options.continuityBonus - 是否启用连续子串奖励
 * @returns {{score: number, ranges: Array<{start: number, end: number}>} 分数和高亮范围
 */
function calculateFuzzyScore(item, query, options = {}) {
  const {
    maxEditDistance = MAX_EDIT_DISTANCE,
    prefixBonus: enablePrefixBonus = true,
    continuityBonus: enableContinuityBonus = true,
    caseFold = true,
    asciiFolding = false,
  } = options

  const searchText = typeof item === 'string' ? item : item.text || item.id || ''
  const normalizedText = normalizeText(searchText, { caseFold })
  const normalizedQuery = normalizeText(query, { caseFold })

  if (!normalizedQuery) return { score: 1, ranges: [] }
  if (!normalizedText) return { score: 0, ranges: [] }

  if (normalizedText === normalizedQuery) {
    return {
      score: 1,
      ranges: [{ start: 0, end: normalizedText.length }],
    }
  }

  let score = 0
  let ranges = []

  const exactRanges = findMatchRanges(normalizedText, normalizedQuery, { caseFold })
  if (exactRanges.length > 0) {
    const coverage = exactRanges.reduce((sum, r) => sum + (r.end - r.start), 0) / normalizedText.length
    score = Math.max(score, 0.7 + coverage * 0.3)
    ranges = exactRanges
  }

  const distance = levenshteinDistance(normalizedQuery, normalizedText, maxEditDistance)
  if (distance <= maxEditDistance) {
    const normalizedDistance = 1 - (distance / Math.max(normalizedQuery.length, normalizedText.length))
    score = Math.max(score, normalizedDistance * 0.6)
  }

  const bitapResult = bitapScore(normalizedText, normalizedQuery, maxEditDistance)
  if (bitapResult > 0) {
    score = Math.max(score, bitapResult * 0.7)
  }

  if (enablePrefixBonus && normalizedText.startsWith(normalizedQuery)) {
    score = Math.max(score, 0.8 + (normalizedQuery.length / normalizedText.length) * 0.1)
    ranges = mergeRanges([...ranges, { start: 0, end: normalizedQuery.length }])
  }

  const index = normalizedText.indexOf(normalizedQuery)
  if (enableContinuityBonus && index > 0) {
    const continuityScore = 0.7 + (normalizedQuery.length / normalizedText.length) * 0.2
    score = Math.max(score, continuityScore)
    ranges = mergeRanges([...ranges, { start: index, end: index + normalizedQuery.length }])
  }

  const queryNgrams = generateNgrams(normalizedQuery)
  const textNgrams = generateNgrams(normalizedText)
  const textNgramSet = new Set(textNgrams)

  let matchCount = 0
  for (const ngram of queryNgrams) {
    if (textNgramSet.has(ngram)) {
      matchCount++
      const pos = normalizedText.indexOf(ngram)
      if (pos !== -1) {
        ranges.push({ start: pos, end: pos + ngram.length })
      }
    }
  }

  if (queryNgrams.length > 0) {
    const ngramScore = matchCount / queryNgrams.length
    score = Math.max(score, ngramScore * 0.4)
  }

  return {
    score: Math.min(1, score),
    ranges: mergeRanges(ranges),
  }
}

/**
 * 构建模糊搜索索引
 * @param {Array<string|Object>} corpus - 语料库（字符串数组或带 id/text/tags 的对象数组）
 * @param {Object} options - 配置选项
 * @param {number} options.maxIndexEntries - 最大索引条目数
 * @returns {Object} 构建好的索引对象
 * @throws {FuzzySearchError} 当语料库过大时抛出错误
 */
function buildFuzzyIndex(corpus, options = {}) {
  const {
    maxIndexEntries = MAX_INDEX_ENTRIES,
    tokenize: tokenizeFn = tokenize,
  } = options

  if (corpus.length > maxIndexEntries) {
    throw createError(ERROR_CODES.INDEX_TOO_LARGE)
  }

  const items = corpus.map((item, index) => {
    const id = typeof item === 'string' ? String(index) : item.id
    const text = typeof item === 'string' ? item : item.text || item.id || ''
    const tags = typeof item === 'string' ? [] : (item.tags || [])

    const searchableText = [text, ...tags].join(' ')
    const tokens = tokenizeFn(searchableText, options)
    const ngrams = new Set(tokens.flatMap((t) => generateNgrams(t)))

    return {
      id,
      original: item,
      text,
      tags,
      tokens,
      ngrams,
      normalizedText: normalizeText(searchableText, options),
    }
  })

  const ngramIndex = new Map()
  items.forEach((item, idx) => {
    for (const ngram of item.ngrams) {
      if (!ngramIndex.has(ngram)) {
        ngramIndex.set(ngram, new Set())
      }
      ngramIndex.get(ngram).add(idx)
    }
  })

  return {
    items,
    ngramIndex,
    options: {
      ...options,
      maxIndexEntries,
    },
    meta: {
      totalItems: items.length,
      totalNgrams: ngramIndex.size,
      builtAt: Date.now(),
    },
  }
}

/**
 * 在索引上执行模糊搜索
 * @param {Object} index - 由 buildFuzzyIndex 构建的索引
 * @param {string} query - 查询词
 * @param {Object} options - 配置选项
 * @param {number} options.limit - 返回结果数限制
 * @param {boolean} options.onlyFilter - 是否仅过滤不计算高亮（性能优化）
 * @returns {Array<Object>} 搜索结果数组，每项包含 id、original、text、tags、score、highlightRanges 等
 */
function searchFuzzy(index, query, options = {}) {
  const {
    limit = DEFAULT_LIMIT,
    onlyFilter = false,
    caseFold = true,
    asciiFolding = false,
    maxEditDistance = MAX_EDIT_DISTANCE,
    prefixBonus = PREFIX_BONUS,
    continuityBonus = CONTINUITY_BONUS,
  } = options

  const normalizedQuery = normalizeText(query, { caseFold })

  if (!normalizedQuery || normalizedQuery.trim() === '') {
    return index.items
      .map((item) => ({
        id: item.id,
        original: item.original,
        text: item.text,
        tags: item.tags,
        score: 1,
        highlightRanges: [],
      }))
      .slice(0, limit)
  }

  const queryNgrams = generateNgrams(normalizedQuery)
  const candidateIndices = new Set()

  for (const ngram of queryNgrams) {
    const indices = index.ngramIndex.get(ngram)
    if (indices) {
      indices.forEach((i) => candidateIndices.add(i))
    }
  }

  if (candidateIndices.size === 0) {
    index.items.forEach((_, i) => candidateIndices.add(i))
  }

  const scoredResults = []

  for (const idx of candidateIndices) {
    const item = index.items[idx]
    const { score, ranges } = calculateFuzzyScore(item.text, query, {
      maxEditDistance,
      prefixBonus,
      continuityBonus,
      caseFold,
      asciiFolding,
    })

    let tagsScore = 0
    let tagRanges = []
    for (const tag of item.tags) {
      const tagResult = calculateFuzzyScore(tag, query, {
        maxEditDistance,
        caseFold,
        asciiFolding,
      })
      if (tagResult.score > tagsScore) {
        tagsScore = tagResult.score
        tagRanges = tagResult.ranges
      }
    }

    const finalScore = Math.max(score, tagsScore)

    if (finalScore > 0.1) {
      scoredResults.push({
        id: item.id,
        original: item.original,
        text: item.text,
        tags: item.tags,
        score: finalScore,
        highlightRanges: onlyFilter ? [] : ranges,
        tagHighlightRanges: onlyFilter ? [] : tagRanges,
      })
    }
  }

  scoredResults.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.001) {
      return b.score - a.score
    }
    return a.text.localeCompare(b.text)
  })

  return scoredResults.slice(0, limit)
}

export {
    bitapScore, buildFuzzyIndex, calculateFuzzyScore, findMatchRanges, generateNgrams, levenshteinDistance, mergeRanges, normalizeText, searchFuzzy, tokenize
}

