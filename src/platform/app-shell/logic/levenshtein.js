function levenshteinDistance(a, b) {
  if (!a || !b) return a?.length || 0 + b?.length || 0
  if (a === b) return 0

  const m = a.length
  const n = b.length

  if (m === 0) return n
  if (n === 0) return m

  const matrix = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) matrix[i][0] = i
  for (let j = 0; j <= n; j++) matrix[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[m][n]
}

function getSimilarity(a, b) {
  if (!a && !b) return 1
  if (!a || !b) return 0
  if (a === b) return 1

  const distance = levenshteinDistance(a, b)
  const maxLen = Math.max(a.length, b.length)
  return 1 - distance / maxLen
}

function findSuggestions(targetId, availableIds, options = {}) {
  const { maxSuggestions = 5, minSimilarity = 0.3, usePrefix = true } = options

  if (!targetId || !availableIds || availableIds.length === 0) {
    return []
  }

  const lowerTarget = targetId.toLowerCase()

  const scored = availableIds
    .map((id) => {
      const lowerId = id.toLowerCase()

      let score = getSimilarity(lowerTarget, lowerId)

      if (usePrefix && lowerId.startsWith(lowerTarget)) {
        score = Math.max(score, 0.8 + Math.min(lowerTarget.length / lowerId.length, 0.2))
      }

      if (lowerId.includes(lowerTarget)) {
        score = Math.max(score, 0.7 + Math.min(lowerTarget.length / lowerId.length, 0.3))
      }

      return { id, score }
    })
    .filter((item) => item.score >= minSimilarity)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, maxSuggestions).map((item) => ({
    id: item.id,
    similarity: Math.round(item.score * 100) / 100,
  }))
}

function prefixMatch(targetId, availableIds) {
  if (!targetId || !availableIds) return []

  const lower = targetId.toLowerCase()
  return availableIds
    .filter((id) => id.toLowerCase().startsWith(lower))
    .sort((a, b) => a.localeCompare(b))
}

export {
  levenshteinDistance,
  getSimilarity,
  findSuggestions,
  prefixMatch,
}
