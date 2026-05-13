import {
  SORT_STRATEGIES,
} from './constants.js'
import {
  calculateFuzzyScore,
  matchFuzzy,
} from './pinyin.js'

function searchTools(tools, query, options = {}) {
  if (!tools || tools.length === 0) {
    return {
      results: [],
      total: 0,
      query: query || '',
    }
  }

  if (!query || query.trim() === '') {
    return {
      results: tools,
      total: tools.length,
      query: '',
    }
  }

  const trimmedQuery = query.trim()
  const results = []

  for (const tool of tools) {
    const idScore = calculateFuzzyScore(tool.id, trimmedQuery)
    const titleScore = calculateFuzzyScore(tool.title, trimmedQuery)
    const summaryScore = calculateFuzzyScore(tool.summary || '', trimmedQuery)

    let tagsScore = 0
    if (tool.tags && tool.tags.length > 0) {
      tagsScore = Math.max(...tool.tags.map((tag) => calculateFuzzyScore(tag, trimmedQuery)))
    }

    const totalScore = Math.max(idScore, titleScore, summaryScore, tagsScore)

    if (totalScore > 0) {
      results.push({
        ...tool,
        score: totalScore,
        matches: {
          id: idScore > 0,
          title: titleScore > 0,
          summary: summaryScore > 0,
          tags: tagsScore > 0,
        },
      })
    }
  }

  results.sort((a, b) => b.score - a.score)

  return {
    results,
    total: results.length,
    query: trimmedQuery,
  }
}

function sortTools(tools, strategy, recentTools = []) {
  if (!tools || tools.length === 0) return []

  const recentSet = new Set(recentTools)

  return [...tools].sort((a, b) => {
    switch (strategy) {
      case SORT_STRATEGIES.ID:
        return a.id.localeCompare(b.id, undefined, { numeric: true })

      case SORT_STRATEGIES.TITLE:
        return a.title.localeCompare(b.title)

      case SORT_STRATEGIES.RECENT: {
        const aRecent = recentSet.has(a.id)
        const bRecent = recentSet.has(b.id)
        if (aRecent && !bRecent) return -1
        if (!aRecent && bRecent) return 1
        if (aRecent && bRecent) {
          return recentTools.indexOf(a.id) - recentTools.indexOf(b.id)
        }
        return a.id.localeCompare(b.id, undefined, { numeric: true })
      }

      case SORT_STRATEGIES.CATEGORY: {
        const categoryOrder = { '格式化': 0, '编码': 1, '加密': 2, '网络': 3, '其他': 4 }
        const aCategory = getToolCategory(a)
        const bCategory = getToolCategory(b)
        const aOrder = categoryOrder[aCategory] ?? 99
        const bOrder = categoryOrder[bCategory] ?? 99
        if (aOrder !== bOrder) return aOrder - bOrder
        return a.id.localeCompare(b.id, undefined, { numeric: true })
      }

      case SORT_STRATEGIES.TAG: {
        const aTags = (a.tags || []).join(',')
        const bTags = (b.tags || []).join(',')
        return aTags.localeCompare(bTags)
      }

      default:
        return a.id.localeCompare(b.id, undefined, { numeric: true })
    }
  })
}

function getToolCategory(tool) {
  if (!tool.tags) return '其他'

  const categoryMap = {
    格式化: ['格式化', 'JSON', 'XML', 'HTML', 'CSS', 'SQL', 'YAML'],
    编码: ['编码', 'Base64', '进制', 'URL', 'Punycode'],
    加密: ['加密', '哈希', '密码', 'JWT', 'PEM'],
    网络: ['网络', 'HTTP', 'WebSocket', 'Webhook', 'CIDR', 'IP'],
  }

  for (const [category, keywords] of Object.entries(categoryMap)) {
    for (const keyword of keywords) {
      if (tool.tags.some((tag) => tag.includes(keyword))) {
        return category
      }
    }
  }

  return '其他'
}

function highlightMatch(text, query) {
  if (!text || !query) {
    return { text, highlighted: false, parts: [{ text, matched: false }] }
  }

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerText.indexOf(lowerQuery)

  if (index === -1) {
    return { text, highlighted: false, parts: [{ text, matched: false }] }
  }

  const parts = []
  if (index > 0) {
    parts.push({ text: text.slice(0, index), matched: false })
  }
  parts.push({ text: text.slice(index, index + query.length), matched: true })
  if (index + query.length < text.length) {
    parts.push({ text: text.slice(index + query.length), matched: false })
  }

  return { text, highlighted: true, parts }
}

export {
  searchTools,
  sortTools,
  getToolCategory,
  highlightMatch,
}
